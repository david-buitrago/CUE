import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsModule } from '../meetings/meetings.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { ActionItemEntity } from './action-item.entity';
import { ActionItemsController } from './action-items.controller';
import { ActionItemsService } from './action-items.service';

@Module({
  imports: [
    MeetingsModule,
    TranscriptsModule,
    TypeOrmModule.forFeature([ActionItemEntity]),
  ],
  controllers: [ActionItemsController],
  providers: [ActionItemsService],
})
export class ActionItemsModule {}
