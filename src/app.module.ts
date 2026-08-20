import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptsModule } from './transcripts/transcripts.module';

@Module({
  imports: [HealthModule, MeetingsModule, TranscriptsModule],
})
export class AppModule {}
