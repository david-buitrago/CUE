import { BadRequestException, Injectable } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptGateway } from '../transcripts/transcript.gateway';
import { TranscriptsService } from '../transcripts/transcripts.service';
import type { AudioChannel } from './live-transcript';
import {
  SPEECH_TO_TEXT_PROVIDER,
  type SpeechToTextProvider,
  type SpeechToTextSession,
} from './speech-to-text.provider';
import { Inject } from '@nestjs/common';

@Injectable()
export class RealtimeTranscriptionService {
  private readonly sessions = new Map<string, SpeechToTextSession>();

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptsService: TranscriptsService,
    private readonly transcriptGateway: TranscriptGateway,
    @Inject(SPEECH_TO_TEXT_PROVIDER)
    private readonly speechToTextProvider: SpeechToTextProvider,
  ) {}

  async openSession(meetingId: string, channel: AudioChannel): Promise<void> {
    const meeting = await this.meetingsService.findOne(meetingId);

    if (meeting.status === 'ended') {
      throw new BadRequestException(
        'Cannot open transcription for an ended meeting',
      );
    }

    const sessionKey = this.sessionKey(meetingId, channel);

    if (this.sessions.has(sessionKey)) {
      throw new BadRequestException(
        `A transcription session is already open for ${channel}`,
      );
    }

    const session = await this.speechToTextProvider.open({
      meetingId,
      channel,
      onInterim: (text) => {
        this.transcriptGateway.emitTranscriptInterim({
          meetingId,
          channel,
          text,
          observedAt: new Date().toISOString(),
        });
      },
      onFinal: (text) => {
        void this.persistFinalTranscript(meetingId, channel, text);
      },
      onError: (message) => {
        this.transcriptGateway.emitTranscriptError({
          meetingId,
          channel,
          message,
          observedAt: new Date().toISOString(),
        });
      },
    });

    this.sessions.set(sessionKey, session);
  }

  sendAudio(meetingId: string, channel: AudioChannel, audio: Uint8Array): void {
    this.getSession(meetingId, channel).sendPcm(audio);
  }

  commit(meetingId: string, channel: AudioChannel): void {
    this.getSession(meetingId, channel).commit();
  }

  closeSession(meetingId: string, channel: AudioChannel): void {
    const sessionKey = this.sessionKey(meetingId, channel);
    const session = this.getSession(meetingId, channel);

    session.close();
    this.sessions.delete(sessionKey);
  }

  private async persistFinalTranscript(
    meetingId: string,
    channel: AudioChannel,
    text: string,
  ): Promise<void> {
    try {
      await this.transcriptsService.create(meetingId, {
        speaker: channel,
        text,
      });
    } catch (error) {
      this.transcriptGateway.emitTranscriptError({
        meetingId,
        channel,
        message:
          error instanceof Error
            ? error.message
            : 'Could not persist the finalized transcript',
        observedAt: new Date().toISOString(),
      });
    }
  }

  private getSession(
    meetingId: string,
    channel: AudioChannel,
  ): SpeechToTextSession {
    const session = this.sessions.get(this.sessionKey(meetingId, channel));

    if (!session) {
      throw new BadRequestException(
        `No transcription session is open for ${channel}`,
      );
    }

    return session;
  }

  private sessionKey(meetingId: string, channel: AudioChannel): string {
    return `${meetingId}:${channel}`;
  }
}
