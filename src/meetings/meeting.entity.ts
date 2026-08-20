import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { MeetingStatus } from './meeting';

@Entity({ name: 'meetings' })
export class MeetingEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({
    type: 'enum',
    enum: ['active', 'ended'],
    enumName: 'meeting_status',
  })
  status!: MeetingStatus;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
