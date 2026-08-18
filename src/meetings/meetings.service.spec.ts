import { NotFoundException } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

describe('MeetingsService', () => {
  let meetingsService: MeetingsService;

  beforeEach(() => {
    meetingsService = new MeetingsService();
  });

  it('creates an active meeting', () => {
    const meeting = meetingsService.create({
      title: 'Architecture discussion',
    });

    expect(meeting).toEqual(
      expect.objectContaining({
        title: 'Architecture discussion',
        status: 'active',
      }),
    );
    expect(meeting.id).toEqual(expect.any(String));
    expect(meeting.startedAt).toEqual(expect.any(String));
  });

    it('returns the meetings it has created', () => {
    const createdMeeting = meetingsService.create({
      title: 'Architecture discussion',
    });

    expect(meetingsService.findAll()).toEqual([createdMeeting]);
  });

    it('ends an active meeting', () => {
    const meeting = meetingsService.create({
      title: 'Architecture discussion',
    });

    const endedMeeting = meetingsService.end(meeting.id);

    expect(endedMeeting.status).toBe('ended');
    expect(endedMeeting.endedAt).toEqual(expect.any(String));
  });

  it('rejects ending a meeting that does not exist', () => {
    expect(() => meetingsService.end('missing-meeting')).toThrow(
      NotFoundException,
    );
  });
});