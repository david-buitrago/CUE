import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingsModule } from '../meetings/meetings.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { ElevenLabsSpeechToTextProvider } from './elevenlabs-speech-to-text.provider';
import { FixtureReplayService } from './fixture-replay.service';
import { RealtimeTranscriptionService } from './realtime-transcription.service';
import { SPEECH_TO_TEXT_PROVIDER } from './speech-to-text.provider';
import { TranscriptionController } from './transcription.controller';

@Module({
  imports: [MeetingsModule, TranscriptsModule],
  controllers: [TranscriptionController],
  providers: [
    RealtimeTranscriptionService,
    FixtureReplayService,
    ElevenLabsSpeechToTextProvider,
    {
      provide: SPEECH_TO_TEXT_PROVIDER,
      inject: [ElevenLabsSpeechToTextProvider, ConfigService],
      useFactory: (
        elevenLabsProvider: ElevenLabsSpeechToTextProvider,
        configService: ConfigService,
      ) => {
        const provider = configService.get<string>(
          'STT_PROVIDER',
          'elevenlabs',
        );

        if (provider !== 'elevenlabs') {
          throw new Error('STT_PROVIDER must be elevenlabs');
        }

        return elevenLabsProvider;
      },
    },
  ],
  exports: [RealtimeTranscriptionService],
})
export class TranscriptionModule {}
