# README.md Redesign Plan

**Superseded by:** [.cursor/plans/readme-redesign.plan.md](../../.cursor/plans/readme-redesign.plan.md) — the canonical plan with todos and plan-graph registration.

**Based on:** Subagent review of [claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python), [claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos), [claude-code](https://github.com/anthropics/claude-code), [copilot-sdk](https://github.com/github/copilot-sdk), [anthropics/skills](https://github.com/anthropics/skills).

**Goal:** Build a root-level README that matches the quality and structure of popular agent/SDK repos while reflecting Cursor Drive's unique value (voice-first, multi-operator, Cursor IDE extension).

---

## 1. Benchmark Findings (Synthesis)

| Repo | Length | Structure | Tagline | Install | Visual | FAQ |
|------|--------|-----------|---------|---------|--------|-----|
| claude-agent-sdk-python | ~1,050 words | Install → Quick Start → API → Types → Errors → Examples → Dev → License | One-liner + docs link | pip, Python 3.10+ | None | No |
| claude-agent-sdk-demos | ~450 words | Banner → Catalog → Quick Start → Prereqs → Steps → Resources → License | One sentence | Clone → pick demo | None | No |
| claude-code | ~75 lines | Title → Tagline → Get started → Plugins → Bug → Discord → Privacy | 2-sentence value prop | curl/brew/winget | None | No |
| copilot-sdk | ~130 lines | Badges → Tagline → SDK table → Getting Started → Architecture → FAQ → Links | "Agents for every app" | CLI + SDK per language | ASCII diagram | 10+ Q&As |
| anthropics/skills | ~400 words | What → About → Skill Sets → Try it → Create → Partners | One sentence + examples | Plugin marketplace | None | No |

**Common patterns:**
- **Install-first or near-top:** All repos put installation within the first 2–3 sections.
- **Quick Start / Try it:** Minimal runnable example or "go here, do this."
- **Link-heavy:** Defer depth to external docs; README is a hub.
- **No TOC in most:** Only long READMEs (claude-agent-sdk-python) would benefit.
- **Architecture diagram:** Copilot SDK uses a simple ASCII flow; others skip.
- **FAQ:** Only Copilot SDK has a substantial FAQ; others use Support/Resources links.
- **Tone:** Technical, direct, minimal marketing. Developer-focused.

---

## 2. Proposed Section Order and Rationale

| Order | Section | Rationale |
|-------|---------|-----------|
| 1 | **Title + tagline** | Match claude-code/copilot-sdk: one strong value proposition. |
| 2 | **Badges** (optional) | Build status, license, version — if CI and package.json support. |
| 3 | **The idea in one interaction** | Keep current mermaid flowchart; it differentiates Drive. Move up so readers see "what" before "how." |
| 4 | **Installation** | Move up from current position. All benchmark repos put install early. |
| 5 | **Quick Start** | 3–4 steps: clone → install → compile → F5. Single code block. |
| 6 | **Architecture** | Keep ASCII box diagram; add 1–2 sentence summary. Consider a second, simpler diagram (like Copilot's `App → SDK → CLI`). |
| 7 | **Key features / design decisions** | Condense current "Key design decisions" into a scannable list or table. |
| 8 | **Source modules** | Keep table; consider moving to `docs/architecture/` and linking, or keep as "what's inside" for contributors. |
| 9 | **Multi-agent / Tangent flow** | Keep; it's a differentiator. Optionally simplify to a short bullet list + link to PRD. |
| 10 | **Documentation** | Keep table; ensure links are current. |
| 11 | **PRDs** | Keep or move to Documentation table as a row. |
| 12 | **Status** | Keep; useful for contributors. Consider moving to CONTRIBUTING or a separate STATUS.md. |
| 13 | **Support / Contributing** | Add: link to CONTRIBUTING.md, GitHub Issues, docs index. |
| 14 | **License** | Add if missing. |

---

## 3. Section-by-Section Specification

### 3.1 Title + Tagline (H1 + paragraph)

**Current:** Good. One sentence covers voice-first, multi-operator, Agent Screen, steer via voice/chat.

**Plan:**
- Keep H1: `# Cursor Drive`
- Refine tagline to match benchmark length (1–2 sentences max). Example:
  > **A voice-first, multi-operator pair-programming layer for Cursor IDE.** Steer operators via voice and chat; they share the Agent Screen. No cloud, no accounts.
- Add optional badges below tagline: `![Build](...)` `![License](...)` if available.

---

### 3.2 The idea in one interaction

**Current:** Mermaid flowchart (You → Drive → Alpha, Beta → You). Intro sentence about prompt submission.

**Plan:**
- Keep flowchart; it's simple and effective.
- Shorten intro to one line: "One utterance → main task + parallel tangent → replies back to you."
- Remove or soften "not the status bar" if we want to avoid negative framing (or keep for clarity).

---

### 3.3 Installation

**Current:** At bottom, 4-line bash block + F5 note.

**Plan:**
- Move to position 3 or 4 (after tagline/idea).
- Add **Prerequisites** line: "Node 20+, npm, Cursor IDE."
- Keep code block; add one-line post-install: "Press F5 in Cursor to launch Extension Development Host."
- Link to `docs/guides/getting-started.md` for full dev loop.

---

### 3.4 Quick Start

**Current:** Embedded in Installation.

**Plan:**
- Split into dedicated **Quick Start** section.
- 3–4 numbered steps:
  1. Clone and install
  2. `npm run compile`
  3. Press F5 in Cursor
  4. Toggle Drive (or first-run prompt)
- Single code block for steps 1–2.
- One sentence: "See [getting-started](link) for the full dev loop."

---

### 3.5 Architecture

**Current:** ASCII box diagram + one paragraph on MCP.

**Plan:**
- Keep ASCII diagram; it's detailed and accurate.
- Add a **one-line summary** above: "Drive is a Cursor extension + `.cursor/` plugin layer, bridged by an MCP server."
- Consider adding a **second, minimal diagram** (Mermaid flowchart) for data flow: `User prompt → beforeSubmitPrompt hook → pipeline → Cursor native mode`. Optional; only if it clarifies without duplicating.
- Link to `docs/architecture/README.md` for component map and ADRs.

---

### 3.6 Key features / design decisions

**Current:** Four bullet paragraphs (no cloud, config-first, Cursor-native, concise-first).

**Plan:**
- Convert to a **table** for scannability (like Copilot SDK's FAQ or our Source modules table):

| Principle | What it means |
|-----------|---------------|
| No cloud | TTS, filler cleaning, MCP run locally. ElevenLabs optional. |
| Config-first | Every behavior is a setting. Privacy-strict defaults. |
| Cursor-native | Wraps Agent/Plan/Ask/Debug; `beforeSubmitPrompt` is primary entry. |
| Concise-first | Summarizes, tells you where things went, waits. |

- Or keep as short bullets; table is optional.
- Link to config schema and ADR-0008.

---

### 3.7 Source modules

**Current:** 14-row table. Useful for contributors.

**Plan:**
- **Option A:** Keep in README (good for contributors scanning the repo).
- **Option B:** Move to `docs/architecture/README.md` or `src/README.md`; replace with link: "See [source module map](link) for what each file does."
- **Recommendation:** Keep; it's a differentiator and helps contributors. Ensure it stays up to date.

---

### 3.8 Multi-agent / Tangent flow

**Current:** Text script with `/tangent`, `/switch`, `/merge`.

**Plan:**
- Keep; it's a key differentiator.
- Optionally add a **one-line intro**: "Spawn parallel operators, switch focus, merge context."
- Consider a **mini Mermaid flowchart** for tangent flow: `You → /tangent → Beta spawned → /switch → Beta foreground → /merge → Beta into Alpha`. Optional.
- Link to `docs/prd/prd-multi-agent.md` for full spec.

---

### 3.9 Documentation

**Current:** Table with 8 rows.

**Plan:**
- Keep table.
- Add row for CONTRIBUTING if not present.
- Ensure all links resolve.
- Consider grouping: "Guides" | "Reference" | "Architecture" | "PRDs".

---

### 3.10 PRDs

**Current:** Separate section with 5-row table.

**Plan:**
- **Option A:** Merge into Documentation table as a "PRDs" row linking to `docs/prd/README.md`.
- **Option B:** Keep as standalone section for visibility.
- **Recommendation:** Keep; PRDs are a differentiator for a requirements-driven project.

---

### 3.11 Status

**Current:** One paragraph on what works, what's pending.

**Plan:**
- Keep for contributor transparency.
- Consider moving to CONTRIBUTING.md or a `STATUS.md` if README length becomes an issue.
- Ensure it's updated when milestones change.

---

### 3.12 Support / Contributing

**Current:** Not present as a dedicated section.

**Plan:**
- Add section:
  - **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, PR workflow, and code quality.
  - **Issues:** [GitHub Issues](https://github.com/drive-mode/cursor-drive/issues) for bugs and feature requests.
  - **Docs:** [docs/README.md](docs/README.md) for the full doc index.

---

### 3.13 License

**Current:** Not present.

**Plan:**
- Add if the project has a LICENSE file. Common: "MIT" or "Apache-2.0" with link to LICENSE file.

---

## 4. Content Cuts and Consolidations

| Current content | Action |
|-----------------|--------|
| Long "Key design decisions" paragraphs | Condense to table or 1-line bullets |
| Redundant "Installation" and "Quick Start" | Merge into Install + Quick Start with clear steps |
| PRDs table | Keep or merge into Documentation |
| Status paragraph | Keep or move to CONTRIBUTING |
| Multi-agent text script | Keep; consider adding mini diagram |

---

## 5. Additions (from benchmarks)

| Addition | Source | Implementation |
|----------|--------|----------------|
| Badges | copilot-sdk, claude-code | Add build, license badges if CI supports |
| Prerequisites | All | One line: Node 20+, npm, Cursor IDE |
| Support / Contributing section | All | Links to CONTRIBUTING, Issues, docs |
| License | All | One line + link to LICENSE |
| Table of contents | claude-agent-sdk-python (suggested) | Add if README exceeds ~150 lines |
| FAQ | copilot-sdk | Optional: 3–5 Q&As (e.g. "Do I need Cursor?" "How does voice work?" "What's the Agent Screen?") |

---

## 6. Target Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Word count | ~900 | 600–800 (tighter) or 800–1,000 (with FAQ) |
| Sections | 11 | 12–14 (with Support, License) |
| Code blocks | 3 | 3–4 |
| Diagrams | 1 mermaid, 1 ASCII | Keep both; optional +1 minimal |
| Tables | 3 | 3–4 |
| External links | ~12 | 15–20 (docs, ADRs, PRDs, CONTRIBUTING) |

---

## 7. Implementation Order

1. **Restructure:** Reorder sections per proposed order (tagline → idea → install → quick start → architecture → …).
2. **Install + Quick Start:** Split and expand with prerequisites.
3. **Key design decisions:** Convert to table or short bullets.
4. **Support / Contributing:** Add new section.
5. **License:** Add if LICENSE exists.
6. **Badges:** Add if CI provides badge URLs.
7. **Polish:** Trim redundant prose, verify links, run a quick pass for consistency.
8. **Optional:** FAQ section, second minimal diagram, TOC.

---

## 8. Out of Scope (for README)

- Full API reference (belongs in docs or generated)
- Detailed config schema (link only)
- Full ADR list (link to adr/README.md)
- Per-module deep dives (link to architecture docs)
- Changelog (separate CHANGELOG.md)

---

## 9. References

- [claude-agent-sdk-python README](https://github.com/anthropics/claude-agent-sdk-python)
- [claude-agent-sdk-demos README](https://github.com/anthropics/claude-agent-sdk-demos)
- [claude-code README](https://github.com/anthropics/claude-code)
- [copilot-sdk README](https://github.com/github/copilot-sdk)
- [anthropics/skills README](https://github.com/anthropics/skills)
- Current README: `README.md`
- Vision invariants: `.cursor/rules/vision-invariants.mdc`
- ADR-0008: `docs/architecture/adr/ADR-0008-drive-mode-wrapper-architecture.md`
