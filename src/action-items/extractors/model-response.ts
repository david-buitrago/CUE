import { BadGatewayException } from '@nestjs/common';
import type { ExtractedActionItem } from '../action-item-extractor';

export function parseModelResponse(content: unknown): ExtractedActionItem[] {
  if (typeof content !== 'string') {
    throw new BadGatewayException(
      'The action-item provider returned an unexpected response',
    );
  }

  const normalizedContent = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedContent);
  } catch {
    throw new BadGatewayException(
      'The action-item provider did not return valid JSON',
    );
  }

  if (!Array.isArray(parsed)) {
    throw new BadGatewayException(
      'The action-item provider did not return an array',
    );
  }

  return parsed.map((item) => {
    if (!isExtractedActionItem(item)) {
      throw new BadGatewayException(
        'The action-item provider returned an invalid action item',
      );
    }

    return item;
  });
}

function isExtractedActionItem(value: unknown): value is ExtractedActionItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.sourceSegmentId === 'string' &&
    typeof item.description === 'string'
  );
}
