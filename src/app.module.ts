import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [HealthModule, MeetingsModule],
})
export class AppModule {}