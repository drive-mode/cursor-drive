# VS Code Extensions — Technology Landscape

**Topic:** VS Code Extension API architecture, AI extensibility APIs, webview best practices, and proposed API lifecycle — with focus on 2025–2026 developments.

**Date:** February 2026

---

## 1. Extension Architecture

### Extension Host Process

VS Code runs extensions in a separate **extension host** process, isolated from the UI renderer. This architectural boundary provides:

- **Crash isolation:** A buggy extension cannot crash the editor UI
- **Language-agnostic execution:** Extensions are Node.js processes; TypeScript/JavaScript is the authoring language
- **API sandboxing:** Extensions access VS Code functionality exclusively through the `vscode` module — no direct DOM manipulation, no renderer process access

The extension host communicates with the renderer via JSON-RPC over IPC. Every `vscode.*` API call is a serialized message to the renderer; every event subscription is a callback registration that the renderer dispatches.

### Activation

Extensions declare activation events in `package.json`. VS Code loads the extension's `activate()` function only when a triggering condition is met. Common activation triggers:

| Trigger | Example | When |
|---|---|---|
| `onCommand:X` | `onCommand:cursorDrive.toggle` | User invokes command X |
| `onLanguage:X` | `onLanguage:typescript` | File of language X is opened |
| `onView:X` | `onView:myTreeView` | View container X becomes visible |
| `*` | (wildcard) | Any activation event — loads immediately |
| `onStartupFinished` | — | After VS Code has fully started |
| `[]` (empty array) | — | Same as `*` in practice (VS Code 1.74+) |

The `deactivate()` function runs on extension unload (window close, extension disable). It must be synchronous or return a `Promise`/`Thenable` that resolves within 5 seconds.

### Contribution Points

Extensions declare static contributions in `package.json` under `contributes`. These are parsed at install time — before any code runs — and control what the extension adds to the UI.

| Contribution point | Purpose | Drive usage |
|---|---|---|
| `commands` | Register named commands with titles and categories | 12 commands (`cursorDrive.*`) |
| `keybindings` | Bind keyboard shortcuts to commands | `Ctrl+Shift+D` (toggle), `Ctrl+Shift+S` (agent screen) |
| `configuration` | Declare settings with types, defaults, and descriptions | 22 settings under `cursorDrive.*` |
| `menus` | Add items to context menus, editor title, etc. | Not currently used |
| `viewsContainers` | Register sidebar/panel containers | Not currently used |
| `views` | Register tree views or webview views | Not currently used |
| `chatParticipants` | Register chat participants (VS Code only) | Not available in Cursor |

---

## 2. Webview Panels

Webview panels render arbitrary HTML inside VS Code. They are the only way for an extension to present custom UI beyond tree views, status bar items, and quick picks.

### Architecture

```
┌─────────────────────────────────────┐
│  VS Code renderer process           │
│  ┌───────────────────────────────┐  │
│  │  Webview iframe (sandboxed)   │  │
│  │  - Own origin (vscode-webview) │  │
│  │  - CSP enforced               │  │
│  │  - No Node.js access          │  │
│  └──────────┬────────────────────┘  │
│             │ postMessage            │
│  ┌──────────┴────────────────────┐  │
│  │  Extension host (Node.js)     │  │
│  │  - panel.webview.postMessage  │  │
│  │  - panel.webview.onDid…       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Content Security Policy (CSP)

Webviews require explicit CSP headers. Best practice uses per-render nonces to prevent inline script injection:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           style-src ${csp} 'nonce-${nonce}';
           script-src ${csp} 'nonce-${nonce}';">
```

