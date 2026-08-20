import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptGateway } from '../transcripts/transcript.gateway';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { SimulatorService } from './simulator.service';

describe('SimulatorService', () => {
  let meetingsService: MeetingsService;
  let transcriptGateway: jest.Mocked<
    Pick<TranscriptGateway, 'emitSegmentCreated'>
  >;
  let transcriptsService: TranscriptsService;
  let simulatorService: SimulatorService;

  beforeEach(() => {
    meetingsService = new MeetingsService();
    transcriptGateway = {
      emitSegmentCreated: jest.fn(),
    };
    transcriptsService = new TranscriptsService(
      meetingsService,
      transcriptGateway as TranscriptGateway,
    );
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
