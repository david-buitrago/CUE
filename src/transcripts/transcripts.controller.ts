import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateTranscriptSegmentDto } from './dto/create-transcript-segment.dto';
import { TranscriptsService } from './transcripts.service';

@Controller('meetings/:meetingId/transcript-segments')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Post()
  create(
    @Param('meetingId') meetingId: string,
    @Body() createTranscriptSegmentDto: CreateTranscriptSegmentDto,
  ) {
    return this.transcriptsService.create(
      meetingId,
      createTranscriptSegmentDto,
    );
  }

  @Get()
  findAll(@Param('meetingId') meetingId: string) {
    return this.transcriptsService.findAllByMeetingId(meetingId);
  }
}
