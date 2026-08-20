import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { Meeting } from './meeting';
import { MeetingEntity } from './meeting.entity';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(MeetingEntity)
    private readonly meetingsRepository: Repository<MeetingEntity>,
  ) {}

  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const meeting = this.meetingsRepository.create({
      id: randomUUID(),
      title: createMeetingDto.title,
      status: 'active',
      startedAt: new Date(),
      endedAt: null,
    });

    const savedMeeting = await this.meetingsRepository.save(meeting);

    return this.toMeeting(savedMeeting);
  }

  async findAll(): Promise<Meeting[]> {
    const meetings = await this.meetingsRepository.find({
      order: { startedAt: 'ASC' },
    });

    return meetings.map((meeting) => this.toMeeting(meeting));
  }

  async findOne(id: string): Promise<Meeting> {
    this.assertValidMeetingId(id);

    const meeting = await this.meetingsRepository.findOneBy({ id });

    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${id} was not found`);
    }

    return this.toMeeting(meeting);
  }

  async end(id: string): Promise<Meeting> {
    this.assertValidMeetingId(id);

    const meeting = await this.meetingsRepository.findOneBy({ id });

    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${id} was not found`);
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();

    const savedMeeting = await this.meetingsRepository.save(meeting);

    return this.toMeeting(savedMeeting);
  }

  private toMeeting(meeting: MeetingEntity): Meeting {
    return {
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      startedAt: meeting.startedAt.toISOString(),
      ...(meeting.endedAt ? { endedAt: meeting.endedAt.toISOString() } : {}),
    };
  }

  private assertValidMeetingId(id: string): void {
    if (!isUUID(id)) {
      throw new NotFoundException(`Meeting with id ${id} was not found`);
    }
  }
}
