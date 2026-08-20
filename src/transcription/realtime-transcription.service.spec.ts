import { BadRequestException } from '@nestjs/common';
import { Meeting } from '../meetings/meeting';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptGateway } from '../transcripts/transcript.gateway';
import { TranscriptsService } from '../transcripts/transcripts.service';
import type {
  SpeechToTextProvider,
  SpeechToTextSession,
  SpeechToTextSessionInput,
} from './speech-to-text.provider';
import { RealtimeTranscriptionService } from './realtime-transcription.service';

describe('RealtimeTranscriptionService', () => {
  let meetingsService: jest.Mocked<Pick<MeetingsService, 'findOne'>>;
  let transcriptsService: jest.Mocked<Pick<TranscriptsService, 'create'>>;
  let transcriptGateway: jest.Mocked<
    Pick<TranscriptGateway, 'emitTranscriptError' | 'emitTranscriptInterim'>
  >;
  let speechToTextProvider: jest.Mocked<Pick<SpeechToTextProvider, 'open'>>;
  let session: jest.Mocked<SpeechToTextSession>;
  let sendPcm: jest.Mock;
  let commit: jest.Mock;
  let close: jest.Mock;
  let sessionInput: SpeechToTextSessionInput | undefined;
  let service: RealtimeTranscriptionService;

  beforeEach(() => {
    meetingsService = { findOne: jest.fn() };
    transcriptsService = { create: jest.fn() };
    transcriptGateway = {
      emitTranscriptError: jest.fn(),
      emitTranscriptInterim: jest.fn(),
    };
    sendPcm = jest.fn();
    commit = jest.fn();
    close = jest.fn();
    session = { sendPcm, commit, close };
    speechToTextProvider = {
      open: jest.fn((input: SpeechToTextSessionInput) => {
        sessionInput = input;
        return Promise.resolve(session);
      }),
    };
    service = new RealtimeTranscriptionService(
      meetingsService,
      transcriptsService,
      transcriptGateway as TranscriptGateway,
      speechToTextProvider,
    );
  });

  it('streams interim transcripts and persists finalized transcripts', async () => {
    meetingsService.findOne.mockResolvedValue(activeMeeting());
    transcriptsService.create.mockResolvedValue({} as never);

    await service.openSession('meeting-id', 'THEM');
    sessionInput?.onInterim('Why use Kafka for everything?');
    sessionInput?.onFinal('Why use Kafka for everything?');
    await new Promise(setImmediate);

    expect(transcriptGateway.emitTranscriptInterim).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: 'meeting-id',
        channel: 'THEM',
        text: 'Why use Kafka for everything?',
      }),
    );
    expect(transcriptsService.create).toHaveBeenCalledWith('meeting-id', {
      speaker: 'THEM',
      text: 'Why use Kafka for everything?',
    });
  });

  it('sends audio, commits, and closes an open session', async () => {
    meetingsService.findOne.mockResolvedValue(activeMeeting());
    await service.openSession('meeting-id', 'YOU');

    service.sendAudio('meeting-id', 'YOU', new Uint8Array([1, 2, 3]));
    service.commit('meeting-id', 'YOU');
    service.closeSession('meeting-id', 'YOU');

    expect(sendPcm).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(() => service.commit('meeting-id', 'YOU')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a second session for the same meeting channel', async () => {
    meetingsService.findOne.mockResolvedValue(activeMeeting());
    await service.openSession('meeting-id', 'YOU');

    await expect(service.openSession('meeting-id', 'YOU')).rejects.toThrow(
      BadRequestException,
    );
  });
});

function activeMeeting(): Meeting {
  return {
    id: 'meeting-id',
    title: 'Architecture discussion',
    status: 'active',
    startedAt: '2026-08-20T10:00:00.000Z',
  };
}
