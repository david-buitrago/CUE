import type { AudioChannel } from './live-transcript';

export const SPEECH_TO_TEXT_PROVIDER = Symbol('SPEECH_TO_TEXT_PROVIDER');

export interface SpeechToTextSessionInput {
  meetingId: string;
  channel: AudioChannel;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}

export interface SpeechToTextSession {
  sendPcm(audio: Uint8Array): void;
  commit(): void;
  close(): void;
}

export interface SpeechToTextProvider {
  open(input: SpeechToTextSessionInput): Promise<SpeechToTextSession>;
}
