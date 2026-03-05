<!-- Managed by plan-governor agent. Regenerate: python .cursor/hooks/plan-runner.py sync-registry -->
<!-- Also see: task-graph.yaml (TODO-level), agent-graph.md (spawn hierarchy) -->

# Plan Master Diagram

> Last verified: 2026-02-25 · 11 plans · 97/97 TODOs completed · 183 tests passing
> Theme: **dark** — change `"dark"` to `"default"` in `%%{init}%%` to switch

---

## Graph index

| File | Scope |
|------|-------|
| `plan-master.diagram.md` (this file) | Plan-level dependency DAG with phase grouping |
| `task-graph.yaml` | All 97 TODOs aggregated across plans with inter-plan ordering |
| `agent-graph.md` | Orchestrator → plan-agent → TODO-subagent spawn hierarchy |

---

## Plan dependency DAG

```mermaid
%%{init: {"theme":"dark"}}%%
flowchart TD

  subgraph cursor_drive_root ["⚡ cursor-drive (project · root)"]
    direction TB

    subgraph phase1 ["Phase 1 — Foundation (parallel)"]
      direction LR

      avf["architecture-vision-foundation<br/>ADRs 0008-0014 + vision-invariants rule<br/>✓ 9/9 · no deps"]
      cdc["cursor-docs-cleanup<br/>rule/command pruning + docs alignment<br/>✓ 15/15 · depends: avf"]
      bdw["browser-dev-workflow<br/>serve-web + Playwright + dev scripts<br/>✓ 8/8 · no deps"]
      tso["terminology-sas-overhaul<br/>operator rename + Agent Screen + config<br/>✓ 12/12 · no deps"]
    end

    subgraph phase2 ["Phase 2 — Core Refactor (parallel)"]
      direction LR

      hpp["hook-prompt-pipeline<br/>beforeSubmitPrompt contract + pipeline.ts<br/>✓ 6/6 · depends: avf"]
      nma["native-mode-alignment<br/>RouteMode plan/agent/ask/debug + SubMode<br/>✓ 6/6 · depends: avf"]
      seu["senior-engineer-ux<br/>pair-programming philosophy + ADR-0015<br/>✓ 7/7 · depends: avf"]
      aof["agent-orchestration-frameworks<br/>A2A + CommsAgent + AgentRegistry v2<br/>✓ 11/11 · depends: avf"]
    end

    subgraph phase3 ["Phase 3 — Wiring"]
      pwm["pipeline-wiring-mvp<br/>9 modules wired + promptOptimizer + wake words<br/>✓ 8/8 · depends: hpp nma"]
    end

    subgraph phase4 ["Phase 4 — Quality"]
      qp["quality-performance<br/>183 tests + modelUtils + config caching<br/>✓ 7/7 · depends: pwm"]
    end

    subgraph active_plans ["Active Plans"]
      oclaw["openclaw_capability_scrape<br/>tool policy + memory isolation + checkpoints<br/>✓ 8/8 · no deps"]
    end

  end

  %% ── Phase 1 internal dependency ──────────────────────────────────────────
  avf -->|"cdc needs ADRs"| cdc

  %% ── Phase 1 → Phase 2 ────────────────────────────────────────────────────
  avf -->|"hook contract ref"| hpp
  avf -->|"mode-wrapper def"| nma
  avf -->|"ADR-0015 ref"| seu
  avf -->|"ADR-0014 ref"| aof

  %% ── Phase 2 → Phase 3 ────────────────────────────────────────────────────
  hpp -->|"runPipeline API"| pwm
  nma -->|"RouteMode enum"| pwm

  %% ── Phase 3 → Phase 4 ────────────────────────────────────────────────────
  pwm -->|"wired modules"| qp

  classDef stCompleted   stroke:#50c878,stroke-width:2px
  classDef stInProgress  stroke:#5599ff,stroke-width:3px
  classDef stActive      stroke:#f0a030,stroke-width:2px

  class avf,cdc,bdw,tso,hpp,nma,seu,aof,pwm,qp stCompleted
  class oclaw stActive
```

