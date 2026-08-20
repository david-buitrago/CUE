import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MeetingEntity } from './meeting.entity';
import { MeetingsService } from './meetings.service';

describe('MeetingsService', () => {
  let meetingsRepository: jest.Mocked<
    Pick<Repository<MeetingEntity>, 'create' | 'find' | 'findOneBy' | 'save'>
  >;
  let meetingsService: MeetingsService;

  beforeEach(() => {
    meetingsRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
    };
    meetingsService = new MeetingsService(
      meetingsRepository as Repository<MeetingEntity>,
    );
  });

  it('creates an active meeting', async () => {
    const entity: MeetingEntity = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Architecture discussion',
      status: 'active',
      startedAt: new Date('2026-08-20T10:00:00.000Z'),
      endedAt: null,
    };
    meetingsRepository.create.mockReturnValue(entity);
    meetingsRepository.save.mockResolvedValue(entity);

    const meeting = await meetingsService.create({
      title: 'Architecture discussion',
    });

    expect(meeting).toEqual(
      expect.objectContaining({
        title: 'Architecture discussion',
        status: 'active',
      }),
    );
    expect(meeting).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Architecture discussion',
      status: 'active',
      startedAt: '2026-08-20T10:00:00.000Z',
    });
    expect(meetingsRepository.save).toHaveBeenCalledWith(entity);
  });

  it('returns the meetings stored in the repository', async () => {
    const entity: MeetingEntity = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Architecture discussion',
      status: 'active',
      startedAt: new Date('2026-08-20T10:00:00.000Z'),
      endedAt: null,
    };
    meetingsRepository.find.mockResolvedValue([entity]);

    await expect(meetingsService.findAll()).resolves.toEqual([
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Architecture discussion',
        status: 'active',
        startedAt: '2026-08-20T10:00:00.000Z',
      },
    ]);
  });

  it('ends an active meeting', async () => {
    const entity: MeetingEntity = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Architecture discussion',
      status: 'active',
      startedAt: new Date('2026-08-20T10:00:00.000Z'),
      endedAt: null,
    };
    meetingsRepository.findOneBy.mockResolvedValue(entity);
    meetingsRepository.save.mockResolvedValue(entity);

    const endedMeeting = await meetingsService.end(entity.id);

    expect(endedMeeting.status).toBe('ended');
    expect(endedMeeting.endedAt).toEqual(expect.any(String));
    expect(meetingsRepository.save).toHaveBeenCalledWith(entity);
  });

  it('rejects ending a meeting that does not exist', async () => {
    meetingsRepository.findOneBy.mockResolvedValue(null);

    await expect(meetingsService.end('missing-meeting')).rejects.toThrow(
      NotFoundException,
    );
  });
});
