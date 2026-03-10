---
planId: chat-memory-proceed
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: Chat memory and proceed
overview: Summarize 11 agent transcripts into a memory aid and a consolidated list of open next steps, then recommend how to proceed using your plan system and existing ADRs.
todos:
  - id: sync-registry
    content: Run plan-runner.py sync-registry and fix any gate errors
    status: completed
  - id: fix-windows-tests
    content: Fix Windows path-separator test failures in persistentMemory.test.ts and worktreeManager.test.ts
    status: completed
  - id: sdk-port
    content: Install @agentclientprotocol/sdk and port SessionAccumulator, ToolCallTracker, PermissionBroker (per ADR-0023)
    status: completed
  - id: doc-agent-teams
    content: Document agent-teams methodology in docs/design/architecture
    status: completed
  - id: compound-engineering
    content: Choose and implement one compound-engineering item (brainstorm skill or compound workflow)
    status: completed
  - id: resume-cli
    content: Add --resume support to RunCursorCliOptions when stateful CLI sessions are needed
    status: completed
isProject: false
state: completed
---

# Chat Memory and How to Proceed

## 1. What each chat was about


| Chat ID                                                            | Short title                             | Main goal                                                                 | Key outcome                                                                                                                                                                       |
| ------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [5290f3b3](agent-transcripts/5290f3b3-06c8-4106-b7d5-ad5bf68bcb16) | Cursor CLI programmatic capabilities    | Decide if Drive wraps/integrates Cursor CLI as agent runtime              | No CLI server/API mode; hybrid: keep extension + cursorCliRunner; optional `--resume`; Cloud Agents = separate track                                                              |
| [246c75e0](agent-transcripts/246c75e0-37c3-4436-9014-bdbca88f4049) | Agent orchestration + agent-teams       | Survey frameworks; align with Claude-style agent teams                    | Skip external frameworks; adopt patterns (handoff, guardrails, role→sub-mode, escalation); operators = team members                                                               |
| [8c8ae298](agent-transcripts/8c8ae298-e0e6-4be2-b3bd-fdb2d6c2a59c) | ACP vs MCP for Drive                    | Evaluate ACP alongside MCP                                                | Defer ACP; stay MCP; add ACP only as **client** when needed                                                                                                                       |
| [1f0a4bce](agent-transcripts/1f0a4bce-d98f-4c3e-8566-1e9d6cdc2604) | Debug logs, agent model, plan-runner    | Fix .gitignore, agent model, sync subcommand                              | Fixed: debug logs in .gitignore; plan-governor/verifier `composer-1.5`; plugin agents use `sync-registry`                                                                         |
| [3591fa90](agent-transcripts/3591fa90-339d-4c4c-a09e-fecc290c4446) | Compound-engineering adoption           | Pick plugin pieces to implement (no API keys)                             | Doc added; recommend: brainstorm skill, doc-review, workflows:compound, changelog, plan structure, git worktree reuse                                                             |
| [2efc0ff5](agent-transcripts/2efc0ff5-cf91-4773-bf2f-09214f08c1c4) | Runlayer plugin overview                | How Runlayer works; API key required?                                     | Local features work without API key; only central governance needs Runlayer workspace                                                                                             |
| [403b9dca](agent-transcripts/403b9dca-20fb-4b7e-8f90-038808393ecb) | Langfuse plugin overview                | How Langfuse Cursor plugin works                                          | Described: skill, npx langfuse-cli, docs, use-case refs; needs env keys                                                                                                           |
| [c65d3580](agent-transcripts/c65d3580-7038-4529-b891-23b048870c3a) | Tangent Agent UX (full impl)            | Implement tangent naming, confirmation, clarification, transcript history | Done: tangentNameExtractor, tangentFlow confirmation, clarificationHandler, persistentMemory + operator_search_history                                                            |
| [e3785fcc](agent-transcripts/e3785fcc-79dd-4655-bae4-6317655c2671) | ACP Python SDK → cursor-sdk             | Extract ACP patterns; minimal cursor-sdk + TS sketches                    | Use `@agentclientprotocol/sdk`; port SessionAccumulator, ToolCallTracker, PermissionBroker; AcpRequestError; wiring sketch for agentScreen/pipeline                               |
| [99bffece](agent-transcripts/99bffece-62ee-41ab-9601-50ffbbf7971a) | Copilot SDK feature audit               | Compare Copilot SDK to Drive; adopt or port?                              | Do not adopt as dep; port 6 patterns (session persistence, PermissionRequest union, onPostToolUse, ProviderConfig BYOK, listSessions filter, ReasoningEffort); cursor-sdk concept |
| [df95bbfd](agent-transcripts/df95bbfd-264b-4fa5-aa41-cf6541d14c5c) | Codebase review, bugfixes, SDK research | Review repo, fix bugs, implement review + SDK plans                       | Bugfixes in mcpServer, pipeline, operatorRegistry; ADR-0023 + sdk-protocol research doc; 6 pre-existing test failures (Windows paths)                                             |


---

## 2. Cross-cutting themes

