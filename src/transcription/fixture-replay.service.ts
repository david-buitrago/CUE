import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { RealtimeTranscriptionService } from './realtime-transcription.service';

const FRAME_DURATION_MS = 100;
const FINALIZATION_GRACE_PERIOD_MS = 1_000;
const EXPECTED_SAMPLE_RATE = 16_000;
const EXPECTED_CHANNELS = 2;
const EXPECTED_BITS_PER_SAMPLE = 16;

@Injectable()
export class FixtureReplayService {
  private readonly activeMeetings = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly transcriptionService: RealtimeTranscriptionService,
  ) {}

  async start(meetingId: string): Promise<void> {
    if (this.activeMeetings.has(meetingId)) {
      throw new BadRequestException(
        'A fixture replay is already running for this meeting',
      );
    }

    const audio = await this.loadFixture();

    await this.transcriptionService.openSession(meetingId, 'THEM');

    try {
      await this.transcriptionService.openSession(meetingId, 'YOU');
    } catch (error) {
      this.transcriptionService.closeSession(meetingId, 'THEM');
      throw error;
    }

    this.activeMeetings.add(meetingId);
    void this.replay(meetingId, audio);
  }

  private async loadFixture(): Promise<PcmWav> {
    const fixturePath = this.configService.getOrThrow<string>(
      'CUE_AUDIO_FIXTURE_PATH',
    );
    const content = await readFile(fixturePath);

    return parsePcmWav(content);
  }

  private async replay(meetingId: string, audio: PcmWav): Promise<void> {
    const samplesPerFrame = (audio.sampleRate * FRAME_DURATION_MS) / 1_000;
    const bytesPerSample = audio.bitsPerSample / 8;
    const bytesPerInterleavedFrame =
      samplesPerFrame * audio.channels * bytesPerSample;

    try {
      for (
        let offset = 0;
        offset < audio.data.length;
        offset += bytesPerInterleavedFrame
      ) {
        const input = audio.data.subarray(
          offset,
          offset + bytesPerInterleavedFrame,
        );
        const { them, you } = splitStereoFrame(input, bytesPerSample);

        this.transcriptionService.sendAudio(meetingId, 'THEM', them);
        this.transcriptionService.sendAudio(meetingId, 'YOU', you);
        await delay(FRAME_DURATION_MS);
      }

      this.transcriptionService.commit(meetingId, 'THEM');
      this.transcriptionService.commit(meetingId, 'YOU');
      await delay(FINALIZATION_GRACE_PERIOD_MS);
    } finally {
      this.transcriptionService.closeSession(meetingId, 'THEM');
      this.transcriptionService.closeSession(meetingId, 'YOU');
      this.activeMeetings.delete(meetingId);
    }
  }
}

interface PcmWav {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  data: Buffer;
}

export function parsePcmWav(content: Buffer): PcmWav {
  if (
    content.length < 44 ||
    content.toString('ascii', 0, 4) !== 'RIFF' ||
    content.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    throw new BadRequestException('The fixture must be a WAV file');
  }

  const audioFormat = content.readUInt16LE(20);
  const channels = content.readUInt16LE(22);
  const sampleRate = content.readUInt32LE(24);
  const bitsPerSample = content.readUInt16LE(34);
  const dataOffset = content.indexOf('data', 36, 'ascii');

  if (dataOffset === -1) {
    throw new BadRequestException(
      'The WAV fixture does not contain audio data',
    );
  }

  const dataLength = content.readUInt32LE(dataOffset + 4);
  const data = content.subarray(dataOffset + 8, dataOffset + 8 + dataLength);

  if (
    audioFormat !== 1 ||
    sampleRate !== EXPECTED_SAMPLE_RATE ||
    channels !== EXPECTED_CHANNELS ||
    bitsPerSample !== EXPECTED_BITS_PER_SAMPLE
  ) {
    throw new BadRequestException(
      'The fixture must be 16-bit PCM, 16 kHz, with THEM and YOU stereo channels',
    );
  }

  return { sampleRate, channels, bitsPerSample, data };
}

function splitStereoFrame(
  frame: Buffer,
  bytesPerSample: number,
): { them: Buffer; you: Buffer } {
  const sampleCount = Math.floor(frame.length / (bytesPerSample * 2));
  const them = Buffer.alloc(sampleCount * bytesPerSample);
  const you = Buffer.alloc(sampleCount * bytesPerSample);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const sourceOffset = sample * bytesPerSample * 2;
    frame.copy(
      them,
      sample * bytesPerSample,
      sourceOffset,
      sourceOffset + bytesPerSample,
    );
    frame.copy(
      you,
      sample * bytesPerSample,
      sourceOffset + bytesPerSample,
      sourceOffset + bytesPerSample * 2,
    );
  }

  return { them, you };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
