---
planId: readme-redesign
name: README Redesign
overview: Build root-level README matching popular agent/SDK repos (claude-agent-sdk-python, copilot-sdk, etc.). Voice-first, multi-operator, Cursor IDE extension.
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: rdr-01-restructure
    content: Reorder README sections per proposed order (tagline → idea → install → quick start → architecture → …)
    status: completed
  - id: rdr-02-install-quickstart
    content: Split Install + Quick Start, add prerequisites (Node 20+, npm, Cursor IDE)
    status: completed
  - id: rdr-03-key-decisions
    content: Convert Key design decisions to table
    status: completed
  - id: rdr-04-support
    content: Add Support / Contributing section
    status: completed
  - id: rdr-05-license
    content: Add License section (LICENSE exists)
    status: completed
  - id: rdr-06-badges
    content: Add badges if CI supports
    status: completed
  - id: rdr-07-polish
    content: Trim prose, verify links
    status: completed
  - id: rdr-08-optional
    content: FAQ, second diagram, TOC (optional)
    status: cancelled
isProject: false
---

# README Redesign

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

**Common patterns:** Install-first or near-top; Quick Start / Try it; link-heavy; no TOC in most; architecture diagram only in Copilot SDK; FAQ only in Copilot SDK; tone technical, direct, developer-focused.

---

## 2. Proposed Section Order

1. Title + tagline
2. Badges (optional)
3. The idea in one interaction
4. Installation
5. Quick Start
6. Architecture
7. Key features / design decisions
8. Source modules
9. Multi-agent / Tangent flow
10. Documentation
11. PRDs
12. Status
13. Support / Contributing
14. License

---

## 3. Section-by-Section Specification

See docs/design/README-redesign-plan.md (superseded by this plan) for full 3.1–3.13 details. Summary: refine tagline; keep mermaid + ASCII; move install up with prerequisites; split Quick Start; add one-line architecture summary; key decisions as table; keep source modules; add Support, License; optional badges, FAQ, TOC.

---

## 4. Content Cuts and Consolidations

Condense Key design decisions to table; merge Install + Quick Start with clear steps; keep PRDs, Status, multi-agent script.

---

## 5. Additions

Prerequisites (Node 20+, npm, Cursor IDE); Support / Contributing section; License; optional badges, TOC, FAQ.

---

## 6. Target Metrics

Word count 600–800; 12–14 sections; 3–4 code blocks; keep both diagrams; 3–4 tables; 15–20 external links.

---

## 7. Implementation Order

Maps to todos rdr-01 through rdr-08.

---

## 8. Out of Scope

Full API reference; detailed config schema; full ADR list; per-module deep dives; changelog.

---

## 9. References

- Benchmark repos: claude-agent-sdk-python, claude-agent-sdk-demos, claude-code, copilot-sdk, anthropics/skills
- Current README: README.md
- Vision invariants: .cursor/rules/vision-invariants.mdc
- ADR-0008: docs/architecture/adr/ADR-0008-drive-mode-wrapper-architecture.md

---

## Reconciliation

**Verified:**
- README sections reordered per proposed order (tagline → idea → install → quick start → architecture → key decisions → source modules → multi-agent → documentation → status → support → license)
- Install and Quick Start split; prerequisites (Node 20+, npm, Cursor IDE) present
- Key design decisions in table format
- Support / Contributing and License sections present
- CI badge retained
- Prose trimmed; MCP install block condensed; Operator Flow intro shortened
- All internal links verified (docs/guides, docs/architecture, docs/reference, docs/prd, docs/design, CONTRIBUTING.md, LICENSE)
- mvp-gaps.plan.md path corrected to archive location

**Residual risks:**
- Source modules table is condensed; full component map lives in docs/architecture/README.md — may need sync if modules change
- Optional items (FAQ, second diagram, TOC) not added; README remains within target 600–800 word band

**Evidence:**
- README.md: ~165 lines, 12 sections, 4 code blocks, 4 tables, CI badge
