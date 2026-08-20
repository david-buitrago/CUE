import { Injectable } from '@nestjs/common';
import type {
  ActionItemExtractor,
  ExtractedActionItem,
} from '../action-item-extractor';
import type { TranscriptSegment } from '../../transcripts/transcript-segment';

@Injectable()
export class RuleBasedActionItemExtractor implements ActionItemExtractor {
  extract(segments: TranscriptSegment[]): Promise<ExtractedActionItem[]> {
    return Promise.resolve(
      segments.flatMap((segment) => {
        const match = /^(?:action|todo):\s*(.+)$/i.exec(segment.text.trim());
        const description = match?.[1]?.trim();

        return description
          ? [{ sourceSegmentId: segment.id, description }]
          : [];
      }),
    );
  }
}
