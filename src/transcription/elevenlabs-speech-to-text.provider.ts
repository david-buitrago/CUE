import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket, { RawData } from 'ws';
import type {
  SpeechToTextProvider,
  SpeechToTextSession,
  SpeechToTextSessionInput,
} from './speech-to-text.provider';

const ELEVENLABS_REALTIME_URL =
  'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

@Injectable()
export class ElevenLabsSpeechToTextProvider implements SpeechToTextProvider {
  constructor(private readonly configService: ConfigService) {}

  async open(input: SpeechToTextSessionInput): Promise<SpeechToTextSession> {
    const socket = new WebSocket(this.createUrl(), {
      headers: {
        'xi-api-key':
          this.configService.getOrThrow<string>('ELEVENLABS_API_KEY'),
      },
    });

    socket.on('message', (data: RawData) => {
      this.handleMessage(data, input);
    });
    socket.on('error', () => {
      input.onError('ElevenLabs realtime transcription connection failed');
    });

    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });

    return {
      sendPcm: (audio: Uint8Array) => {
        this.sendAudioChunk(socket, audio, false);
      },
      commit: () => {
        this.sendAudioChunk(socket, new Uint8Array(), true);
      },
      close: () => {
        socket.close();
      },
    };
  }

  private createUrl(): string {
    const url = new URL(ELEVENLABS_REALTIME_URL);
    url.searchParams.set('model_id', 'scribe_v2_realtime');
    url.searchParams.set('audio_format', 'pcm_16000');
    url.searchParams.set('sample_rate', '16000');
    url.searchParams.set('language_code', 'en');
    url.searchParams.set('include_timestamps', 'true');

    return url.toString();
  }

  private sendAudioChunk(
    socket: WebSocket,
    audio: Uint8Array,
    commit: boolean,
  ): void {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error(
        'The ElevenLabs realtime transcription session is closed',
      );
    }

    socket.send(
      JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: Buffer.from(audio).toString('base64'),
        ...(commit ? { commit: true } : {}),
      }),
    );
  }

  private handleMessage(data: RawData, input: SpeechToTextSessionInput): void {
    const message = parseMessage(data);

    if (!message) {
      input.onError('ElevenLabs returned an invalid realtime STT message');
      return;
    }

    if (message.message_type === 'partial_transcript' && message.text) {
      input.onInterim(message.text);
      return;
    }

    if (
      (message.message_type === 'final_transcript' ||
        message.message_type === 'committed_transcript' ||
        message.message_type === 'committed_transcript_with_timestamps') &&
      message.text
    ) {
      input.onFinal(message.text);
      return;
    }

    if (
      message.message_type === 'error' ||
      message.message_type === 'rate_limited'
    ) {
      input.onError(
        message.error ?? 'ElevenLabs realtime STT returned an error',
      );
    }
  }
}

interface ElevenLabsRealtimeMessage {
  message_type?: string;
  text?: string;
  error?: string;
}

function parseMessage(data: RawData): ElevenLabsRealtimeMessage | undefined {
  try {
    const content = Buffer.isBuffer(data)
      ? data.toString('utf8')
      : Array.isArray(data)
        ? Buffer.concat(data).toString('utf8')
        : Buffer.from(data).toString('utf8');
    const parsed: unknown = JSON.parse(content);

    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}
