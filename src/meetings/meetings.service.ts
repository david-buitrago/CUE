import { Injectable, NotFoundException } from '@nestjs/common';
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
    end(id: string): Meeting {
        const meeting = this.meetings.get(id);

        if (!meeting) {
            throw new NotFoundException(`Meeting with id ${id} was not found`);
        }

        meeting.status = 'ended';
        meeting.endedAt = new Date().toISOString();

        return meeting;
    }
}
