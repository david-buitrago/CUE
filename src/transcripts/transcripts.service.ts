import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { MeetingsService } from '../meetings/meetings.service';
import { CreateTranscriptSegmentDto } from './dto/create-transcript-segment.dto';
import { TranscriptGateway } from './transcript.gateway';
import { TranscriptSegment } from './transcript-segment';
import { TranscriptSegmentEntity } from './transcript-segment.entity';

@Injectable()
export class TranscriptsService {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptGateway: TranscriptGateway,
    @InjectRepository(TranscriptSegmentEntity)
    private readonly transcriptSegmentsRepository: Repository<TranscriptSegmentEntity>,
  ) {}

  async create(
    meetingId: string,
    createTranscriptSegmentDto: CreateTranscriptSegmentDto,
  ): Promise<TranscriptSegment> {
    const meeting = await this.meetingsService.findOne(meetingId);

    if (meeting.status === 'ended') {
      throw new ConflictException(
        'Cannot add transcript segments to an ended meeting',
      );
    }

    const segment = this.transcriptSegmentsRepository.create({
      id: randomUUID(),
      meetingId,
      speaker: createTranscriptSegmentDto.speaker,
      text: createTranscriptSegmentDto.text,
      capturedAt: new Date(),
    });

    const savedSegment = await this.transcriptSegmentsRepository.save(segment);
    const transcriptSegment = this.toTranscriptSegment(savedSegment);
    this.transcriptGateway.emitSegmentCreated(transcriptSegment);

    return transcriptSegment;
  }

  async findAllByMeetingId(meetingId: string): Promise<TranscriptSegment[]> {
    await this.meetingsService.findOne(meetingId);

    const segments = await this.transcriptSegmentsRepository.find({
      where: { meetingId },
      order: { capturedAt: 'ASC' },
    });

    return segments.map((segment) => this.toTranscriptSegment(segment));
  }

  private toTranscriptSegment(
    segment: TranscriptSegmentEntity,
  ): TranscriptSegment {
    return {
      id: segment.id,
      meetingId: segment.meetingId,
      speaker: segment.speaker,
      text: segment.text,
      capturedAt: segment.capturedAt.toISOString(),
    };
  }
}
