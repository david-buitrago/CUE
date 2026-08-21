import type { AudioChannel } from '../transcription/live-transcript';

export const AUDIO_PROTOCOL_VERSION = 'cue-audio-v1';
export const PCM_SAMPLE_RATE = 16_000;

const CHANNEL_BY_CODE: Record<number, AudioChannel | undefined> = {
  1: 'YOU',
  2: 'THEM',
};

const CODE_BY_CHANNEL: Record<AudioChannel, number> = {
  YOU: 1,
  THEM: 2,
};

export interface AudioStreamDescription {
  channel: AudioChannel;
  sampleRate: number;
  channels: number;
  encoding: 'pcm_s16le';
}

export interface AudioStartMessage {
  type: 'start';
  protocol: typeof AUDIO_PROTOCOL_VERSION;
  meetingId: string;
  streams: AudioStreamDescription[];
}

export interface AudioCommitMessage {
  type: 'commit';
  channel: AudioChannel;
}

export interface AudioStopMessage {
  type: 'stop';
}

export type AudioControlMessage =
  AudioStartMessage | AudioCommitMessage | AudioStopMessage;

export interface AudioFrame {
  channel: AudioChannel;
  sequence: number;
  pcm: Uint8Array;
}

export function parseAudioControlMessage(text: string): AudioControlMessage {
  const value: unknown = JSON.parse(text);

  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new Error('Audio control message must contain a type');
  }

  if (value.type === 'start') {
    return parseStartMessage(value);
  }

  if (value.type === 'commit') {
    if (!isAudioChannel(value.channel)) {
      throw new Error('Audio commit message must contain a valid channel');
    }

    return { type: 'commit', channel: value.channel };
  }

  if (value.type === 'stop') {
    return { type: 'stop' };
  }

  throw new Error(`Unsupported audio control message type: ${value.type}`);
}

export function parseAudioFrame(data: Uint8Array): AudioFrame {
  const headerLength = 5;

  if (data.byteLength <= headerLength) {
    throw new Error('Audio frame must contain a header and PCM payload');
  }

  const channel = CHANNEL_BY_CODE[data[0]];
  if (!channel) {
    throw new Error(`Audio frame contains an unknown channel code: ${data[0]}`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const sequence = view.getUint32(1, false);

  return { channel, sequence, pcm: data.slice(headerLength) };
}

export function createAudioFrame(frame: AudioFrame): Uint8Array {
  const data = new Uint8Array(frame.pcm.byteLength + 5);
  const view = new DataView(data.buffer);

  data[0] = CODE_BY_CHANNEL[frame.channel];
  view.setUint32(1, frame.sequence, false);
  data.set(frame.pcm, 5);

  return data;
}

function parseStartMessage(value: Record<string, unknown>): AudioStartMessage {
  if (
    value.protocol !== AUDIO_PROTOCOL_VERSION ||
    typeof value.meetingId !== 'string' ||
    value.meetingId.length === 0 ||
    !Array.isArray(value.streams) ||
    value.streams.length === 0
  ) {
    throw new Error('Audio start message is invalid');
  }

  const streams = value.streams.map(parseStreamDescription);
  const channels = new Set(streams.map((stream) => stream.channel));

  if (channels.size !== streams.length) {
    throw new Error(
      'Audio start message cannot declare a channel more than once',
    );
  }

  return {
    type: 'start',
    protocol: AUDIO_PROTOCOL_VERSION,
    meetingId: value.meetingId,
    streams,
  };
}

function parseStreamDescription(value: unknown): AudioStreamDescription {
  if (
    !isRecord(value) ||
    !isAudioChannel(value.channel) ||
    value.sampleRate !== PCM_SAMPLE_RATE ||
    value.channels !== 1 ||
    value.encoding !== 'pcm_s16le'
  ) {
    throw new Error(
      'Audio streams must be 16 kHz, mono, signed 16-bit little-endian PCM',
    );
  }

  return {
    channel: value.channel,
    sampleRate: value.sampleRate,
    channels: value.channels,
    encoding: value.encoding,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAudioChannel(value: unknown): value is AudioChannel {
  return value === 'YOU' || value === 'THEM';
}
