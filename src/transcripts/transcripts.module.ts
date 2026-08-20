import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsModule } from '../meetings/meetings.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptGateway } from './transcript.gateway';
import { TranscriptSegmentEntity } from './transcript-segment.entity';
import { TranscriptsService } from './transcripts.service';

@Module({
  controllers: [TranscriptsController],
  providers: [TranscriptsService, TranscriptGateway],
  imports: [
    MeetingsModule,
    TypeOrmModule.forFeature([TranscriptSegmentEntity]),
  ],
  exports: [TranscriptsService, TranscriptGateway],
})
export class TranscriptsModule {}
