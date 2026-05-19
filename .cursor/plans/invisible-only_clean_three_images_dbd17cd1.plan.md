---
name: Invisible-only clean three images
overview: Add an invisible-only mode to the clean pipeline and run it on the three ai-secretagent images, avoiding the agentic (visible-watermark) loop and focusing on LSB, steganography, patterns, and metadata.
todos: []
isProject: false
---

# Plan: Invisible-only clean for three images

## Context

- **Agentic pipeline** ([src/cli_commands/agentic.py](src/cli_commands/agentic.py)): visible-only — `detect_visible_watermarks` → inpainting → verify → retry. No LSB/steganography. For invisible watermarks it has no effect; your instinct is correct.
- **Clean pipeline** ([src/cli_commands/clean.py](src/cli_commands/clean.py)): full detection (PNG chunks, steganography, visible watermarks, advanced_waste, sanitizer patterns), then a cleaning plan that can include both **visible** (inpainting) and **invisible** (LSB/sanitizer + `aggressive_lsb`). Invisible steps come from [SteganographySanitizer](src/cleaning/steganography_sanitizer.py) (lsb_natural, selective_clean, compression_cycle, etc.) and [aggressive_lsb_cleaning](src/cleaning/image_cleaner.py).

To “focus on invisible only” we should run the clean pipeline but **skip** visible watermark detection and removal so the plan never includes the inpainting step.

## 1. Add `--invisible-only` to the clean pipeline

- **CLI** ([src/cli.py](src/cli.py)): Add `--invisible-only` to the `clean` subparser; pass it into the clean command (e.g. store on `args` and forward).
- **Detection** ([src/cli_commands/clean.py](src/cli_commands/clean.py)): In `run_detection(image_path, quick=False, invisible_only=False)` when `invisible_only=True`:
  - Do **not** call `detect_visible_watermarks`.
  - Set `results["visible_watermarks"] = {}` (so no visible step is added later).
  - Keep all other detection (chunk_analysis, steganography, advanced_waste, sanitizer patterns).
- **Clean command**: `cmd_clean` calls `run_detection(..., invisible_only=args.invisible_only)` and then `clean_image(...)` unchanged. No change to `build_cleaning_plan` or `clean_image` is required; with no visible detections the plan will only contain sanitizer steps + `aggressive_lsb`.

Result: one CLI flag that makes `clean` run full invisible-related detection and only invisible cleaning (no inpainting of visible regions).

## 2. Run clean on the three images

From project root, run the clean pipeline with `--invisible-only` for each image. Use paths relative to project root so the skill’s “run from project root” requirement is satisfied.

| Input | Output (default) |
|-------|-------------------|
| `assets/dirty/ai-secretagent/monochrome_secret_playpus.png` | `assets/clean/monochrome_secret_playpus_cleaned.png` |
| `assets/dirty/ai-secretagent/secret_playtpus.png` | `assets/clean/secret_playtpus_cleaned.png` |
| `assets/dirty/ai-secretagent/spy_penguin.png` | `assets/clean/spy_penguin_cleaned.png` |

Optional: use `-o assets/clean/ai-secretagent/<stem>_cleaned.png` for each to keep outputs in an `ai-secretagent` subfolder under `assets/clean`.

Commands (PowerShell, project root):

```powershell
Set-Location "<workspace_root>"; python -m src.cli clean assets/dirty/ai-secretagent/monochrome_secret_playpus.png --invisible-only
Set-Location "<workspace_root>"; python -m src.cli clean assets/dirty/ai-secretagent/secret_playtpus.png --invisible-only
Set-Location "<workspace_root>"; python -m src.cli clean assets/dirty/ai-secretagent/spy_penguin.png --invisible-only
```

(With optional `-o` for each if you want outputs under `assets/clean/ai-secretagent/`.)

## 3. Verification

- After implementation: run the three commands and confirm outputs are written and detection logs show findings (e.g. steganography, patterns) and no visible watermark step.
- No automated tests required for this plan unless you want a quick test that `run_detection(..., invisible_only=True)` leaves `visible_watermarks` empty and that `build_cleaning_plan` then omits the visible step.

## Summary

- **Feedback**: Using the agentic loop for these images would not help invisible watermarks; using `clean` with invisible-only is the right approach.
- **Implementation**: Add `--invisible-only` so that `run_detection` skips visible watermark detection and the rest of the clean pipeline runs as today (invisible-only steps only).
- **Execution**: Run `python -m src.cli clean <path> --invisible-only` for each of the three images from the project root; optionally set `-o` to keep outputs under `assets/clean/ai-secretagent/`.
