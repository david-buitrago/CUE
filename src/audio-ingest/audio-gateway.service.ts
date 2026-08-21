import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { AudioChannel } from '../transcription/live-transcript';
import { RealtimeTranscriptionService } from '../transcription/realtime-transcription.service';
import {
  parseAudioControlMessage,
  parseAudioFrame,
  type AudioStartMessage,
} from './audio-protocol';

const AUDIO_PATH = '/audio';
const FINALIZATION_GRACE_PERIOD_MS = 1_000;

interface AudioConnection {
  meetingId: string;
  channels: Set<AudioChannel>;
  lastSequenceByChannel: Map<AudioChannel, number>;
}

@Injectable()
export class AudioGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AudioGatewayService.name);
  private readonly audioServer = new WebSocketServer({ noServer: true });
  private readonly connections = new Map<WebSocket, AudioConnection>();
  private readonly upgradeHandler = (
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) => this.handleUpgrade(request, socket, head);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    private readonly transcriptionService: RealtimeTranscriptionService,
  ) {}

  onModuleInit(): void {
    this.getHttpServer().on('upgrade', this.upgradeHandler);
    this.audioServer.on('connection', (socket) =>
      this.handleConnection(socket),
    );
  }

  onModuleDestroy(): void {
    this.getHttpServer().off('upgrade', this.upgradeHandler);
    this.audioServer.close();
  }

  private getHttpServer(): HttpServer {
    return this.httpAdapterHost.httpAdapter.getHttpServer() as HttpServer;
  }

  private handleUpgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ): void {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== AUDIO_PATH) {
      return;
    }

    if (!this.isAuthorized(request)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    this.audioServer.handleUpgrade(request, socket, head, (webSocket) => {
      this.audioServer.emit('connection', webSocket, request);
    });
  }

  private isAuthorized(request: IncomingMessage): boolean {
    const expectedToken = this.configService.get<string>(
      'CUE_AUDIO_SESSION_TOKEN',
    );
    const presentedToken = request.headers.authorization?.replace(
      /^Bearer /,
      '',
    );

    return (
      typeof expectedToken === 'string' &&
      expectedToken.length > 0 &&
      presentedToken === expectedToken
    );
  }

  private handleConnection(socket: WebSocket): void {
    socket.on('message', (data, isBinary) => {
      void this.handleMessage(socket, toBuffer(data), isBinary).catch(
        (error: unknown) => {
          this.closeWithError(
            socket,
            error instanceof Error ? error.message : 'Invalid audio message',
          );
        },
      );
    });
    socket.on('close', () => this.closeConnection(socket));
  }

  private async handleMessage(
    socket: WebSocket,
    data: Buffer,
    isBinary: boolean,
  ): Promise<void> {
    if (isBinary) {
      this.handleAudioFrame(socket, new Uint8Array(data));
      return;
    }

    const message = parseAudioControlMessage(data.toString('utf8'));

    if (message.type === 'start') {
      await this.startConnection(socket, message);
      return;
    }

    const connection = this.getConnection(socket);
    if (message.type === 'commit') {
      this.assertDeclaredChannel(connection, message.channel);
      this.transcriptionService.commit(connection.meetingId, message.channel);
      return;
    }

    this.stopConnection(socket);
  }

  private async startConnection(
    socket: WebSocket,
    message: AudioStartMessage,
  ): Promise<void> {
    if (this.connections.has(socket)) {
      throw new Error('Audio connection has already started');
    }

    const channels = new Set(message.streams.map((stream) => stream.channel));
    const openedChannels: AudioChannel[] = [];

    try {
      for (const channel of channels) {
        await this.transcriptionService.openSession(message.meetingId, channel);
        openedChannels.push(channel);
      }
    } catch (error) {
      for (const channel of openedChannels) {
        this.transcriptionService.closeSession(message.meetingId, channel);
      }
      throw error;
    }

    this.connections.set(socket, {
      meetingId: message.meetingId,
      channels,
      lastSequenceByChannel: new Map(),
    });
    socket.send(
      JSON.stringify({ type: 'started', meetingId: message.meetingId }),
    );
  }

  private handleAudioFrame(socket: WebSocket, data: Uint8Array): void {
    const connection = this.getConnection(socket);
    const frame = parseAudioFrame(data);
    this.assertDeclaredChannel(connection, frame.channel);

    const previousSequence = connection.lastSequenceByChannel.get(
      frame.channel,
    );
    if (
      previousSequence !== undefined &&
      frame.sequence !== previousSequence + 1
    ) {
      this.logger.warn(
        `Audio sequence gap for ${frame.channel} in meeting ${connection.meetingId}: expected ${previousSequence + 1}, received ${frame.sequence}`,
      );
    }

    connection.lastSequenceByChannel.set(frame.channel, frame.sequence);
    this.transcriptionService.sendAudio(
      connection.meetingId,
      frame.channel,
      frame.pcm,
    );
  }

  private stopConnection(socket: WebSocket): void {
    socket.close(1000, 'Audio stream stopped');
  }

  private closeWithError(socket: WebSocket, message: string): void {
    socket.send(JSON.stringify({ type: 'error', message }));
    socket.close(1008, message);
  }

  private closeConnection(socket: WebSocket): void {
    const connection = this.connections.get(socket);
    if (!connection) {
      return;
    }

    this.connections.delete(socket);
    for (const channel of connection.channels) {
      this.transcriptionService.commit(connection.meetingId, channel);
      setTimeout(() => {
        this.transcriptionService.closeSession(connection.meetingId, channel);
      }, FINALIZATION_GRACE_PERIOD_MS).unref();
    }
  }

  private getConnection(socket: WebSocket): AudioConnection {
    const connection = this.connections.get(socket);
    if (!connection) {
      throw new Error('Audio connection must start before it can send frames');
    }

    return connection;
  }

  private assertDeclaredChannel(
    connection: AudioConnection,
    channel: AudioChannel,
  ): void {
    if (!connection.channels.has(channel)) {
      throw new Error(`Audio channel ${channel} was not declared at start`);
    }
  }
}

function toBuffer(data: RawData): Buffer {
  if (Array.isArray(data)) {
    return Buffer.concat(data);
  }

  if (Buffer.isBuffer(data)) {
    return data;
  }

  return Buffer.from(data);
}
