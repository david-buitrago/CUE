import { ConflictException, NotFoundException } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptsService } from './transcripts.service';

describe('TranscriptsService', () => {
  let meetingsService: MeetingsService;
  let transcriptsService: TranscriptsService;

  beforeEach(() => {
    meetingsService = new MeetingsService();
    transcriptsService = new TranscriptsService(meetingsService);
  });

  it('creates a transcript segment for an existing meeting', () => {
    const meeting = meetingsService.create({
      title: 'Architecture discussion',
    });

    const segment = transcriptsService.create(meeting.id, {
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
  });

  it('returns the segments for a meeting', () => {
    const meeting = meetingsService.create({
      title: 'Architecture discussion',
    });
    const segment = transcriptsService.create(meeting.id, {
      speaker: 'David',
      text: 'Let us review the architecture.',
    });

    expect(transcriptsService.findAllByMeetingId(meeting.id)).toEqual([
      segment,
    ]);
  });

  it('rejects segments for an unknown meeting', () => {
    expect(() =>
      transcriptsService.create('missing-meeting', {
        speaker: 'David',
        text: 'Let us review the architecture.',
      }),
    ).toThrow(NotFoundException);
  });

  it('rejects segments for an ended meeting', () => {
    const meeting = meetingsService.create({
      title: 'Architecture discussion',
    });
    meetingsService.end(meeting.id);

    expect(() =>
      transcriptsService.create(meeting.id, {
        speaker: 'David',
        text: 'Let us review the architecture.',
      }),
    ).toThrow(ConflictException);
  });
});
