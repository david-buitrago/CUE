import { Inject, Injectable } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { MeetingSummary } from './meeting-summary';
import {
  MEETING_SUMMARIZER,
  type MeetingSummarizer,
} from './meeting-summarizer';

@Injectable()
export class SummariesService {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptsService: TranscriptsService,
    @Inject(MEETING_SUMMARIZER)
    private readonly meetingSummarizer: MeetingSummarizer,
  ) {}

  async generateForMeeting(meetingId: string): Promise<MeetingSummary> {
    await this.meetingsService.findOne(meetingId);
    const segments =
      await this.transcriptsService.findAllByMeetingId(meetingId);
    const content = await this.meetingSummarizer.summarize(segments);

    return {
      meetingId,
      content,
      generatedAt: new Date().toISOString(),
    };
  }
}
