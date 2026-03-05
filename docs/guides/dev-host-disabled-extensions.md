# Disabled Extensions in Dev Host

## What we disable

When launching the Extension Development Host (F5 → "Dev: Drive in sandbox" or "Dev: Drive in repo root"), we pass:

- `--disable-extension=anysphere.cursor-socket`
- `--disable-extension=anysphere.cursor-resolver-helper`

## Why

These are **Cursor built-in extensions** that ship with Cursor. On some installs they are broken or missing their compiled output, causing:

```
Activating extension 'anysphere.cursor-resolver-helper' failed: Cannot find module
'...\cursor-resolver-helper\out\main'
```

When that happens, the extension host fails to start and Drive cannot load. We don't need these extensions for Drive development, so we disable them to avoid the failure.

## Where it's configured

- `.vscode/launch.json` — both "Dev: Drive in sandbox" and "Dev: Drive in repo root"
- `scripts/reinstall-extension.mjs` — `launchDevSandbox()` when using `--dev-sandbox`

## If you see the error in the main Cursor window

The error can also appear when opening the workspace in the **main** Cursor window (not the Extension Development Host). In that case:

1. **Use F5** — Launch "Dev: Drive in sandbox" or "Dev: Drive in repo root" from the Run panel. The dev host disables these extensions.
2. **Or disable manually** — In the Extensions panel, find "Cursor Resolver Helper" and "Cursor Socket", then disable them. You can re-enable after repairing Cursor.
3. **Repair Cursor** — Reinstall or repair Cursor from [cursor.com](https://cursor.com); the built-ins may then load correctly.

## Removing the workaround

If you reinstall or repair Cursor from [cursor.com](https://cursor.com) and the built-ins load correctly, you can remove the `--disable-extension=...` flags from both places. The dev host will then load those extensions if they work.
