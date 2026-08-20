import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { SimulatorService } from './simulator.service';

describe('SimulatorService', () => {
  let meetingsService: MeetingsService;
  let transcriptsService: TranscriptsService;
  let simulatorService: SimulatorService;

  beforeEach(() => {
    meetingsService = new MeetingsService();
    transcriptsService = new TranscriptsService(meetingsService);
    simulatorService = new SimulatorService(transcriptsService);
  });

  it('adds the deterministic scenario to an active meeting', () => {
    const meeting = meetingsService.create({
      title: 'Architecture discussion',
    });

    const segments = simulatorService.run(meeting.id);

    expect(segments).toHaveLength(3);
    expect(segments.map((segment) => segment.speaker)).toEqual([
      'David',
      'Alex',
      'David',
    ]);
    expect(transcriptsService.findAllByMeetingId(meeting.id)).toEqual(segments);
  });
});
