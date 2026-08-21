pub const TARGET_SAMPLE_RATE: u32 = 16_000;
pub const FRAME_DURATION_MS: u32 = 100;
const SAMPLES_PER_FRAME: usize = (TARGET_SAMPLE_RATE as usize * FRAME_DURATION_MS as usize) / 1_000;

pub struct Pcm16kFramer {
    input_channels: usize,
    downsample_factor: usize,
    accumulated_sample: f32,
    accumulated_count: usize,
    pending_pcm: Vec<u8>,
}

impl Pcm16kFramer {
    pub fn new(input_sample_rate: u32, input_channels: u16) -> Result<Self, String> {
        if input_channels == 0 {
            return Err("audio input must have at least one channel".to_string());
        }

        if input_sample_rate < TARGET_SAMPLE_RATE
            || !input_sample_rate.is_multiple_of(TARGET_SAMPLE_RATE)
        {
            return Err(format!(
                "input sample rate {input_sample_rate} is unsupported; it must be a multiple of {TARGET_SAMPLE_RATE}",
            ));
        }

        Ok(Self {
            input_channels: input_channels as usize,
            downsample_factor: (input_sample_rate / TARGET_SAMPLE_RATE) as usize,
            accumulated_sample: 0.0,
            accumulated_count: 0,
            pending_pcm: Vec::with_capacity(SAMPLES_PER_FRAME * 2),
        })
    }

    pub fn push_f32(&mut self, samples: &[f32]) -> Result<Vec<Vec<u8>>, String> {
        if !samples.len().is_multiple_of(self.input_channels) {
            return Err("audio callback returned an incomplete multi-channel frame".to_string());
        }

        let mut frames = Vec::new();
        for input_frame in samples.chunks_exact(self.input_channels) {
            let mono = input_frame.iter().copied().sum::<f32>() / self.input_channels as f32;
            self.accumulated_sample += mono;
            self.accumulated_count += 1;

            if self.accumulated_count == self.downsample_factor {
                let sample = self.accumulated_sample / self.downsample_factor as f32;
                self.pending_pcm
                    .extend_from_slice(&to_i16(sample).to_le_bytes());
                self.accumulated_sample = 0.0;
                self.accumulated_count = 0;

                if self.pending_pcm.len() == SAMPLES_PER_FRAME * 2 {
                    frames.push(std::mem::take(&mut self.pending_pcm));
                    self.pending_pcm = Vec::with_capacity(SAMPLES_PER_FRAME * 2);
                }
            }
        }

        Ok(frames)
    }
}

fn to_i16(sample: f32) -> i16 {
    (sample.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16
}

#[cfg(test)]
mod tests {
    use super::{Pcm16kFramer, SAMPLES_PER_FRAME};

    #[test]
    fn converts_48khz_mono_to_16khz_pcm() {
        let mut framer = Pcm16kFramer::new(48_000, 1).unwrap();

        let frames = framer.push_f32(&[0.3, 0.6, 0.9]).unwrap();

        assert!(frames.is_empty());
        let frames = framer
            .push_f32(&vec![0.5; SAMPLES_PER_FRAME * 3 - 3])
            .unwrap();
        assert_eq!(frames.len(), 1);
        assert_eq!(frames[0].len(), SAMPLES_PER_FRAME * 2);
    }

    #[test]
    fn downmixes_multi_channel_input() {
        let mut framer = Pcm16kFramer::new(16_000, 2).unwrap();
        let samples = (0..SAMPLES_PER_FRAME)
            .flat_map(|_| [0.5, -0.5])
            .collect::<Vec<_>>();

        let frames = framer.push_f32(&samples).unwrap();

        assert_eq!(frames.len(), 1);
        assert_eq!(frames[0][0..2], [0, 0]);
    }

    #[test]
    fn rejects_sample_rates_that_need_fractional_resampling() {
        assert!(Pcm16kFramer::new(44_100, 1).is_err());
    }
}
