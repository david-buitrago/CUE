mod pcm;

use std::{
    env,
    process::ExitCode,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
        mpsc::{self, SyncSender, TrySendError},
    },
    thread,
    time::{Duration, Instant},
};

use cpal::{
    Device, SampleFormat, Stream,
    traits::{DeviceTrait, HostTrait, StreamTrait},
};
use pcm::Pcm16kFramer;
use tungstenite::{Message, client::ClientRequestBuilder, connect};

#[derive(Default)]
struct CaptureMetrics {
    callbacks: AtomicU64,
    samples: AtomicU64,
    peak_milli: AtomicU64,
    pcm_frames: AtomicU64,
    dropped_pcm_frames: AtomicU64,
}

impl CaptureMetrics {
    fn record_f32(&self, samples: &[f32]) {
        self.record(samples.iter().map(|sample| sample.abs()));
    }

    fn record_i16(&self, samples: &[i16]) {
        self.record(
            samples
                .iter()
                .map(|sample| *sample as f32 / i16::MAX as f32),
        );
    }

    fn record_u16(&self, samples: &[u16]) {
        self.record(
            samples
                .iter()
                .map(|sample| (*sample as f32 - 32_768.0) / 32_768.0),
        );
    }

    fn record(&self, samples: impl Iterator<Item = f32>) {
        let mut peak = 0.0_f32;
        let mut count = 0_u64;

        for sample in samples {
            peak = peak.max(sample.abs());
            count += 1;
        }

        self.callbacks.fetch_add(1, Ordering::Relaxed);
        self.samples.fetch_add(count, Ordering::Relaxed);
        self.peak_milli
            .fetch_max((peak.clamp(0.0, 1.0) * 1_000.0) as u64, Ordering::Relaxed);
    }
}

