import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { MeetingEntity } from '../meetings/meeting.entity';

@Entity({ name: 'transcript_segments' })
@Index('IDX_transcript_segments_meeting_id', ['meetingId'])
export class TranscriptSegmentEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  meetingId!: string;

  @ManyToOne(() => MeetingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting!: MeetingEntity;

  @Column({ type: 'varchar', length: 80 })
  speaker!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'timestamptz' })
  capturedAt!: Date;
}
