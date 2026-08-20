import { ConflictException, NotFoundException } from '@nestjs/common';
import { Meeting } from '../meetings/meeting';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptGateway } from './transcript.gateway';
import { TranscriptsService } from './transcripts.service';

describe('TranscriptsService', () => {
  let meetingsService: jest.Mocked<Pick<MeetingsService, 'findOne'>>;
  let transcriptGateway: jest.Mocked<
    Pick<TranscriptGateway, 'emitSegmentCreated'>
  >;
  let transcriptsService: TranscriptsService;

  beforeEach(() => {
    meetingsService = {
      findOne: jest.fn(),
    };
    transcriptGateway = {
      emitSegmentCreated: jest.fn(),
    };
    transcriptsService = new TranscriptsService(
      meetingsService,
      transcriptGateway as TranscriptGateway,
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
    meetingsService.findOne.mockResolvedValue(meeting);
    const segment = await transcriptsService.create(meeting.id, {
      speaker: 'David',
      text: 'Let us review the architecture.',
    });

    await expect(
      transcriptsService.findAllByMeetingId(meeting.id),
    ).resolves.toEqual([segment]);
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
