import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { Meeting } from './meeting';

@Injectable()
export class MeetingsService {
    private readonly meetings = new Map<string, Meeting>();

    create(createMeetingDto: CreateMeetingDto): Meeting {
        const meeting: Meeting = {
            id: randomUUID(),
            title: createMeetingDto.title,
            status: 'active',
            startedAt: new Date().toISOString(),
        };

        this.meetings.set(meeting.id, meeting);

        return meeting;
    }

    findAll(): Meeting[] {
        return Array.from(this.meetings.values());
    }
}
