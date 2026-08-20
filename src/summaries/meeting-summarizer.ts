import type { TranscriptSegment } from '../transcripts/transcript-segment';

export const MEETING_SUMMARIZER = Symbol('MEETING_SUMMARIZER');

export interface MeetingSummarizer {
  summarize(segments: TranscriptSegment[]): Promise<string>;
}
