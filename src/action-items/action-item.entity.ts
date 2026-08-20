import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { MeetingEntity } from '../meetings/meeting.entity';
import { TranscriptSegmentEntity } from '../transcripts/transcript-segment.entity';
import type { ActionItemStatus } from './action-item';

@Entity({ name: 'action_items' })
@Index('IDX_action_items_meeting_id', ['meetingId'])
@Index('UQ_action_items_source_segment_id', ['sourceSegmentId'], {
  unique: true,
})
export class ActionItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  meetingId!: string;

  @ManyToOne(() => MeetingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting!: MeetingEntity;

  @Column({ type: 'uuid' })
  sourceSegmentId!: string;

  @ManyToOne(() => TranscriptSegmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceSegmentId' })
  sourceSegment!: TranscriptSegmentEntity;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['open', 'completed'],
    enumName: 'action_item_status',
  })
  status!: ActionItemStatus;

  @Column({ type: 'timestamptz' })
  createdAt!: Date;
}
