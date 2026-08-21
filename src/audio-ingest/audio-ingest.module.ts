import { Module } from '@nestjs/common';
import { TranscriptionModule } from '../transcription/transcription.module';
import { AudioGatewayService } from './audio-gateway.service';

@Module({
  imports: [TranscriptionModule],
  providers: [AudioGatewayService],
})
export class AudioIngestModule {}
