import { Module } from '@nestjs/common';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [TranscriptsModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
})
export class SimulatorModule {}
