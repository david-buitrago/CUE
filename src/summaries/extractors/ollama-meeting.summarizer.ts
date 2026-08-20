import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranscriptSegment } from '../../transcripts/transcript-segment';
import type { MeetingSummarizer } from '../meeting-summarizer';
import { buildMeetingSummaryPrompt } from './meeting-summary-prompt';

@Injectable()
export class OllamaMeetingSummarizer implements MeetingSummarizer {
  constructor(private readonly configService: ConfigService) {}

  async summarize(segments: TranscriptSegment[]): Promise<string> {
    const baseUrl = this.configService.getOrThrow<string>('OLLAMA_BASE_URL');
    const response = await this.requestSummary(baseUrl, segments);
    const body: unknown = await response.json();

    if (!response.ok) {
      throw new BadGatewayException('Ollama could not summarize the meeting');
    }

    return parseSummary(getOllamaContent(body));
  }

  private async requestSummary(
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
          messages: [
            {
              role: 'system',
              content: 'You summarize meetings accurately and concisely.',
            },
            { role: 'user', content: buildMeetingSummaryPrompt(segments) },
          ],
          options: { temperature: 0 },
        }),
      });
    } catch {
      throw new BadGatewayException(
        'Ollama could not be reached for meeting summarization',
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

function parseSummary(content: unknown): string {
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new BadGatewayException('Ollama returned an invalid meeting summary');
  }

  return content.trim();
}
