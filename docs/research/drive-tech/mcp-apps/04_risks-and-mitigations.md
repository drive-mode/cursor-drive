# MCP Apps — Risks and Mitigations

## Risk Summary

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|------|----------|------------|--------|-----------|
| R1 | iframe sandboxing limitations | Medium | High | Reduced functionality in App UI vs. webview | Graceful degradation; feature detection |
| R2 | Cross-host rendering inconsistency | Medium | High | UI looks broken or unusable in some hosts | Host-specific CSS overrides; design for lowest common denominator |
| R3 | SDK churn (breaking changes) | Low | Medium | Upgrade effort; potential regression | Pin version; monitor changelog; keep ext-apps surface minimal |
| R4 | Supply chain risk (new dependency) | Low | Low | Vulnerability in ext-apps or transitive deps | Audit before adoption; lockfile pinning; minimal dependency surface |
| R5 | CSP requirements | Low-Medium | Medium | UI resources blocked by host CSP | Self-contained HTML; no external loads; inline styles with nonces |
| R6 | Data leakage through UI | Low | Low | Sensitive operator activity exposed in iframe | Same data as existing webview; no new exposure; host sandboxing limits exfiltration |
| R7 | Host deprecation or spec change | Low | Low | MCP Apps support removed from a host | Webview fallback; Apps UI is additive, not required |

## Detailed Analysis

### R1: iframe Sandboxing Limitations

**Description**: MCP App UIs render in sandboxed iframes with restricted permissions. Hosts typically apply `sandbox="allow-scripts"` (no `allow-same-origin`, `allow-top-navigation`, `allow-popups`, or `allow-forms` by default). This means:

- No access to `localStorage` or `sessionStorage` (origin is `null`)
- No `window.open()` or link navigation
- No form submissions (unless host explicitly grants `allow-forms`)
- No access to parent window APIs beyond `postMessage`
- No clipboard access (`navigator.clipboard` requires secure context + permissions)

**Impact on Drive**:
- File click-to-open (currently `vscodeApi.postMessage({ type: 'openFile' })`) cannot directly open files. Must send JSON-RPC request to host, which may or may not support it.
- "Ask about this" overlay (uses `vscode.window.showInputBox()`) cannot be replicated. Must use in-iframe input.
- Activity state cannot persist across unmount cycles (no `localStorage`).

**Mitigations**:
1. **Feature detection**: Check `typeof acquireVsCodeApi` and `window.parent !== window` to detect environment. Disable unavailable features gracefully.
2. **JSON-RPC bridge**: Implement `openFile` and `askAbout` as JSON-RPC requests via `postMessage`. Hosts that support these actions will handle them; others will no-op.
3. **In-memory state**: Keep activity state in JS variables. Accept that unmount loses state (host can re-trigger tool to rebuild).
4. **Design for constraints**: MCP App UI is a read-heavy activity feed. Most interactions (scroll, tab switch) work fine in a sandboxed iframe.

### R2: Cross-Host Rendering Inconsistency

**Description**: Each host renders MCP App iframes differently:
- **iframe dimensions**: Claude gives generous height; ChatGPT constrains width; VS Code depends on panel layout.
- **CSS environment**: No VS Code CSS variables in non-VS Code hosts. Colors, fonts, and spacing must be self-contained.
- **Theme**: Claude has light/dark; ChatGPT has light/dark/system; VS Code has arbitrary themes. The App must adapt or use a neutral palette.
- **Scrolling**: Some hosts set `overflow: hidden` on the iframe; the App must handle internal scrolling.

**Impact on Drive**: The Agent Screen's current styling relies heavily on `--vscode-*` CSS variables (~20 referenced). These will be undefined outside VS Code, causing invisible text, broken backgrounds, and layout collapse.

**Mitigations**:
1. **CSS fallback values**: Every `var(--vscode-*)` reference gets a fallback: `color: var(--vscode-editor-foreground, #d4d4d4)`.
2. **Theme detection**: Use `prefers-color-scheme` media query for non-VS Code hosts. Provide light and dark palettes.
3. **Responsive layout**: Use `min-height`, `max-height`, `flex`, and `overflow-y: auto` to handle variable iframe dimensions.
4. **Visual regression testing**: Screenshot-compare the App UI in each target host during prototype validation.
5. **Design for "usable, not identical"**: Accept visual differences across hosts. Target consistent information architecture, not pixel-perfect rendering.

### R3: SDK Churn

**Description**: `@modelcontextprotocol/ext-apps` is at v1.0.1 (released 2026-01-28). The MCP Apps spec is frozen, but the SDK may introduce breaking changes in v2.x. Additionally, host-side rendering APIs may change as hosts refine their MCP Apps support.

**Impact on Drive**: A breaking change could require code updates to the UI resource registration, `_meta.ui` format, or guest-side messaging API. If unaddressed, the App UI stops rendering.

