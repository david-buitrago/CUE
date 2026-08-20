import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ActionItemExtractor,
  ExtractedActionItem,
} from '../action-item-extractor';
import type { TranscriptSegment } from '../../transcripts/transcript-segment';
import { buildActionItemPrompt } from './action-item-prompt';
import { parseModelResponse } from './model-response';

@Injectable()
export class OllamaActionItemExtractor implements ActionItemExtractor {
  constructor(private readonly configService: ConfigService) {}

  async extract(segments: TranscriptSegment[]): Promise<ExtractedActionItem[]> {
    const baseUrl = this.configService.getOrThrow<string>('OLLAMA_BASE_URL');
    const response = await this.requestExtraction(baseUrl, segments);
    const body: unknown = await response.json();

    if (!response.ok) {
      throw new BadGatewayException(
        'Ollama could not extract the action items',
      );
    }

    return parseModelResponse(getOllamaContent(body));
  }

  private async requestExtraction(
    baseUrl: string,
    segments: TranscriptSegment[],
  ): Promise<Response> {
    try {
      return await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.configService.get<string>('OLLAMA_MODEL', 'qwen3:4b'),
          stream: false,
          format: 'json',
          messages: [
            {
              role: 'system',
              content:
                'You extract meeting action items and return valid JSON.',
            },
            { role: 'user', content: buildActionItemPrompt(segments) },
          ],
          options: { temperature: 0 },
        }),
      });
    } catch {
      throw new BadGatewayException(
        'Ollama could not be reached for action-item extraction',
      );
    }
  }
}

function getOllamaContent(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const message = (body as Record<string, unknown>).message;

  return typeof message === 'object' && message !== null
    ? (message as Record<string, unknown>).content
    : undefined;
}