---

## Phase gates (all passed)

| Gate | Condition | Status |
|------|-----------|--------|
| Phase 1 → 2 | ADR-0008–0014 exist; vision-invariants.mdc; dead .cursor/ files removed | ✓ |
| Phase 2 → 3 | hooks.md with hook contract; router uses plan/agent/ask/debug | ✓ |
| Phase 3 → 4 | All 9 orphaned modules wired; end-to-end pipeline runs | ✓ |
| Phase 4 done | 183 tests pass; npm run compile clean; docs reflect architecture | ✓ |

---

## Cross-plan dependency detail

```mermaid
%%{init: {"theme":"dark"}}%%
flowchart LR

  avf_01["avf-01: ADR-0008<br/>mode-wrapper"]
  avf_02["avf-02: ADR-0009<br/>hook ingress"]
  avf_03["avf-03: ADR-0011<br/>native modes"]

  hpp_01["hpp-01: hooks.md"]
  hpp_03["hpp-03: pipeline.ts"]
  nma_01["nma-01: RouteMode"]
  nma_02["nma-02: SubMode"]

  pwm_01["pwm-01: wire filler+sanitizer"]
  pwm_05["pwm-05: promptOptimizer"]
  pwm_06["pwm-06: wake/submit words"]

  qp_02["qp-02: core tests"]
  qp_05["qp-05: modelUtils"]

  avf_01 --> hpp_01
  avf_02 --> hpp_01
  avf_03 --> nma_01
  avf_03 --> nma_02

  hpp_01 --> hpp_03
  hpp_03 --> pwm_01
  nma_01 --> pwm_01
  nma_02 --> pwm_05

  pwm_01 --> qp_02
  pwm_05 --> qp_05
  pwm_06 --> qp_02
```

---

## Archived plans

| Plan | Phase | TODOs | ADRs / evidence |
|------|-------|-------|-----------------|
| architecture-vision-foundation | 1 | 9/9 ✓ | ADR-0008–0014, vision-invariants.mdc |
| cursor-docs-cleanup | 1 | 15/15 ✓ | plan-governance.mdc, dead files removed |
| browser-dev-workflow | 1 | 8/8 ✓ | scripts/serve-web-dev.ps1, tests/browser/ |
| terminology-sas-overhaul | 1 | 12/12 ✓ | src/operatorRegistry.ts, src/agentScreen.ts, ADR-0016 |
| hook-prompt-pipeline | 2 | 6/6 ✓ | src/pipeline.ts, docs/reference/hooks.md |
| native-mode-alignment | 2 | 6/6 ✓ | src/router.ts (plan/agent/ask/debug), src/driveMode.ts |
| senior-engineer-ux | 2 | 7/7 ✓ | docs/design/philosophy/senior-engineer-pair-programming.md, ADR-0015 |
| agent-orchestration-frameworks | 2 | 11/11 ✓ | src/commsAgent.ts, A2A endpoints, ADR-0014 |
| pipeline-wiring-mvp | 3 | 8/8 ✓ | src/promptOptimizer.ts, pipeline wired |
| quality-performance | 4 | 7/7 ✓ | 183 tests, src/modelUtils.ts |
| subagent-plan-execution | meta | 8/8 ✓ | .cursor/skills/execute-plans/SKILL.md |
| docs-overhaul | legacy | 9/9 ✓ | docs/ restructured |
| hh-migration-followup | legacy | 4/4 ✓ | ADR-0005, ADR-0006 |
| drive-mode-installable-ui | legacy | 6/6 ✓ | VSIX packaging |

## Superseded plans

| Plan | Superseded by |
|------|---------------|
| mvp-gaps | pipeline-wiring-mvp |
| test-coverage | quality-performance |
| code-optimization | quality-performance |
| fix-extension-activation | quality-performance (qp-01) |

---

*Legend: ✓ completed (green) · ⚡ in_progress (blue) · ○ pending (grey dashed)*
