import { TranscriptSegment } from '../transcripts/transcript-segment';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { SimulatorService } from './simulator.service';

describe('SimulatorService', () => {
  let transcriptsService: jest.Mocked<Pick<TranscriptsService, 'create'>>;
  let simulatorService: SimulatorService;

  beforeEach(() => {
    transcriptsService = {
      create: jest.fn(),
    };
    simulatorService = new SimulatorService(transcriptsService);
  });

  it('adds the deterministic scenario to an active meeting', async () => {
    let segmentIndex = 0;
    transcriptsService.create.mockImplementation(
      (meetingId, createTranscriptSegmentDto): Promise<TranscriptSegment> => {
        segmentIndex += 1;

        return Promise.resolve({
          id: `segment-${segmentIndex}`,
          meetingId,
          speaker: createTranscriptSegmentDto.speaker,
          text: createTranscriptSegmentDto.text,
          capturedAt: '2026-08-20T10:00:00.000Z',
        });
      },
    );

    const segments = await simulatorService.run('meeting-id');

    expect(segments).toHaveLength(3);
    expect(segments.map((segment) => segment.speaker)).toEqual([
      'David',
      'Alex',
      'David',
    ]);
    expect(transcriptsService.create).toHaveBeenCalledTimes(3);
  });
});
