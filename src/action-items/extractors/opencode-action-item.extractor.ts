import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ActionItemExtractor,
  ExtractedActionItem,
} from '../action-item-extractor';
import type { TranscriptSegment } from '../../transcripts/transcript-segment';
import { buildActionItemPrompt } from './action-item-prompt';
import { parseModelResponse } from './model-response';

const OPENCODE_GO_URL = 'https://opencode.ai/zen/go/v1/chat/completions';

@Injectable()
export class OpenCodeActionItemExtractor implements ActionItemExtractor {
  constructor(private readonly configService: ConfigService) {}

  async extract(segments: TranscriptSegment[]): Promise<ExtractedActionItem[]> {
    const response = await this.requestExtraction(segments);
    const body: unknown = await response.json();

    if (!response.ok) {
      throw new BadGatewayException(
        'OpenCode Go could not extract the action items',
      );
    }

    return parseModelResponse(getOpenCodeContent(body));
  }

  private async requestExtraction(
    segments: TranscriptSegment[],
  ): Promise<Response> {
    try {
      return await fetch(OPENCODE_GO_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configService.getOrThrow<string>('OPENCODE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.configService.get<string>('OPENCODE_MODEL', 'glm-5.3'),
          messages: [
            {
              role: 'system',
              content:
                'You extract meeting action items and return valid JSON.',
            },
            { role: 'user', content: buildActionItemPrompt(segments) },
          ],
          temperature: 0,
        }),
      });
    } catch {
      throw new BadGatewayException(
        'OpenCode Go could not be reached for action-item extraction',
      );
    }
  }
}

function getOpenCodeContent(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const choices = (body as Record<string, unknown>).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }

  const firstChoice: unknown = choices[0];

  if (typeof firstChoice !== 'object' || firstChoice === null) {
    return undefined;
  }

  const message = (firstChoice as Record<string, unknown>).message;

  return typeof message === 'object' && message !== null
    ? (message as Record<string, unknown>).content
    : undefined;
}
