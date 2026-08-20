# cue-audio

Native audio sidecar for CUE. It owns local device access and PCM capture; it does
not call speech-to-text providers or make meeting decisions.

## Current milestone

The sidecar can enumerate input devices and capture a selected source while
reporting local-only metrics. It does not persist or transmit audio yet.

```bash
source "$HOME/.cargo/env"
cargo run -- list-devices
cargo run -- capture --device "MacBook Air Microphone" --seconds 10
cargo run -- capture --device "BlackHole 2ch" --seconds 10
```

On macOS, `BlackHole 2ch` is a virtual audio device that can expose call audio as
an input source. CUE will later send its PCM frames to the local NestJS engine as
the `THEM` channel. The microphone will map to the `YOU` channel.

## Next milestone

Add the authenticated local audio protocol to stream bounded PCM frames to
`cue-engine`, with timestamps, sequence numbers, channel labels, and explicit
backpressure.
