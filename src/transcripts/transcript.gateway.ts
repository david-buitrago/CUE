import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { TranscriptSegment } from './transcript-segment';
import type {
  AudioChannel,
  TranscriptInterim,
} from '../transcription/live-transcript';

@WebSocketGateway({
  namespace: 'live',
  cors: {
    origin: true,
  },
})
export class TranscriptGateway {
  @WebSocketServer()
  private server!: Namespace;

  @SubscribeMessage('transcript.subscribe')
  subscribeToMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody('meetingId') meetingId: string,
  ): void {
    void client.join(this.roomName(meetingId));
    client.emit('transcript.subscribed', { meetingId });
  }

  emitSegmentCreated(segment: TranscriptSegment): void {
    this.server
      .to(this.roomName(segment.meetingId))
      .emit('transcript.segment.created', segment);
  }

  emitTranscriptInterim(transcript: TranscriptInterim): void {
    this.server
      .to(this.roomName(transcript.meetingId))
      .emit('transcript.interim', transcript);
  }

  emitTranscriptError(event: {
    meetingId: string;
    channel: AudioChannel;
    message: string;
    observedAt: string;
  }): void {
    this.server
      .to(this.roomName(event.meetingId))
      .emit('transcript.error', event);
  }

  private roomName(meetingId: string): string {
    return `meeting:${meetingId}`;
  }
}
