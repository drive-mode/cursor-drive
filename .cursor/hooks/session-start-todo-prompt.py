#!/usr/bin/env python3
"""Session-start hook that injects a reminder to create detailed todo tasks when building plans.

Runs on sessionStart. Reads JSON from stdin (session_id, etc.) and prints JSON with
additional_context so the agent receives the instruction at conversation start.

Output contract (Cursor sessionStart): { "additional_context": "<string>" }
"""

import json
import sys

ADDITIONAL_CONTEXT = """When building a plan, always create detailed todo tasks. Break work into clear, actionable steps and list them as todos (e.g. in a plan artifact or TodoWrite) so progress is trackable and completable."""


def main() -> int:
    try:
        raw = sys.stdin.read()
        if raw.strip():
            json.loads(raw)  # validate input, then ignore
    except (json.JSONDecodeError, ValueError):
        pass  # fire-and-forget; still emit context
    out = {"additional_context": ADDITIONAL_CONTEXT}
    print(json.dumps(out), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
