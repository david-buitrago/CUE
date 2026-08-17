import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
    create(createMeetingDto: CreateMeetingDto) {
        return {
            id: randomUUID(),
            title: createMeetingDto.title,
            status: 'active',
            startedAt: new Date().toISOString(),
        };
    }
}
