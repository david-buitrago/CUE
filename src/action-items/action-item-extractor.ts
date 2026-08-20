import type { TranscriptSegment } from '../transcripts/transcript-segment';

export const ACTION_ITEM_EXTRACTOR = Symbol('ACTION_ITEM_EXTRACTOR');

export interface ExtractedActionItem {
  sourceSegmentId: string;
  description: string;
}

export interface ActionItemExtractor {
  extract(segments: TranscriptSegment[]): Promise<ExtractedActionItem[]>;
}
