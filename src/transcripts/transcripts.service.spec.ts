import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/meeting';
import { MeetingEntity } from '../meetings/meeting.entity';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptGateway } from './transcript.gateway';
import { TranscriptSegmentEntity } from './transcript-segment.entity';
import { TranscriptsService } from './transcripts.service';

describe('TranscriptsService', () => {
  let meetingsService: jest.Mocked<Pick<MeetingsService, 'findOne'>>;
  let transcriptGateway: jest.Mocked<
    Pick<TranscriptGateway, 'emitSegmentCreated'>
  >;
  let transcriptSegmentsRepository: jest.Mocked<
    Pick<Repository<TranscriptSegmentEntity>, 'create' | 'find' | 'save'>
  >;
  let transcriptsService: TranscriptsService;

  beforeEach(() => {
    meetingsService = {
      findOne: jest.fn(),
    };
    transcriptGateway = {
      emitSegmentCreated: jest.fn(),
    };
    transcriptSegmentsRepository = {
      create: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
    transcriptsService = new TranscriptsService(
      meetingsService,
      transcriptGateway as TranscriptGateway,
      transcriptSegmentsRepository as Repository<TranscriptSegmentEntity>,
    );
  });

  it('creates a transcript segment for an existing meeting', async () => {
    const meeting: Meeting = {
      id: 'meeting-id',
      title: 'Architecture discussion',
      status: 'active',
      startedAt: '2026-08-20T10:00:00.000Z',
    };
    meetingsService.findOne.mockResolvedValue(meeting);
    transcriptSegmentsRepository.create.mockImplementation(
      (segment) => segment as TranscriptSegmentEntity,
    );
    transcriptSegmentsRepository.save.mockImplementation((segment) =>
      Promise.resolve(segment),
    );

    const segment = await transcriptsService.create(meeting.id, {
      speaker: 'David',
      text: 'Let us review the architecture.',
    });

    expect(segment).toEqual(
      expect.objectContaining({
        meetingId: meeting.id,
        speaker: 'David',
        text: 'Let us review the architecture.',
      }),
    );
    expect(segment.id).toEqual(expect.any(String));
    expect(segment.capturedAt).toEqual(expect.any(String));
    expect(transcriptGateway.emitSegmentCreated).toHaveBeenCalledWith(segment);
  });

  it('returns the segments for a meeting', async () => {
    const meeting: Meeting = {
      id: 'meeting-id',
      title: 'Architecture discussion',
      status: 'active',
      startedAt: '2026-08-20T10:00:00.000Z',
    };
    const entity: TranscriptSegmentEntity = {
      id: 'segment-id',
      meetingId: meeting.id,
      meeting: {} as MeetingEntity,
      speaker: 'David',
      text: 'Let us review the architecture.',
      capturedAt: new Date('2026-08-20T10:00:00.000Z'),
    };
    meetingsService.findOne.mockResolvedValue(meeting);
    transcriptSegmentsRepository.find.mockResolvedValue([entity]);

    await expect(
      transcriptsService.findAllByMeetingId(meeting.id),
    ).resolves.toEqual([
      {
        id: 'segment-id',
        meetingId: meeting.id,
        speaker: 'David',
        text: 'Let us review the architecture.',
        capturedAt: '2026-08-20T10:00:00.000Z',
      },
    ]);
  });

  it('rejects segments for an unknown meeting', async () => {
    meetingsService.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      transcriptsService.create('missing-meeting', {
        speaker: 'David',
        text: 'Let us review the architecture.',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects segments for an ended meeting', async () => {
    meetingsService.findOne.mockResolvedValue({
      id: 'meeting-id',
      title: 'Architecture discussion',
      status: 'ended',
      startedAt: '2026-08-20T10:00:00.000Z',
      endedAt: '2026-08-20T10:30:00.000Z',
    });

    await expect(
      transcriptsService.create('meeting-id', {
        speaker: 'David',
        text: 'Let us review the architecture.',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
