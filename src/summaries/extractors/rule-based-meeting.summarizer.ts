import { Injectable } from '@nestjs/common';
import type { TranscriptSegment } from '../../transcripts/transcript-segment';
import type { MeetingSummarizer } from '../meeting-summarizer';

@Injectable()
export class RuleBasedMeetingSummarizer implements MeetingSummarizer {
  summarize(segments: TranscriptSegment[]): Promise<string> {
    if (segments.length === 0) {
      return Promise.resolve('No transcript segments are available yet.');
    }

    return Promise.resolve(
      segments
        .map((segment) => `${segment.speaker}: ${segment.text}`)
        .join(' '),
    );
  }
}
