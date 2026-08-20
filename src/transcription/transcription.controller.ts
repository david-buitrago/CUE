import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { FixtureReplayService } from './fixture-replay.service';

@Controller('meetings/:meetingId/transcription')
export class TranscriptionController {
  constructor(private readonly fixtureReplayService: FixtureReplayService) {}

  @Post('fixture-replay')
  @HttpCode(202)
  startFixtureReplay(@Param('meetingId') meetingId: string) {
    return this.fixtureReplayService.start(meetingId);
  }
}
