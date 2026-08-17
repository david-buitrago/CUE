import { Body, Controller, Post } from '@nestjs/common';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
    constructor(private readonly meetingsService: MeetingsService) {}

    @Post()
    create(@Body() createMeetingDto: CreateMeetingDto) {
        return this.meetingsService.create(createMeetingDto);
    }
}
