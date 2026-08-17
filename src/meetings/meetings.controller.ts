import { Body, Controller, Post, Get } from '@nestjs/common';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
    constructor(private readonly meetingsService: MeetingsService) {}

    @Get()
    findAll() {
    return this.meetingsService.findAll();
    }

    @Post()
    create(@Body() createMeetingDto: CreateMeetingDto) {
        return this.meetingsService.create(createMeetingDto);
    }
}