- **SDK / ACP / cursor-sdk:** ACP deferred as server; use as client when needed. Use `@agentclientprotocol/sdk`; port SessionAccumulator, ToolCallTracker, PermissionBroker; cursor-sdk = DriveClient over MCP + versioned auth entry. Copilot: no dep; port 6 patterns.
- **Cursor CLI:** One-shot only; keep cursorCliRunner; optional `--resume`; Cloud Agents = separate track.
- **Orchestration:** No external framework; adopt patterns (handoff, guardrails, role→sub-mode, escalation); document agent-teams methodology.
- **Tangent / operators:** Tangent UX implemented (naming, confirmation, clarification, history).
- **Compound-engineering:** Doc in place; choose what to implement first (e.g. brainstorm skill or compound workflow).
- **Plans / hooks:** plan-runner uses `sync-registry`; plan-governor/verifier use `composer-1.5`; debug logs ignored.

---

## 3. Consolidated open next steps (from transcripts)

**SDK / protocol**

- Install `@agentclientprotocol/sdk`; port SessionAccumulator, ToolCallTracker, PermissionBroker (~600 lines); add AcpRequestError; optional StreamObserver tap.
- Implement six Copilot ports: structured session persistence, typed PermissionRequest union, onPostToolUse hook, ProviderConfig BYOK, listSessions with git-context filter, ReasoningEffort.
- Add versioned, authenticated external entry point for cursor-sdk client.

**Cursor CLI**

- Add `--resume` stateful sessions in RunCursorCliOptions; evaluate Cloud Agents API as separate track.

**Orchestration / methodology**

- Implement role→sub-mode routing; formalize escalation protocol; handoff input filtering.
- Document agent-teams methodology in `docs/design/architecture`.
- Consider MCP Apps when Cursor supports them.

**ACP as client**

- Implement “Drive as ACP client” when a concrete workflow needs it (e.g. Copilot CLI) or when Cursor exposes an ACP client.

**Compound-engineering**

- Choose and implement first piece: e.g. brainstorm skill or compound workflow (see [docs/design/compound-engineering-adoption.md](docs/design/compound-engineering-adoption.md)).

**Tests / hygiene**

- Fix pre-existing Windows path-separator failures in `persistentMemory.test.ts` and `worktreeManager.test.ts`.
- Optionally align plan-governor/verifier Constraints prose with `model: composer-1.5`.

---

## 4. How to proceed

**Option A — Follow existing plans**

- Run plan-governor (sync + validation): `python .cursor/hooks/plan-runner.py sync-registry`.
- Read [.cursor/plans/plan-graph.yaml](.cursor/plans/plan-graph.yaml) and [.cursor/plans/registry.yaml](.cursor/plans/registry.yaml) for active plans; run plan-orchestrator for “execute phase N” if you want batch execution.
- Use verifier after any plan or transcript-derived work is marked done.

**Option B — Prioritize by impact**

1. **Quick wins:** Fix Windows path test failures; align agent Constraints prose with composer-1.5.
2. **cursor-sdk foundation:** Install `@agentclientprotocol/sdk`, port the three contrib modules, add AcpRequestError (feeds into ADR-0023 and e3785fcc/99bffece).
3. **Orchestration clarity:** Document agent-teams methodology; implement role→sub-mode routing or handoff filtering (from 246c75e0).
4. **Compound-engineering:** Pick one item from compound-engineering-adoption.md and implement (3591fa90).

**Option C — Persist this as a memory doc**

- Add a short “Recent chats” or “Session memory” section to a doc you already use (e.g. BUGBOT.md, or a new `.cursor/chat-memory.md`) and paste the table from §1 plus the consolidated next steps from §3. Revisit after each batch of work to tick off or add items.

---

## 5. Recommended todos (for you or your next agent)

You can create these as a checklist (e.g. in Cursor todos or in a plan):

1. Run `plan-runner.py sync-registry` and fix any gate errors.
2. Fix Windows path-separator test failures in `persistentMemory.test.ts` and `worktreeManager.test.ts`.
3. Install `@agentclientprotocol/sdk` and port SessionAccumulator, ToolCallTracker, PermissionBroker (per e3785fcc / ADR-0023).
4. Document agent-teams methodology in `docs/design/architecture` (per 246c75e0).
5. Choose and implement one compound-engineering item (brainstorm skill or compound workflow).
6. Add `--resume` support to RunCursorCliOptions when stateful CLI sessions are needed (per 5290f3b3).

If you say which option (A/B/C) and which todos you want to tackle first, the next agent can execute against this plan.

---

## Reconciliation

**What was verified**

| TODO | Outcome |
|------|---------|
| sync-registry | `plan-runner.py sync-registry` ran successfully; auto-registered 2 plans; no gate errors |
| fix-windows-tests | `persistentMemory.test.ts` and `worktreeManager.test.ts` pass on Windows; path handling uses `path.join` / `path.normalize` |
| sdk-port | `@agentclientprotocol/sdk` in package.json; `SessionAccumulator`, `ToolCallTracker`, `PermissionBroker`, `AcpRequestError` in `src/cursor-sdk/` |
| doc-agent-teams | `docs/design/architecture/agent-teams-methodology.md` exists; linked from architecture README |
| compound-engineering | Added `.cursor/skills/brainstorm/SKILL.md` (brainstorm before plan flow) |
| resume-cli | `RunCursorCliOptions.resumeChatId`, `--resume` in buildCliArgs, `RunCursorCliResult.chatId`, `createCursorCliChat` already implemented |

**Residual risks**

- Brainstorm skill is new; no integration test with plan-system-maintainer
- Streaming CLI result does not extract `chatId` from NDJSON (echoes `resumeChatId` when passed); fresh-run chatId extraction may need enhancement if CLI returns it in stream

**Evidence**

- `npm test` — all tests pass
- `python .cursor/hooks/plan-runner.py sync-registry` — decision: allow