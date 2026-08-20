import { Module } from '@nestjs/common';
import { MeetingsModule } from '../meetings/meetings.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptGateway } from './transcript.gateway';
import { TranscriptsService } from './transcripts.service';

@Module({
  controllers: [TranscriptsController],
  providers: [TranscriptsService, TranscriptGateway],
  imports: [MeetingsModule],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
