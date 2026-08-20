import { Controller, Get, Param, Post } from '@nestjs/common';
import { ActionItemsService } from './action-items.service';

@Controller('meetings/:meetingId/action-items')
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Post('extract')
  extract(@Param('meetingId') meetingId: string) {
    return this.actionItemsService.extractForMeeting(meetingId);
  }

  @Get()
  findAll(@Param('meetingId') meetingId: string) {
    return this.actionItemsService.findAllByMeetingId(meetingId);
  }
}
