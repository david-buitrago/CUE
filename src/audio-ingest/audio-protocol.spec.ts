import {
  AUDIO_PROTOCOL_VERSION,
  createAudioFrame,
  parseAudioControlMessage,
  parseAudioFrame,
} from './audio-protocol';

describe('audio protocol', () => {
  it('parses a valid start message', () => {
    const message = parseAudioControlMessage(
      JSON.stringify({
        type: 'start',
        protocol: AUDIO_PROTOCOL_VERSION,
        meetingId: 'meeting-123',
        streams: [
          {
            channel: 'YOU',
            sampleRate: 16_000,
            channels: 1,
            encoding: 'pcm_s16le',
          },
          {
            channel: 'THEM',
            sampleRate: 16_000,
            channels: 1,
            encoding: 'pcm_s16le',
          },
        ],
      }),
    );

    expect(message).toMatchObject({
      type: 'start',
      meetingId: 'meeting-123',
      streams: [{ channel: 'YOU' }, { channel: 'THEM' }],
    });
  });

  it('rejects an unsupported audio format', () => {
    expect(() =>
      parseAudioControlMessage(
        JSON.stringify({
          type: 'start',
          protocol: AUDIO_PROTOCOL_VERSION,
          meetingId: 'meeting-123',
          streams: [
            {
              channel: 'YOU',
              sampleRate: 48_000,
              channels: 1,
              encoding: 'pcm_s16le',
            },
          ],
        }),
      ),
    ).toThrow('16 kHz, mono, signed 16-bit little-endian PCM');
  });

  it('round-trips a binary PCM frame', () => {
    const encoded = createAudioFrame({
      channel: 'THEM',
      sequence: 42,
      pcm: new Uint8Array([1, 2, 3, 4]),
    });

    expect(parseAudioFrame(encoded)).toEqual({
      channel: 'THEM',
      sequence: 42,
      pcm: new Uint8Array([1, 2, 3, 4]),
    });
  });
});
