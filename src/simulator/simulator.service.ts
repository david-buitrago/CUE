import { Injectable } from '@nestjs/common';
import { TranscriptSegment } from '../transcripts/transcript-segment';
import { TranscriptsService } from '../transcripts/transcripts.service';

@Injectable()
export class SimulatorService {
  private readonly scenario = [
    {
      speaker: 'David',
      text: 'Welcome. Let us review the architecture for CUE.',
    },
    {
      speaker: 'Alex',
      text: 'The engine keeps active meetings and transcript segments in memory.',
    },
    {
      speaker: 'David',
      text: 'Great. Next we can connect the audio pipeline to this boundary.',
    },
  ];

  constructor(private readonly transcriptsService: TranscriptsService) {}

  run(meetingId: string): TranscriptSegment[] {
    return this.scenario.map((segment) =>
      this.transcriptsService.create(meetingId, segment),
    );
  }
}