fn main() -> ExitCode {
    match run(env::args().skip(1).collect()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("cue-audio: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run(arguments: Vec<String>) -> Result<(), String> {
    match arguments.first().map(String::as_str) {
        Some("list-devices") => list_devices(),
        Some("capture") => capture(&arguments[1..]),
        Some("stream") => stream(&arguments[1..]),
        _ => {
            print_usage();
            Err("expected `list-devices`, `capture`, or `stream`".to_string())
        }
    }
}

fn list_devices() -> Result<(), String> {
    let host = cpal::default_host();
    let default_input = host.default_input_device().map(|device| device.to_string());

    println!("Input devices:");
    for device in host.input_devices().map_err(|error| error.to_string())? {
        let name = device.to_string();
        let marker = if default_input.as_deref() == Some(name.as_str()) {
            " (default)"
        } else {
            ""
        };
        let configuration = device
            .default_input_config()
            .map(|config| {
                format!(
                    "{} Hz, {} channel(s), {:?}",
                    config.sample_rate(),
                    config.channels(),
                    config.sample_format()
                )
            })
            .unwrap_or_else(|_| "no default input configuration".to_string());

        println!("- {name}{marker}: {configuration}");
    }

    Ok(())
}

fn capture(arguments: &[String]) -> Result<(), String> {
    let device_name = option_value(arguments, "--device");
    let duration_seconds = option_value(arguments, "--seconds")
        .map(|value| {
            value
                .parse::<u64>()
                .map_err(|_| "--seconds must be a whole number")
        })
        .transpose()?
        .unwrap_or(10);

    let host = cpal::default_host();
    let device = select_device(&host, device_name)?;
    let configuration = device
        .default_input_config()
        .map_err(|error| error.to_string())?;
    let metrics = Arc::new(CaptureMetrics::default());
    let stream = build_input_stream(&device, &configuration, Arc::clone(&metrics), None)?;

    println!(
        "Capturing `{}` for {duration_seconds}s: {} Hz, {} channel(s), {:?}",
        device,
        configuration.sample_rate(),
        configuration.channels(),
        configuration.sample_format(),
    );
    println!("Raw audio remains local. This command only reports capture metrics.");

    stream.play().map_err(|error| error.to_string())?;
    let started_at = Instant::now();
    while started_at.elapsed() < Duration::from_secs(duration_seconds) {
        thread::sleep(Duration::from_secs(1));
        println!(
            "{}s: callbacks={}, samples={}, pcm_frames={}, peak={:.3}",
            started_at.elapsed().as_secs(),
            metrics.callbacks.load(Ordering::Relaxed),
            metrics.samples.load(Ordering::Relaxed),
            metrics.pcm_frames.load(Ordering::Relaxed),
            metrics.peak_milli.load(Ordering::Relaxed) as f32 / 1_000.0,
        );
    }

    Ok(())
}

fn stream(arguments: &[String]) -> Result<(), String> {
    let meeting_id = required_option(arguments, "--meeting-id")?;
    let channel = required_option(arguments, "--channel")?;
    if channel != "YOU" && channel != "THEM" {
        return Err("--channel must be YOU or THEM".to_string());
    }
    let device_name = required_option(arguments, "--device")?;
    let token =
        env::var("CUE_AUDIO_SESSION_TOKEN").map_err(|_| "CUE_AUDIO_SESSION_TOKEN must be set")?;
    let engine_url = option_value(arguments, "--engine-url").unwrap_or("ws://127.0.0.1:3000/audio");
    let seconds = option_value(arguments, "--seconds")
        .unwrap_or("30")
        .parse::<u64>()
        .map_err(|_| "--seconds must be a whole number")?;
    let host = cpal::default_host();
    let device = select_device(&host, Some(device_name))?;
    let configuration = device
        .default_input_config()
        .map_err(|error| error.to_string())?;
    let metrics = Arc::new(CaptureMetrics::default());
    let (sender, receiver) = mpsc::sync_channel(20);
    let input_stream =
        build_input_stream(&device, &configuration, Arc::clone(&metrics), Some(sender))?;
    let request = ClientRequestBuilder::new(
        engine_url
            .parse()
            .map_err(|error| format!("invalid --engine-url: {error}"))?,
    )
    .with_header("Authorization", format!("Bearer {token}"));
    let (mut socket, _) = connect(request).map_err(|error| error.to_string())?;
    socket.send(Message::Text(serde_json::json!({"type":"start","protocol":"cue-audio-v1","meetingId":meeting_id,"streams":[{"channel":channel,"sampleRate":16000,"channels":1,"encoding":"pcm_s16le"}]}).to_string().into())).map_err(|error| error.to_string())?;
    wait_until_engine_starts(&mut socket)?;
    input_stream.play().map_err(|error| error.to_string())?;
    let started = Instant::now();
    let mut sequence = 0_u32;
    while started.elapsed() < Duration::from_secs(seconds) {
        if let Ok(pcm) = receiver.recv_timeout(Duration::from_millis(100)) {
            socket
                .send(Message::Binary(encode_frame(channel, sequence, pcm).into()))
                .map_err(|error| error.to_string())?;
            sequence = sequence.wrapping_add(1);
        }
    }
    socket
        .send(Message::Text(
            serde_json::json!({"type":"commit","channel":channel})
                .to_string()
                .into(),
        ))
        .map_err(|error| error.to_string())?;
    socket
        .send(Message::Text(
            serde_json::json!({"type":"stop"}).to_string().into(),
        ))
        .map_err(|error| error.to_string())?;
    socket.close(None).map_err(|error| error.to_string())?;
    println!(
        "Sent {sequence} frame(s); dropped {} due to local backpressure.",
        metrics.dropped_pcm_frames.load(Ordering::Relaxed)
    );
    Ok(())
}

fn option_value<'a>(arguments: &'a [String], option: &str) -> Option<&'a str> {
    arguments
        .windows(2)
        .find(|pair| pair[0] == option)
        .map(|pair| pair[1].as_str())
}

fn required_option<'a>(arguments: &'a [String], option: &str) -> Result<&'a str, String> {
    option_value(arguments, option).ok_or_else(|| format!("{option} is required"))
}

fn select_device(host: &cpal::Host, requested_name: Option<&str>) -> Result<Device, String> {
    if let Some(requested_name) = requested_name {
        return host
            .input_devices()
            .map_err(|error| error.to_string())?
            .find(|device| device.to_string() == requested_name)
            .ok_or_else(|| format!("input device `{requested_name}` was not found"));
    }

    host.default_input_device()
        .ok_or_else(|| "no default input device is available".to_string())
}

