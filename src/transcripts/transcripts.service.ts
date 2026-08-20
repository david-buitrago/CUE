import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MeetingsService } from '../meetings/meetings.service';
import { CreateTranscriptSegmentDto } from './dto/create-transcript-segment.dto';
import { TranscriptSegment } from './transcript-segment';

@Injectable()
export class TranscriptsService {
  private readonly segmentsByMeetingId = new Map<string, TranscriptSegment[]>();

  constructor(private readonly meetingsService: MeetingsService) {}

  create(
    meetingId: string,
    createTranscriptSegmentDto: CreateTranscriptSegmentDto,
  ): TranscriptSegment {
    const meeting = this.meetingsService.findOne(meetingId);

    if (meeting.status === 'ended') {
      throw new ConflictException(
        'Cannot add transcript segments to an ended meeting',
      );
    }

    const segment: TranscriptSegment = {
      id: randomUUID(),
      meetingId,
      speaker: createTranscriptSegmentDto.speaker,
      text: createTranscriptSegmentDto.text,
      capturedAt: new Date().toISOString(),
    };

    const segments = this.segmentsByMeetingId.get(meetingId) ?? [];
    segments.push(segment);
    this.segmentsByMeetingId.set(meetingId, segments);

    return segment;
  }

  findAllByMeetingId(meetingId: string): TranscriptSegment[] {
    this.meetingsService.findOne(meetingId);

    return this.segmentsByMeetingId.get(meetingId) ?? [];
  }
}