**Mitigations**:
1. **Pin version**: Use exact version in `package.json` (`"1.0.1"` not `"^1.0.1"`) during prototype.
2. **Minimal API surface**: Use only `server.resource()`, `_meta.ui.resourceUri`, and basic `postMessage`. Avoid advanced ext-apps features that are more likely to change.
3. **Monitor releases**: Subscribe to `@modelcontextprotocol/ext-apps` npm release notifications. Review changelogs before upgrading.
4. **Graceful fallback**: If the SDK is removed, the MCP server still works — tools return text responses without `_meta.ui`. The webview path is unaffected.

### R4: Supply Chain Risk

**Description**: Adding `@modelcontextprotocol/ext-apps` introduces a new npm dependency from the MCP project (Anthropic-maintained). Transitive dependencies may include:
- PostMessage utilities
- HTML sanitization (if any)
- JSON-RPC helpers

**Impact on Drive**: A compromised version could inject malicious code into UI resources served to hosts. Though the sandbox limits damage, the MCP server itself runs in the VS Code extension host (trusted context).

**Mitigations**:
1. **Audit before adoption**: Review `ext-apps` source code and dependency tree. It's small (~12 KB) and maintained by the MCP core team.
2. **Lockfile**: Commit `package-lock.json` to pin exact versions of all transitive deps.
3. **npm audit**: Run `npm audit` in CI. Block publish on critical/high vulnerabilities.
4. **Minimal dependency surface**: `ext-apps` has very few transitive deps. If the dependency tree grows unexpectedly, consider vendoring the essential functions (~50 lines).

### R5: CSP Requirements

**Description**: Hosts enforce Content Security Policy on MCP App iframes. Requirements vary:
- Claude: `default-src 'none'; script-src 'nonce-...'; style-src 'nonce-...'`
- ChatGPT: Similar, but may add `connect-src` restrictions
- VS Code: Uses `webview.cspSource` for resource loading

Drive's App HTML must comply with the strictest CSP across all target hosts.

**Impact on Drive**: External resource loads (fonts, images, CDN scripts) will be blocked. Inline scripts and styles may require nonces.

**Mitigations**:
1. **Self-contained HTML**: No external resource loads. All CSS is inline (with nonce). All JS is inline (with nonce).
2. **No `eval()` or `new Function()`**: These are blocked by CSP in all hosts.
3. **Nonce propagation**: Use the host-provided nonce if available; otherwise generate one. The `ext-apps` SDK handles nonce injection for registered resources.
4. **Test CSP compliance**: Use browser DevTools in each host to check for CSP violations during prototype testing.

### R6: Data Leakage Through UI

**Description**: The MCP App UI displays operator activity, file paths, decisions, and plan progress. This is the same data already shown in the VS Code webview. However, serving it as an MCP App resource means the HTML is transmitted over the MCP protocol to the host, which may log, cache, or forward it.

**Impact on Drive**: Sensitive information (file paths containing project names, decision text, plan details) could be stored by the host. This is a privacy concern for users under `cursorDrive.privacy.strictMode`.

**Mitigations**:
1. **Same data, same rules**: The MCP App UI shows exactly what `agent_screen_activity` tool calls already transmit as text. No new data exposure.
2. **Respect strict mode**: When `strictMode` is enabled, omit sensitive details from UI resources (same filtering already applied to tool responses).
3. **No persistent storage**: MCP App iframes have no `localStorage`. Activity data exists only in-memory during the session.
4. **Feature flag**: `cursorDrive.mcp.enableApps` must be explicitly enabled. Users opt in to serving UI resources.
5. **Documentation**: Document in config schema that enabling MCP Apps means UI data is served to the connected host.

### R7: Host Deprecation or Spec Change

**Description**: A host could remove MCP Apps support, or the MCP spec could introduce a v2 that's incompatible with v1.

**Impact on Drive**: The MCP App UI stops rendering in affected hosts. Users see only the text response.

**Mitigations**:
1. **Additive architecture**: MCP Apps are an additional output channel. The webview path is always available for VS Code/Cursor users. Text responses always work.
2. **Feature flag**: Easy to disable globally if the spec changes.
3. **Spec commitment**: MCP is maintained by Anthropic with broad industry adoption. Deprecation without migration path is unlikely.

## Risk Matrix

```
           Low Impact          Medium Impact         High Impact
          ┌─────────────────┬─────────────────────┬──────────────────┐
High      │                 │ R1 iframe sandbox   │                  │
Likelihood│                 │ R2 rendering        │                  │
          ├─────────────────┼─────────────────────┼──────────────────┤
Medium    │                 │ R3 SDK churn        │                  │
Likelihood│                 │ R5 CSP              │                  │
          ├─────────────────┼─────────────────────┼──────────────────┤
Low       │ R4 supply chain │ R7 deprecation      │                  │
Likelihood│ R6 data leakage │                     │                  │
          └─────────────────┴─────────────────────┴──────────────────┘
```

**Overall risk posture**: Low-Medium. No high-impact risks identified. The two medium-severity/high-likelihood risks (R1, R2) are well-mitigated by graceful degradation and responsive design. The prototype phase will surface concrete issues before full commitment.
