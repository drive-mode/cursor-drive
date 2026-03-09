---
planId: code-optimization
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
name: Code Optimization
overview: SUPERSEDED by quality-performance.plan.md (merged with test coverage). All optimization work tracked in quality-performance.
todos:
  - id: create-skill
    content: SUPERSEDED — optimization skill/command deferred; not in quality-performance scope.
    status: cancelled
  - id: create-command
    content: SUPERSEDED — optimization skill/command deferred.
    status: cancelled
  - id: opt-model-selection
    content: SUPERSEDED — see quality-performance TODO qp-05.
    status: cancelled
  - id: opt-config-caching
    content: SUPERSEDED — see quality-performance TODO qp-06.
    status: cancelled
  - id: opt-regex-caching
    content: SUPERSEDED — see quality-performance TODO qp-06.
    status: cancelled
  - id: opt-agent-registry
    content: SUPERSEDED — see quality-performance TODO qp-07.
    status: cancelled
  - id: opt-memory-arrays
    content: SUPERSEDED — see quality-performance TODO qp-07.
    status: cancelled
  - id: opt-html-template
    content: SUPERSEDED — HTML extraction deferred; not in quality-performance scope.
    status: cancelled
isProject: false
---

# Code Optimization Plan

Improve runtime efficiency of the extension. All changes must be verified by running `npm test` and `npm run compile` after each optimization.

## Optimization targets

### Model selection deduplication (`opt-model-selection`)

`vscode.lm.selectChatModels` and cheap-model fallback logic is duplicated across:

- `responseFormatter.ts` — picks a routing-tier model for compression
- `commsAgent.ts` — picks a routing-tier model for summarization
- `modelSelector.ts` — the canonical tier selection

Extract to `src/modelUtils.ts`:

```typescript
export async function selectTierModel(tier: ModelTier, token: vscode.CancellationToken): Promise<vscode.LanguageModelChat | undefined>
```

### Config hot-path caching (`opt-config-caching`)

Files calling `vscode.workspace.getConfiguration('cursorDrive')` on every invocation:

- `glossaryExpander.ts`
- `approvalGates.ts`
- `tts.ts`

Pattern: module-level cache object, invalidated by `onDidChangeConfiguration`. `config.ts` already implements this pattern — use it as the template.

### Regex precompilation (`opt-regex-caching`)

Files compiling regexes inside functions that run on every request:

- `fillerCleaner.ts` — filler word patterns
- `glossaryExpander.ts` — expansion patterns
- `approvalGates.ts` — block/warn patterns

Move to module-level `const` declarations.

### AgentRegistry O(1) lookups (`opt-agent-registry`)

Current: `agents.find(a => a.id === id)` — O(n) scan.
Replace backing store with `Map<string, AgentContext>`. Keep array for ordered iteration where needed.

### Bounded queues (`opt-memory-arrays`)

`commsAgent.ts` message queue: cap at `MAX_QUEUE_SIZE` (e.g., 100). Drop oldest on overflow.
`agentRegistry.ts` memory arrays: avoid `.slice()` on hot paths; use index-based reads.

### ShareScreen HTML extraction (`opt-html-template`)

The ~360-line HTML string in `shareScreen.ts` increases memory per WebviewPanel instance and makes the file hard to read. Extract to `src/shareScreen.html`, load via `fs.readFileSync` at activation time.