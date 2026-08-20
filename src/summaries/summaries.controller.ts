import { Controller, Param, Post } from '@nestjs/common';
import { SummariesService } from './summaries.service';

@Controller('meetings/:meetingId/summary')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Post()
  generate(@Param('meetingId') meetingId: string) {
    return this.summariesService.generateForMeeting(meetingId);
  }
}
