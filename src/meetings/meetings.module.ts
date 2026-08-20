import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsController } from './meetings.controller';
import { MeetingEntity } from './meeting.entity';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingEntity])],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
