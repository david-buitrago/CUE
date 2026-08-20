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

  async run(meetingId: string): Promise<TranscriptSegment[]> {
    const segments: TranscriptSegment[] = [];

    for (const segment of this.scenario) {
      segments.push(await this.transcriptsService.create(meetingId, segment));
    }

    return segments;
  }
}
