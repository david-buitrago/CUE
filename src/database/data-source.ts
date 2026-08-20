import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { ActionItemEntity } from '../action-items/action-item.entity';
import { MeetingEntity } from '../meetings/meeting.entity';
import { TranscriptSegmentEntity } from '../transcripts/transcript-segment.entity';

config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured');
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [MeetingEntity, TranscriptSegmentEntity, ActionItemEntity],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
