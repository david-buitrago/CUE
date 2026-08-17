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
});