import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranscriptSegment } from '../../transcripts/transcript-segment';
import type { MeetingSummarizer } from '../meeting-summarizer';
import { buildMeetingSummaryPrompt } from './meeting-summary-prompt';

const OPENCODE_GO_URL = 'https://opencode.ai/zen/go/v1/chat/completions';

@Injectable()
export class OpenCodeMeetingSummarizer implements MeetingSummarizer {
  constructor(private readonly configService: ConfigService) {}

  async summarize(segments: TranscriptSegment[]): Promise<string> {
    const response = await this.requestSummary(segments);
    const body: unknown = await response.json();

    if (!response.ok) {
      throw new BadGatewayException(
        'OpenCode Go could not summarize the meeting',
      );
    }

    return parseSummary(getOpenCodeContent(body));
  }

  private async requestSummary(
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
              content: 'You summarize meetings accurately and concisely.',
            },
            { role: 'user', content: buildMeetingSummaryPrompt(segments) },
          ],
          temperature: 0,
        }),
      });
    } catch {
      throw new BadGatewayException(
        'OpenCode Go could not be reached for meeting summarization',
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

function parseSummary(content: unknown): string {
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new BadGatewayException(
      'OpenCode Go returned an invalid meeting summary',
    );
  }

  return content.trim();
}
