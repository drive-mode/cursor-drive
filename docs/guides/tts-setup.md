# TTS Setup (Free, Local)

Drive supports three TTS backends. Easiest to hardest:

## 1. Web Speech (no install)

**Works when:** Drive panel or Agent Screen is open.

- Enable `cursorDrive.tts.enabled`
- Open the Drive panel (Activity Bar → Drive icon)
- TTS uses the webview's built-in speech; volume is controllable

## 2. OS native (say package)

**Requires:** `npm install` (say is an optional dependency)

- Enable `cursorDrive.tts.enabled`
- Set `cursorDrive.tts.backend` to `"say"` if you want OS-only
- Windows: uses SAPI; try `cursorDrive.tts.voice` = `"Microsoft Zira Desktop"` or `"Microsoft David Desktop"`
- macOS: try `"Alex"` or `"Samantha"`

## 3. Piper (free, local, better quality)

**Install:** Run **Drive: Setup Piper TTS** from the command palette.

1. Download [piper](https://github.com/rhasspy/piper/releases) (e.g. `piper_windows_amd64.zip` for Windows)
2. Extract and note the path to `piper.exe`
3. Download a voice from [piper-voices](https://huggingface.co/rhasspy/piper-voices) (e.g. `en_US-lessac-medium`)
4. Set in settings:
   - `cursorDrive.tts.piper.path` → full path to piper.exe
   - `cursorDrive.tts.piper.modelPath` → full path to the .onnx model
5. Set `cursorDrive.tts.backend` to `"piper"`
6. Enable `cursorDrive.tts.enabled`

**Fallback:** If Piper isn't configured, Drive falls back to webview then say.
