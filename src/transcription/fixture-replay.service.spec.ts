import { BadRequestException } from '@nestjs/common';
import { parsePcmWav } from './fixture-replay.service';

describe('parsePcmWav', () => {
  it('reads a 16 kHz stereo PCM WAV fixture', () => {
    const content = createWavFixture({
      sampleRate: 16_000,
      channels: 2,
      bitsPerSample: 16,
    });

    expect(parsePcmWav(content)).toEqual(
      expect.objectContaining({
        sampleRate: 16_000,
        channels: 2,
        bitsPerSample: 16,
        data: Buffer.from([1, 2, 3, 4]),
      }),
    );
  });

  it('rejects a WAV fixture with an unexpected format', () => {
    const content = createWavFixture({
      sampleRate: 48_000,
      channels: 2,
      bitsPerSample: 16,
    });

    expect(() => parsePcmWav(content)).toThrow(BadRequestException);
  });
});

function createWavFixture({
  sampleRate,
  channels,
  bitsPerSample,
}: {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}): Buffer {
  const data = Buffer.from([1, 2, 3, 4]);
  const content = Buffer.alloc(44 + data.length);

  content.write('RIFF', 0, 'ascii');
  content.writeUInt32LE(content.length - 8, 4);
  content.write('WAVE', 8, 'ascii');
  content.write('fmt ', 12, 'ascii');
  content.writeUInt32LE(16, 16);
  content.writeUInt16LE(1, 20);
  content.writeUInt16LE(channels, 22);
  content.writeUInt32LE(sampleRate, 24);
  content.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  content.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  content.writeUInt16LE(bitsPerSample, 34);
  content.write('data', 36, 'ascii');
  content.writeUInt32LE(data.length, 40);
  data.copy(content, 44);

  return content;
}
