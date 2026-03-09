---
name: hh-setup
overview: Fix package installation and .env typos to get the hh Discord bot running locally and test suite passing.
todos: []
isProject: false
---

# HH Setup Plan

## Purpose
The `hh` Discord bot is currently failing to start and all tests are failing due to a ghost editable installation pointing to a non-existent directory (`C:\Users\harri\Documents\Coding Projects\fun\hh`). Additionally, the `.env` file contains several typos (missing 'c' characters) that prevent the configuration from loading the required `HH_DISCORD_TOKEN`. This plan will fix the installation, correct the environment variables, and verify the bot runs.

## Phase overview

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **1** | Environment Fixes | Correct `.env` typos, reinstall `hh` package |
| **2** | Verification | All tests pass, bot connects to Discord |

## Dependency notes
- Requires the Python virtual environment to be active (already seems to be the case via `.venv` or global).
- Requires a valid Discord bot token in the `.env` file.

## TODO detail

### id: fix-env
Fix the missing 'c' character typos in the `.env` file at the root of `business/roller_ai/hh`. 
- `onfig` -> `config`
- `ommit` -> `commit`
- `HH_DISORD_TOKEN` -> `HH_DISCORD_TOKEN`
- `HH_DISORD_OAUTH_URL` -> `HH_DISCORD_OAUTH_URL`
- `disord.om` -> `discord.com`
- `lient_id` -> `client_id`
- `sope` -> `scope`

### id: pip-install
Run `pip install -e ".[dev]"` in the `business/roller_ai/hh` directory. This will overwrite the broken editable installation (which currently points to the `fun/hh` path) and correctly link the `hh` module to the current workspace, resolving the `ModuleNotFoundError`.

### id: verify-tests
Run the test suite using `python -m pytest tests/ -q` to confirm that all 13 test modules are now importable and passing successfully.

### id: run-bot
Start the bot using `python -m hh.adapters.discord.runner` (or the `hh` CLI command) to confirm it boots without `HHConfigError` and successfully connects to Discord.