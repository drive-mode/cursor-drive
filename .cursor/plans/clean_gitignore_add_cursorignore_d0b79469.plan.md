---
name: Clean gitignore add cursorignore
overview: Deduplicate and fix `.gitignore`, then add a new `.cursorignore` so Cursor indexes only useful project files and excludes build output, dependencies, and secrets.
todos: []
isProject: false
---

# Clean .gitignore and add .cursorignore

## 1. Clean [.gitignore](.gitignore)

**Issues in current file:**
- **Duplicates:** `.DS_Store`, `Thumbs.db`, `*.swp`, `*.swo`, `.idea/` each appear twice (lines 21–22 and 38–39, 29–30 and 51–52).
- **Invalid line:** `//` on line 49 (no effect in gitignore, remove as noise).
- **Redundant section headers:** "OS" and "IDE / editor" both list `.DS_Store` and `Thumbs.db`; consolidate into a single "OS" block and one "IDE / editor" block without repeating those two.

**Proposed structure (single pass, no duplicates):**

- **Build / runtime (project-specific):** `out/`, `node_modules/`, `*.vsix`, `.vscode-test/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo`, `coverage/`
- **.cursor (project-specific):** `.cursor/plans/.plan-frontmatter-hash`, `.cursor/drive-bridge.json`, `.cursor/debug-*.log`, `sandbox/.cursor/`, `.cursor/hooks/__pycache__/`, `.cursor/plans/archive/`
- **OS:** `.DS_Store`, `Thumbs.db`
- **IDE / editor:** `.vscode/`, `.idea/`, `*.sublime*`, `*.code-workspace`, `*.swp`, `*.swo`, `*.viminfo`, `*.bak`, `*~`, `*.user`, `.history/`, `*.log`, `*.pid`, `.cache/`, `*.orig`
- **Secrets / privacy:** `secrets.json`, `secrets.*.json`, `private.*`, `identity.*`, `tokens.*`, `auth.*`, `/.logs/`, `.env`, `.env.local`, `.env.*.local`
- **Local / misc:** `scripts/`, `.logs` (keep as-is if you intend scripts to stay untracked; otherwise remove `scripts/` so the scripts dir is tracked)

**Optional:** Shorten or drop inline comments on individual lines; keep only section comments to reduce clutter.

---

## 2. Add [.cursorignore](.cursorignore) (new file)

**Purpose:** Exclude files from Cursor’s context/index so the AI sees only source, config, and docs—not build artifacts, dependencies, or secrets.

**Recommended patterns (aligned with .gitignore where it helps indexing):**

| Category | Patterns |
|----------|----------|
| Dependencies / build | `node_modules/`, `out/`, `*.tsbuildinfo`, `coverage/`, `.vscode-test/`, `playwright-report/`, `test-results/`, `*.vsix` |
| Runtime / generated | `.cursor/drive-bridge.json`, `.cursor/debug-*.log`, `.cursor/plans/.plan-frontmatter-hash`, `.cursor/plans/archive/`, `.cursor/hooks/__pycache__/`, `sandbox/` |
| Secrets / env | `.env`, `.env.*`, `secrets.json`, `secrets.*.json`, `private.*`, `identity.*`, `tokens.*`, `auth.*` |
| Logs / caches | `*.log`, `.cache/`, `.logs`, `/.logs/` |
| IDE / OS cruft | `.DS_Store`, `Thumbs.db`, `.history/` |

**Intentional differences from .gitignore:**
- **Do not** ignore the whole `.cursor/` tree: keep `.cursor/rules/`, `.cursor/plans/*.plan.md`, `.cursor/skills/`, and similar so Cursor can use rules and plans.
- **Do** ignore only the listed `.cursor/` paths above (runtime and generated).
- **Optional:** Add `package-lock.json` if you want to keep it out of context (large, rarely needed for edits). Not required.

No section comments needed in `.cursorignore` unless you want them for readability; patterns alone are fine.

---

## Summary

- **.gitignore:** One pass to remove duplicates and the `//` line, group into the sections above, and optionally trim inline comments.
- **.cursorignore:** New file with the patterns above so Cursor indexes source and important config while excluding build output, deps, secrets, and generated/runtime `.cursor` files.

**Open choice:** Keep `scripts/` in `.gitignore` (current behavior) or remove it so `scripts/` (and [scripts/README.md](scripts/README.md)) are tracked. Say which you prefer when implementing.
