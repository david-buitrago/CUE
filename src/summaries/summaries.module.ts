import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingsModule } from '../meetings/meetings.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { MEETING_SUMMARIZER } from './meeting-summarizer';
import { OllamaMeetingSummarizer } from './extractors/ollama-meeting.summarizer';
import { OpenCodeMeetingSummarizer } from './extractors/opencode-meeting.summarizer';
import { RuleBasedMeetingSummarizer } from './extractors/rule-based-meeting.summarizer';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';

@Module({
  imports: [MeetingsModule, TranscriptsModule],
  controllers: [SummariesController],
  providers: [
    SummariesService,
    RuleBasedMeetingSummarizer,
    OpenCodeMeetingSummarizer,
    OllamaMeetingSummarizer,
    {
      provide: MEETING_SUMMARIZER,
      inject: [
        ConfigService,
        RuleBasedMeetingSummarizer,
        OpenCodeMeetingSummarizer,
        OllamaMeetingSummarizer,
      ],
      useFactory: (
        configService: ConfigService,
        ruleBasedSummarizer: RuleBasedMeetingSummarizer,
        openCodeSummarizer: OpenCodeMeetingSummarizer,
        ollamaSummarizer: OllamaMeetingSummarizer,
      ) => {
        switch (configService.get<string>('INSIGHTS_PROVIDER', 'rule')) {
          case 'opencode':
            return openCodeSummarizer;
          case 'ollama':
            return ollamaSummarizer;
          default:
            return ruleBasedSummarizer;
        }
      },
    },
  ],
})
export class SummariesModule {}