fn build_input_stream(
    device: &Device,
    configuration: &cpal::SupportedStreamConfig,
    metrics: Arc<CaptureMetrics>,
    sender: Option<SyncSender<Vec<u8>>>,
) -> Result<Stream, String> {
    match configuration.sample_format() {
        SampleFormat::F32 => {
            let mut framer =
                Pcm16kFramer::new(configuration.sample_rate(), configuration.channels())?;
            device
                .build_input_stream(
                    configuration.config(),
                    move |data: &[f32], _| {
                        metrics.record_f32(data);
                        match framer.push_f32(data) {
                            Ok(frames) => {
                                metrics
                                    .pcm_frames
                                    .fetch_add(frames.len() as u64, Ordering::Relaxed);
                                enqueue_frames(&sender, &metrics, frames);
                            }
                            Err(error) => eprintln!("cue-audio PCM conversion error: {error}"),
                        }
                    },
                    report_stream_error,
                    None,
                )
                .map_err(|error| error.to_string())
        }
        SampleFormat::I16 => device
            .build_input_stream(
                configuration.config(),
                move |data: &[i16], _| metrics.record_i16(data),
                report_stream_error,
                None,
            )
            .map_err(|error| error.to_string()),
        SampleFormat::U16 => device
            .build_input_stream(
                configuration.config(),
                move |data: &[u16], _| metrics.record_u16(data),
                report_stream_error,
                None,
            )
            .map_err(|error| error.to_string()),
        sample_format => Err(format!(
            "unsupported input sample format: {sample_format:?}"
        )),
    }
}

fn enqueue_frames(
    sender: &Option<SyncSender<Vec<u8>>>,
    metrics: &CaptureMetrics,
    frames: Vec<Vec<u8>>,
) {
    let Some(sender) = sender else {
        return;
    };
    for frame in frames {
        match sender.try_send(frame) {
            Ok(()) => {}
            Err(TrySendError::Full(_)) => {
                metrics.dropped_pcm_frames.fetch_add(1, Ordering::Relaxed);
            }
            Err(TrySendError::Disconnected(_)) => return,
        }
    }
}

fn encode_frame(channel: &str, sequence: u32, pcm: Vec<u8>) -> Vec<u8> {
    let mut frame = Vec::with_capacity(pcm.len() + 5);
    frame.push(if channel == "YOU" { 1 } else { 2 });
    frame.extend_from_slice(&sequence.to_be_bytes());
    frame.extend_from_slice(&pcm);
    frame
}

fn wait_until_engine_starts(
    socket: &mut tungstenite::WebSocket<tungstenite::stream::MaybeTlsStream<std::net::TcpStream>>,
) -> Result<(), String> {
    match socket.read().map_err(|error| error.to_string())? {
        Message::Text(message) => {
            let response: serde_json::Value =
                serde_json::from_str(&message).map_err(|error| error.to_string())?;

            if response.get("type").and_then(serde_json::Value::as_str) == Some("started") {
                Ok(())
            } else {
                Err(format!("engine did not start the audio stream: {response}"))
            }
        }
        message => Err(format!(
            "engine returned an unexpected WebSocket message: {message:?}"
        )),
    }
}

fn report_stream_error(error: cpal::Error) {
    eprintln!("cue-audio input stream error: {error}");
}

fn print_usage() {
    eprintln!("Usage:");
    eprintln!("  cue-audio list-devices");
    eprintln!("  cue-audio capture [--device <name>] [--seconds <whole-number>]");
    eprintln!(
        "  cue-audio stream --meeting-id <id> --channel <YOU|THEM> --device <name> [--engine-url <url>] [--seconds <whole-number>]"
    );
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::Ordering;

    use super::{CaptureMetrics, option_value};

    #[test]
    fn reads_the_value_following_a_named_option() {
        let arguments = vec![
            "--device".to_string(),
            "BlackHole 2ch".to_string(),
            "--seconds".to_string(),
            "10".to_string(),
        ];

        assert_eq!(option_value(&arguments, "--device"), Some("BlackHole 2ch"));
        assert_eq!(option_value(&arguments, "--seconds"), Some("10"));
    }

    #[test]
    fn returns_none_when_an_option_has_no_value() {
        let arguments = vec!["--device".to_string()];

        assert_eq!(option_value(&arguments, "--device"), None);
    }

    #[test]
    fn records_sample_count_and_peak() {
        let metrics = CaptureMetrics::default();

        metrics.record_f32(&[0.1, -0.75, 0.25]);

        assert_eq!(metrics.callbacks.load(Ordering::Relaxed), 1);
        assert_eq!(metrics.samples.load(Ordering::Relaxed), 3);
        assert_eq!(metrics.peak_milli.load(Ordering::Relaxed), 750);
    }
}
