import { Controller, Param, Post } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

@Controller('meetings/:meetingId/transcript-simulation')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post()
  run(@Param('meetingId') meetingId: string) {
    return this.simulatorService.run(meetingId);
  }
}
