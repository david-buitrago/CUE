export type AudioChannel = 'YOU' | 'THEM';

export interface TranscriptInterim {
  meetingId: string;
  channel: AudioChannel;
  text: string;
  observedAt: string;
}
