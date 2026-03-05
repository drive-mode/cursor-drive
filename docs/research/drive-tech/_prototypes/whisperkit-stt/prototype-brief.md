# Prototype Brief: WhisperKit On-Device STT

## Hypothesis

WhisperKit (or equivalent on-device STT) can provide sub-1s latency speech-to-text for Drive's voice pipeline, running entirely on the developer's machine with no cloud dependency, achieving ≤5% word error rate on programming-related dictation.

## Success Criteria (measurable)

1. STT module (`src/stt.ts`) provides a `transcribe()` function that accepts audio input and returns text.
2. End-to-end latency (audio capture → transcript available) is <1 second on a mid-range developer machine.
3. Word error rate on programming dictation corpus is ≤5%.
4. No audio data leaves the developer's machine (ADR-0005 compliance).
5. The STT module integrates with `src/pipeline.ts` as a new first stage.
6. Model file size is <500MB (acceptable for extension distribution).

## Minimal Implementation Steps

1. Evaluate WhisperKit JS bindings (or whisper.cpp WASM) for Node.js compatibility.
2. Create `src/stt.ts` with a provider abstraction: `SttProvider` interface with `transcribe(audio: Buffer): Promise<string>`.
3. Implement `WhisperKitProvider` that loads a quantized Whisper model and runs inference locally.
4. Add audio capture via VS Code's proposed `AudioInput` API (or browser MediaRecorder in webview).
5. Wire into `pipeline.ts` as the first stage (before filler cleaning).
6. Gate behind `cursorDrive.voice.sttEnabled` configuration flag.

## Instrumentation / Evals

- Measure latency per transcription (P50, P95, P99).
- Run WER benchmark on a curated programming dictation corpus (50 samples).
- Log model load time and memory usage.
- Compare against Web Speech API and OpenAI Realtime API (if available).

## Exit Criteria

| Outcome | Criteria | Next step |
|---------|----------|-----------|
| **Adopt WhisperKit** | All criteria met, WER ≤5%, latency <1s | Ship as default STT provider |
| **Switch to Realtime API** | WhisperKit too slow/large, but Realtime API meets criteria | Prototype Realtime API (different privacy implications) |
| **Reject both** | Neither meets latency/quality bar | Defer STT, rely on OS/browser STT |

## References

- `docs/research/drive-tech/other-relevant-tech/02_implementation.md` — STT implementation options
- ADR-0005: Privacy-Strict Default
- ADR-0012: Voice Input Integration
- WhisperKit paper: https://arxiv.org/abs/2507.10860