Where `csp` is `panel.webview.cspSource` (resolves to the webview's origin) and `nonce` is a cryptographically random string generated per render. All `<script>` and `<style>` tags must include the `nonce` attribute.

### Communication

- **Extension → Webview:** `panel.webview.postMessage(msg)` — fire-and-forget JSON serializable message
- **Webview → Extension:** `vscodeApi.postMessage(msg)` where `vscodeApi = acquireVsCodeApi()` — also fire-and-forget
- **No request/response built in.** Extensions must implement their own correlation IDs for round-trip patterns.

### Best Practices (2025–2026)

| Practice | Rationale |
|---|---|
| **CSP nonces** (not `unsafe-inline`) | Prevents XSS from injected content |
| **`retainContextWhenHidden: true`** | Keeps webview state when tab is not visible — avoids re-rendering |
| **VS Code theming variables** | `var(--vscode-editor-foreground)` etc. — webview adapts to user's theme |
| **ARIA attributes on interactive elements** | VS Code's accessibility audit flags webviews without ARIA roles |
| **`localResourceRoots`** | Restrict which local directories the webview can load resources from |
| **State persistence via `getState()`/`setState()`** | Survives webview serialization/deserialization |

### Accessibility

VS Code 1.96+ (December 2024) introduced a webview accessibility audit that checks for:
- Missing ARIA labels on interactive elements
- Insufficient color contrast against theme variables
- Keyboard navigability (tab order, focus management)
- Screen reader compatibility

Extensions targeting the marketplace must pass this audit. Cursor does not enforce it, but accessibility improvements benefit all users.

---

## 3. AI Extensibility APIs

VS Code has introduced several AI-specific APIs since 2024. These represent the platform's strategy for making LLM capabilities first-class extension primitives.

### 3.1 Language Model API (`vscode.lm`)

**Status:** Stable (VS Code 1.90+, June 2024)

The Language Model API provides extensions access to language models available in the editor. It does not host models — it proxies to models registered by GitHub Copilot or other providers.

**Core surface:**

| Method | Purpose |
|---|---|
| `vscode.lm.selectChatModels(selector)` | Returns available models matching selector criteria (vendor, family, version) |
| `model.sendRequest(messages, options, token)` | Sends a chat request to the model; returns a streaming response |
| `vscode.lm.onDidChangeChatModels` | Event fired when available models change |

**Model selection:**

```typescript
const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
const model = models[0];
const response = await model.sendRequest(
  [vscode.LanguageModelChatMessage.User('Explain this code')],
  {},
  token
);
for await (const chunk of response.text) { /* stream chunks */ }
```

**Key constraints:**
- Extensions cannot register their own models (only consume)
- Model availability depends on user's Copilot subscription and settings
- Token counting via `model.countTokens(text)` for budget management
- Response is always streaming (`AsyncIterable<string>`)

### 3.2 Chat Participant API (`vscode.chat`)

**Status:** Stable (VS Code 1.93+, September 2024)

Chat participants let extensions add `@participant` handlers to VS Code's inline chat panel. Users invoke them with `@participantName` in chat.

**Core surface:**

| Method | Purpose |
|---|---|
| `vscode.chat.createChatParticipant(id, handler)` | Registers a chat participant with a handler function |
| `participant.iconPath` | Icon shown in chat UI |
| `participant.followupProvider` | Suggests follow-up prompts after a response |

**Handler signature:**

```typescript
const handler: vscode.ChatRequestHandler = async (request, context, stream, token) => {
  // request.prompt — user's message
  // context.history — previous chat turns
  // stream.markdown() — write response
  // stream.reference() — attach file references
  // stream.button() — add action buttons
};
```

**Cursor availability:** Not exposed. Cursor's chat panel is a custom implementation that does not support the VS Code Chat Participant API. Extensions registering participants via `vscode.chat.createChatParticipant()` will throw at runtime in Cursor. This is confirmed by Drive's `apiDiscovery.ts` runtime probes and documented in `extension.ts`.

### 3.3 Language Model Tools API (`vscode.lm.tools`)

**Status:** Stable (VS Code 1.99+, March 2025)

The LM Tools API lets extensions register tools that VS Code's built-in agent mode (and other chat participants) can discover and invoke. This is distinct from MCP — it is a VS Code-native tool registration mechanism.

**Core surface:**

| Method | Purpose |
|---|---|
| `vscode.lm.registerTool(name, tool)` | Register a tool that agent mode can call |
| `vscode.lm.tools` | Array of all registered tools |
| `vscode.lm.invokeTool(name, options, token)` | Invoke a registered tool programmatically |

**Tool interface:**

```typescript
interface LanguageModelTool<T> {
  invoke(options: LanguageModelToolInvocationOptions<T>, token: CancellationToken):
    ProviderResult<LanguageModelToolResult>;
  prepareInvocation?(options, token):
    ProviderResult<PreparedToolInvocation>; // confirmation UI
}
```

**Tool registration:**

```typescript
vscode.lm.registerTool('myExtension_searchFiles', {
  async invoke(options, token) {
    const query = options.input.query;
    const results = await searchWorkspace(query);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(results))
    ]);
  }
});
```

**Key design points:**
- Tools are globally discoverable — any chat participant or agent mode can invoke them
- `prepareInvocation` enables a confirmation step before execution (user approval)
- Tools declare input schemas (JSON Schema) for structured invocation
- The tool name is namespaced by extension ID to avoid collisions

**Cursor availability:** Unknown. Cursor's agent mode uses its own tool invocation system. Whether Cursor respects `vscode.lm.registerTool` registrations is unconfirmed. Testing required via `apiDiscovery.ts`.

### 3.4 Language Model Chat Provider API

**Status:** Proposed (not yet stable)

This proposed API would let extensions register custom language model providers — the inverse of `vscode.lm.selectChatModels` (consuming models). A provider would make its model available to all extensions that call `selectChatModels`.

**Proposed surface:**

```typescript
vscode.lm.registerChatModelProvider(id, {
  provideLanguageModelResponse(messages, options, progress, token) {
    // Stream model responses
  },
  provideTokenCount(text, token) {
    return estimateTokens(text);
  }
});
```

**Current status:** Available in VS Code Insiders with the `vscode.proposed.chatProvider.d.ts` declaration. Not in stable. If graduated, it would enable extensions to bring their own LLMs to the VS Code ecosystem.

### 3.5 `registerMcpServerDefinitionProvider()`

**Status:** Proposed (VS Code 1.99+, 2025)

This proposed API lets extensions programmatically register MCP servers with VS Code's built-in MCP support. Instead of requiring manual `mcp.json` configuration, an extension can provide MCP server definitions dynamically.

**Proposed surface:**

```typescript
vscode.lm.registerMcpServerDefinitionProvider('myExtension', {
  provideMcpServerDefinitions() {
    return [{
      label: 'My Server',
      url: 'http://localhost:7891/mcp'
    }];
  }
});
```

**Relevance:** If graduated, Drive could auto-register its MCP server on activation instead of requiring users to edit `.cursor/mcp.json` manually.

---

## 4. Proposed APIs Process

VS Code uses a staged API graduation process for new functionality.

### Lifecycle

```
Proposed → Finalized (stable)
   ↓
(may be dropped)
```

| Stage | Where | Who can use |
|---|---|---|
| **Proposed** | `vscode.proposed.*.d.ts` files in VS Code repo | VS Code Insiders only, with `enabledApiProposals` in `package.json` |
| **Finalized (stable)** | `vscode.d.ts` | All extensions, all VS Code versions at or above the API version |

### Using proposed APIs

1. Add the proposal name to `package.json`:
   ```json
   "enabledApiProposals": ["chatProvider", "mcpServerDefinitionProvider"]
   ```
2. Copy the corresponding `vscode.proposed.*.d.ts` from VS Code's repo
3. Only testable on VS Code Insiders — marketplace-published extensions cannot use proposed APIs

### Current proposed APIs relevant to Drive

| Proposal | Description | Graduation likelihood |
|---|---|---|
| `chatProvider` | Register custom LM providers | Medium — depends on Copilot strategy |
| `mcpServerDefinitionProvider` | Auto-register MCP servers | High — MCP support is a priority |
| `languageModelSystem` | System message support for LM API | High — basic LLM ergonomic |
| `chatParticipantAdditions` | Extended chat participant features | Medium |

---

## 5. Testing Approaches

### 5.1 Unit Testing with Mocks

The standard approach for VS Code extension testing: mock the `vscode` module and test business logic in isolation.

**Pattern:**

```
jest.config → moduleNameMapper: { "^vscode$": "<rootDir>/tests/__mocks__/vscode.ts" }
```

The mock provides stub implementations of `vscode.window`, `vscode.workspace`, `vscode.commands`, `vscode.lm`, etc. Tests run in plain Node.js without VS Code.

**Strengths:** Fast, deterministic, CI-friendly.
**Weaknesses:** Cannot test real extension host behavior, webview rendering, or proposed API interactions.

### 5.2 VS Code Extension Test Runner (`@vscode/test-electron`)

Launches a real VS Code instance, activates the extension, and runs tests inside the extension host.

**Strengths:** Tests real activation, real API calls, real webview creation.
**Weaknesses:** Slow, requires display server (Xvfb in CI), flaky with timing issues.

### 5.3 Browser Tests (Playwright / `@vscode/test-web`)

For webview-heavy extensions, Playwright tests against the web version of VS Code or directly against webview HTML.

**Strengths:** Tests actual DOM rendering, CSP enforcement, accessibility.
**Weaknesses:** Requires server setup, slower than unit tests.

### 5.4 Recommended Strategy

| Layer | Tool | What it covers |
|---|---|---|
| **Business logic** | Jest + vscode mock | Router, model selection, operator registry, session memory |
| **Extension lifecycle** | `@vscode/test-electron` | Activation, command registration, status bar |
| **Webview rendering** | Playwright | Agent Screen HTML, CSP, accessibility, postMessage flow |

---

## 6. 2025–2026 Developments

### Language Model API maturation

The LM API has stabilized and seen broad adoption. Key developments:
- **Tool calling** (1.99+): Extensions can declare tools that agent mode invokes — moving from "extensions consume LLMs" to "extensions participate in agent workflows"
- **Structured output** (proposed): Request JSON-schema-constrained responses from models
- **Token counting** (1.90+): `model.countTokens()` for budget management

### MCP integration in VS Code

VS Code added built-in MCP client support in 2025:
- Extensions and agent mode can connect to MCP servers
- `mcp.json` configuration file for server definitions
- Proposed `registerMcpServerDefinitionProvider` for dynamic registration
- This partially overlaps with but does not replace extension-side MCP server hosting

### Cursor-specific divergence

Cursor forks VS Code but does not expose all APIs:
- Chat Participant API: not available (Cursor has its own chat implementation)
- Language Model API (`vscode.lm`): partially available — `selectChatModels` works, tool registration untested
- Extension host isolation: preserved — extensions run in the same process model
- Proposed APIs: not supported (Cursor does not track VS Code Insiders proposals)

### Accessibility requirements

VS Code's accessibility audit for webviews (1.96+) is increasingly enforced. Extensions targeting marketplace listing must pass automated ARIA, contrast, and keyboard navigation checks. While Cursor's marketplace does not enforce this, the checks represent industry best practice.

---

## 7. Comparison: Extension API vs MCP for Tool Registration

Both `vscode.lm.registerTool` and MCP serve as tool registration mechanisms. They differ in scope and audience:

| Dimension | `vscode.lm.registerTool` | MCP Server |
|---|---|---|
| **Scope** | VS Code-internal only | Cross-application (any MCP client) |
| **Discovery** | Automatic (VS Code agent mode sees all registered tools) | Manual (client must connect to server URL) |
| **Transport** | In-process (extension host) | HTTP/SSE (network) |
| **Schema** | JSON Schema input declaration | MCP tool schema |
| **Confirmation** | `prepareInvocation` UI | Client-side (e.g., Drive's approval gates) |
| **Cursor support** | Unconfirmed | Supported (Cursor reads `mcp.json`) |
| **Cross-IDE** | VS Code only | Any MCP-compatible host |

For Drive, MCP is the primary integration path because it works in both Cursor and VS Code. LM Tools registration would be additive — making Drive's capabilities visible to VS Code's native agent mode.
