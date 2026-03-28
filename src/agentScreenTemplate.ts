/**
 * Agent Screen HTML template. Placeholders:
 * - {{NONCE}} — CSP nonce for style/script
 * - {{CSP}} — Webview CSP source
 * - {{CLICK_BEHAVIOR}} — Config value for file click behavior
 * - {{PLAN_PROGRESS_SECTION}} — Plan progress section HTML or empty
 */
export const agentScreenTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src {{CSP}} 'nonce-{{NONCE}}';
             script-src {{CSP}} 'nonce-{{NONCE}}';
             img-src {{CSP}} https://api.cursor.com https://*.githubusercontent.com https://*.amazonaws.com;
             media-src {{CSP}} https://api.cursor.com https://*.githubusercontent.com https://*.amazonaws.com;">
  <title>Drive Agent Screen</title>
  <style nonce="{{NONCE}}">
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family), system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: var(--vscode-editor-foreground);
      background:
        radial-gradient(circle at 18% -20%, color-mix(in srgb, var(--vscode-testing-iconPassed, #4ec9b0) 16%, transparent), transparent 46%),
        radial-gradient(circle at 90% 0%, color-mix(in srgb, var(--vscode-textLink-foreground, #3794ff) 13%, transparent), transparent 42%),
        var(--vscode-sideBar-background);
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    body.drive-active {
      border-left: 3px solid var(--vscode-testing-iconPassed, #4ec9b0);
    }

    header {
      padding: 10px 14px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--vscode-editor-background) 84%, transparent);
      backdrop-filter: blur(7px);
    }

    header h1 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      color: var(--vscode-titleBar-activeForeground, var(--vscode-editor-foreground));
    }

    .operator-badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-weight: 600;
      box-shadow: 0 4px 14px color-mix(in srgb, var(--vscode-badge-background) 48%, transparent);
    }

    main {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
      background: color-mix(in srgb, var(--vscode-editor-background) 88%, transparent);
      backdrop-filter: blur(5px);
    }

    .tab {
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--vscode-tab-inactiveForeground);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s ease, background 0.15s ease, border-bottom-color 0.15s ease;
    }

    .tab.active {
      color: var(--vscode-tab-activeForeground);
      border-bottom-color: var(--vscode-testing-iconPassed, #4ec9b0);
    }

    .tab:hover {
      color: var(--vscode-tab-activeForeground);
      background: var(--vscode-list-hoverBackground);
    }

    .panel {
      display: none;
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      flex-direction: column;
      background: color-mix(in srgb, var(--vscode-editor-background) 92%, transparent);
    }

    .panel.active { display: flex; }

    .live-files-strip {
      display: flex;
      gap: 6px;
      padding: 8px 0;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border);
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .live-files-strip:empty { display: none; }

    .file-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      cursor: pointer;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: background 0.15s ease;
    }

    .file-chip:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .live-stream {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    .activity-item {
      display: flex;
      gap: 8px;
      padding: 6px 10px;
      font-size: 12px;
      align-items: flex-start;
      border-radius: 6px;
      margin-bottom: 2px;
      border: 1px solid transparent;
    }

    .activity-item:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: color-mix(in srgb, var(--vscode-widget-border) 70%, transparent);
    }

    .activity-time {
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
      min-width: 56px;
      font-size: 11px;
      padding-top: 1px;
    }

    .activity-text { flex: 1; word-break: break-word; }
    .file-path-link { color: var(--vscode-textLink-foreground); text-decoration: underline; cursor: pointer; }
    .file-path-link:hover { color: var(--vscode-textLink-activeForeground); }

    .activity-operator {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
      border-radius: 6px;
      margin-bottom: 2px;
      border: 1px solid transparent;
    }

    .file-item:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-textLink-activeForeground);
      border-color: color-mix(in srgb, var(--vscode-widget-border) 70%, transparent);
    }

    .file-icon { opacity: 0.8; flex-shrink: 0; font-size: 14px; }
    .file-path { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-operator { font-size: 10px; color: var(--vscode-descriptionForeground); flex-shrink: 0; }

    .decision-item {
      padding: 8px 12px;
      font-size: 12px;
      border-left: 3px solid var(--vscode-testing-iconPassed, #4ec9b0);
      margin: 4px 0;
      padding-left: 10px;
      border-radius: 0 6px 6px 0;
      background: color-mix(in srgb, var(--vscode-textBlockQuote-background, var(--vscode-editor-background)) 86%, transparent);
    }

    .decision-operator {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
    }

    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      text-align: center;
      padding: 40px 20px;
      font-style: italic;
    }

    .ask-overlay { display: none; position: fixed; z-index: 1000; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 6px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .ask-overlay.visible { display: flex; gap: 6px; align-items: center; }
    .ask-overlay input { flex: 1; min-width: 200px; padding: 4px 8px; }
    .ask-overlay button { padding: 4px 12px; cursor: pointer; }

    .plan-progress { padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .plan-progress-toggle { background: none; border: none; cursor: pointer; color: var(--vscode-foreground); font-size: 10px; padding: 0 4px; }
    .plan-progress-content { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .plan-name { font-size: 12px; font-weight: 600; }
    .plan-progress-bar { flex: 1; min-width: 60px; height: 6px; background: var(--vscode-progressBar-background); border-radius: 3px; overflow: hidden; }
    .plan-progress-fill { height: 100%; background: var(--vscode-progressBar-background); transition: width 0.2s; }
    .plan-counts { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .plan-current-todo { font-size: 11px; color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline; }
    .plan-current-todo:hover { color: var(--vscode-textLink-activeForeground); }

    .cli-tool-call {
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-textCodeBlock-background);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
    }
    .cli-stream-block {
      font-family: var(--vscode-editor-font-family);
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.6;
      color: var(--vscode-editor-foreground);
      padding: 8px 10px;
      background: var(--vscode-textCodeBlock-background, transparent);
      border-radius: 6px;
      margin-bottom: 4px;
    }
    .cli-user { font-style: italic; opacity: 0.85; }
    .cli-error { color: var(--vscode-editorWarning-foreground, #f0a500); }

    .artifact-item {
      margin-bottom: 16px;
      padding: 8px;
      border-radius: 6px;
      background: var(--vscode-textCodeBlock-background);
    }
    .artifact-item video, .artifact-item img {
      max-width: 100%;
      border-radius: 4px;
    }
    .artifact-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .artifact-label a {
      color: var(--vscode-textLink-foreground);
      text-decoration: underline;
    }

    :root {
      --op-color-0: var(--vscode-charts-blue, #3794ff);
      --op-color-1: var(--vscode-charts-green, #89d185);
      --op-color-2: var(--vscode-charts-yellow, #dcdcaa);
      --op-color-3: var(--vscode-charts-red, #f48771);
      --op-color-4: var(--vscode-charts-purple, #c586c0);
      --op-color-5: var(--vscode-charts-orange, #ce9178);
    }
    body.vscode-high-contrast .file-chip,
    body.vscode-high-contrast .cli-block,
    body.vscode-high-contrast .tab.active,
    body.vscode-high-contrast .decision-card,
    body.vscode-high-contrast .operator-badge {
      border: 1px solid var(--vscode-ButtonText, #000);
      outline: 1px solid var(--vscode-Highlight, #0078d4);
    }
    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
  </style>
</head>
<body>
  <header>
    <h1 data-testid="agent-screen-title">Agent Screen</h1>
    <span class="operator-badge" id="operator-badge" data-testid="operator-badge" aria-live="polite">—</span>
  </header>
  {{PLAN_PROGRESS_SECTION}}
  <main>
    <div class="tabs" role="tablist" aria-label="Agent Screen tabs">
      <button class="tab active" data-panel="live" data-testid="tab-live" role="tab" aria-selected="true" aria-controls="panel-live" aria-label="Live tab">Live</button>
      <button class="tab" data-panel="activity" data-testid="tab-activity" role="tab" aria-selected="false" aria-controls="panel-activity" aria-label="Activity tab">Activity</button>
      <button class="tab" data-panel="files" data-testid="tab-files" role="tab" aria-selected="false" aria-controls="panel-files" aria-label="Files tab">Files</button>
      <button class="tab" data-panel="decisions" data-testid="tab-decisions" role="tab" aria-selected="false" aria-controls="panel-decisions" aria-label="Decisions tab">Decisions</button>
      <button class="tab" data-panel="sync" data-testid="tab-sync" role="tab" aria-selected="false" aria-controls="panel-sync" aria-label="Sync tab">Sync</button>
      <button class="tab" data-panel="artifacts" data-testid="tab-artifacts" role="tab" aria-selected="false" aria-controls="panel-artifacts" aria-label="Artifacts tab">Artifacts</button>
    </div>

    <div class="panel active" id="panel-live" data-testid="panel-live" role="tabpanel" aria-label="Live panel">
      <div class="live-files-strip" id="live-files-strip" aria-label="Files in focus"></div>
      <div class="live-stream" id="live-stream">
        <div class="empty-state" id="live-empty">Waiting for agent activity... Files and thinking will appear here.</div>
      </div>
    </div>

    <div class="panel" id="panel-activity" data-testid="panel-activity" role="tabpanel" aria-label="Activity panel">
      <div class="empty-state" id="activity-empty">Waiting for operator activity...</div>
    </div>

    <div class="panel" id="panel-files" data-testid="panel-files" role="tabpanel" aria-label="Files panel">
      <div class="empty-state" id="files-empty">No files touched yet.</div>
    </div>

    <div class="panel" id="panel-decisions" data-testid="panel-decisions" role="tabpanel" aria-label="Decisions panel">
      <div class="empty-state" id="decisions-empty">No decisions recorded yet.</div>
    </div>

    <div class="panel" id="panel-sync" data-testid="panel-sync" role="tabpanel" aria-label="Sync panel">
      <div class="empty-state" id="sync-empty">No sync data yet.</div>
      <div id="sync-user" style="display:none; padding: 6px 12px; font-size: 12px; border-bottom: 1px solid var(--vscode-panel-border);"></div>
      <div id="sync-operators" style="padding: 0 12px;"></div>
      <div id="sync-proposals" style="padding: 0 12px;"></div>
      <div id="sync-queue" style="padding: 0 12px;"></div>
    </div>

    <div class="panel" id="panel-artifacts" data-testid="panel-artifacts" role="tabpanel" aria-label="Artifacts panel">
      <div class="empty-state" id="artifacts-empty">No Cloud Agent artifacts yet.</div>
    </div>
  </main>

  <script nonce="{{NONCE}}">
    const vscodeApi = acquireVsCodeApi();
    const clickBehavior = "{{CLICK_BEHAVIOR}}";

    const opColorMap = new Map();
    function getOpColor(name) {
      if (!name) return 'var(--vscode-badge-background)';
      if (!opColorMap.has(name)) opColorMap.set(name, opColorMap.size % 6);
      return 'var(--op-color-' + opColorMap.get(name) + ')';
    }

    window.addEventListener('error', function(e) {
      vscodeApi.postMessage({ type: '__debug', level: 'error', msg: e.message, src: e.filename, line: e.lineno, col: e.colno });
    });
    window.addEventListener('unhandledrejection', function(e) {
      vscodeApi.postMessage({ type: '__debug', level: 'unhandledRejection', msg: String(e.reason) });
    });

    // ── Tab switching ────────────────────────────────────────────────────────
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
      });
    });

    // ── File click ────────────────────────────────────────────────────────────
    document.getElementById('panel-files').addEventListener('click', (e) => {
      const item = e.target.closest('.file-item');
      if (item) {
        vscodeApi.postMessage({ type: 'openFile', path: item.dataset.path });
      }
    });

    // ── Activity: file path links and Ctrl+click ask ───────────────────────────
    function linkifyPaths(text) {
      const s = String(text || '');
      const pathRe = /(?:[a-zA-Z]:\\\\[^\\\\s<>"']+)|(?:\\\\.\\\\/|\\\\/)?[a-zA-Z0-9_.-]+(?:\\\\/[a-zA-Z0-9_.-]+)+(?:\\\\.(?:ts|js|tsx|jsx|json|md|py|css|html|yaml|yml))?/g;
      return s.replace(pathRe, (m) => '<span class="file-path-link" data-path="' + escapeHtml(m).replace(/"/g, '&quot;') + '" data-testid="file-link" title="Click to open" role="link">' + escapeHtml(m) + '</span>');
    }

    function handleActivityClick(e) {
      const pathLink = e.target.closest('.file-path-link');
      if (pathLink && !e.ctrlKey && !e.metaKey) {
        vscodeApi.postMessage({ type: 'openFile', path: pathLink.dataset.path });
        return;
      }
      const item = e.target.closest('.activity-item');
      if (item && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showAskOverlay(item, item.querySelector('.activity-text')?.textContent || '');
      }
    }
    document.getElementById('panel-activity').addEventListener('click', handleActivityClick);
    document.getElementById('live-stream').addEventListener('click', handleActivityClick);

    document.getElementById('panel-decisions').addEventListener('click', (e) => {
      const item = e.target.closest('.decision-item');
      if (item && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showAskOverlay(item, item.textContent || '');
      }
    });

    function showAskOverlay(anchor, text) {
      let overlay = document.getElementById('ask-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ask-overlay';
        overlay.className = 'ask-overlay';
        overlay.innerHTML = '<input type="text" id="ask-input" placeholder="Ask about this..." /><button id="ask-submit">Ask</button>';
        document.body.appendChild(overlay);
        overlay.querySelector('#ask-submit').onclick = () => {
          const val = overlay.querySelector('#ask-input').value;
          if (val) vscodeApi.postMessage({ type: 'askAboutItem', text: val });
          overlay.classList.remove('visible');
        };
        overlay.querySelector('#ask-input').onkeydown = (ev) => {
          if (ev.key === 'Enter') overlay.querySelector('#ask-submit').click();
          if (ev.key === 'Escape') overlay.classList.remove('visible');
        };
      }
      overlay.querySelector('#ask-input').value = text;
      const rect = anchor.getBoundingClientRect();
      overlay.style.top = (rect.bottom + 4) + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.classList.add('visible');
      overlay.querySelector('#ask-input').focus();
    }

    // ── Utility ──────────────────────────────────────────────────────────────
    vscodeApi.postMessage({ type: 'webviewReady' });

    function formatTime(ts) {
      const d = new Date(ts);
      return d.getHours().toString().padStart(2, '0') + ':' +
             d.getMinutes().toString().padStart(2, '0') + ':' +
             d.getSeconds().toString().padStart(2, '0');
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function scrollToBottom(el) {
      el.scrollTop = el.scrollHeight;
    }

    // ── Message handling ──────────────────────────────────────────────────────
    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg || !msg.type) { return; }

      if (msg.type === 'driveState') {
        document.body.classList.toggle('drive-active', !!msg.active);
        const h1 = document.querySelector('header h1');
        if (h1) { h1.textContent = msg.active ? 'Drive' : 'Agent Screen'; }
        return;
      }

      if (msg.type === 'replayStart') {
        const liveStream = document.getElementById('live-stream');
        if (liveStream) {
          const banner = document.createElement('div');
          banner.id = 'replay-banner';
          banner.setAttribute('data-testid', 'replay-banner');
          banner.style.cssText = 'padding:8px 12px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);font-size:11px;border-radius:6px;margin-bottom:8px;';
          banner.textContent = 'Replaying ' + (msg.count || 0) + ' events from while panel was hidden';
          liveStream.insertBefore(banner, liveStream.firstChild);
        }
        return;
      }

      if (msg.type === 'replayEnd') {
        const banner = document.querySelector('[data-testid="replay-banner"]');
        if (banner) banner.remove();
        return;
      }

      if (msg.type === 'config') {
        if (typeof msg.showPlanProgress === 'boolean') {
          const section = document.getElementById('plan-progress');
          if (section) section.style.display = msg.showPlanProgress ? 'flex' : 'none';
        }
        return;
      }

      const opName = msg.operatorName ?? msg.agentName;

      switch (msg.type) {

        case 'agentSwitch': {
          const badge = document.getElementById('operator-badge');
          if (badge) {
            badge.textContent = opName || '—';
            badge.style.background = getOpColor(opName);
          }
          addActivity('system', \`Switched to \${opName}\`, msg.timestamp);
          break;
        }

        case 'activity': {
          addActivity(opName, msg.text, msg.timestamp);
          break;
        }

        case 'file': {
          addFile(opName, msg.filePath, msg.timestamp);
          addActivity(opName, \`Touched: \${msg.filePath}\`, msg.timestamp);
          break;
        }

        case 'decision': {
          addDecision(opName, msg.text, msg.timestamp);
          break;
        }

        case 'planProgress': {
          const section = document.getElementById('plan-progress');
          if (section) {
            section.style.display = 'flex';
            const nameEl = document.getElementById('plan-name');
            const fillEl = document.getElementById('plan-progress-fill');
            const countsEl = document.getElementById('plan-counts');
            const todoEl = document.getElementById('plan-current-todo');
            if (nameEl) nameEl.textContent = msg.planName || '—';
            const total = Math.max(1, msg.totalCount || 0);
            const completed = msg.completedCount || 0;
            const pct = (completed / total) * 100;
            if (fillEl) { fillEl.style.width = pct + '%'; fillEl.style.background = 'var(--vscode-activityBarBadge-background, var(--vscode-textLink-foreground))'; }
            if (countsEl) countsEl.textContent = completed + '/' + total;
            if (todoEl) {
              todoEl.textContent = msg.currentTodo || '';
              todoEl.dataset.planPath = msg.planId ? '.cursor/plans/' + msg.planId + '.plan.md' : '';
              todoEl.onclick = () => { if (todoEl.dataset.planPath) vscodeApi.postMessage({ type: 'openPlanTodo', planPath: todoEl.dataset.planPath }); };
            }
            const toggle = document.getElementById('plan-progress-toggle');
            if (toggle) toggle.onclick = () => { const c = document.querySelector('.plan-progress-content'); if (c) c.classList.toggle('collapsed'); toggle.textContent = c?.classList.contains('collapsed') ? '▸' : '▾'; };
          }
          break;
        }

        case 'cliStream': {
          const streamType = msg.cliStreamType;
          const text = msg.text || '';
          const toolName = msg.cliToolName;
          if (streamType === 'tool_call') {
            addActivity('CLI', '\\uD83D\\uDD27 ' + (toolName || 'tool') + (text ? ': ' + text : ''), msg.timestamp, 'cli-tool-call');
          } else if (streamType === 'text_delta') {
            const containers = [document.getElementById('panel-activity'), document.getElementById('live-stream')];
            containers.forEach(function(container) {
              if (!container) return;
              let streamBlock = container.querySelector('.cli-stream-block:last-child');
              if (!streamBlock) {
                const liveEmpty = document.getElementById('live-empty');
                if (liveEmpty) liveEmpty.remove();
                const empty = document.getElementById('activity-empty');
                if (empty) empty.remove();
                streamBlock = document.createElement('div');
                streamBlock.className = 'activity-item cli-stream-block';
                streamBlock.innerHTML = '<span class="activity-time">' + formatTime(msg.timestamp || Date.now()) + '</span><span class="activity-text"></span><span class="activity-operator">\\uD83E\\uDD16</span>';
                container.appendChild(streamBlock);
              }
              const textEl = streamBlock.querySelector('.activity-text');
              if (textEl) textEl.textContent += text;
              scrollToBottom(container);
            });
          } else if (streamType === 'user') {
            addActivity('CLI/user', text, msg.timestamp, 'cli-user');
          } else if (streamType === 'error') {
            addActivity('CLI', '\\u26A0 ' + text, msg.timestamp, 'cli-error');
          } else {
            addActivity('CLI', text, msg.timestamp);
          }
          break;
        }

        case 'chime': {
          playChimes(msg.count || 1);
          break;
        }

        case 'syncStatus': {
          let snap = msg.syncSnapshot;
          if (snap) {
            snap = typeof snap === 'string' ? JSON.parse(snap) : snap;
            renderSyncSnapshot(snap);
          }
          break;
        }

        case 'proposalUpdate': {
          if (msg.text) { addSyncLog('Proposal', msg.text); }
          break;
        }

        case 'queueStatus': {
          if (msg.text) { addSyncLog('Queue', msg.text); }
          break;
        }

        case 'cloudAgentStatus': {
          addCloudAgentStatusItem(msg.cloudAgentId, msg.cloudStatus, msg.prUrl, msg.timestamp);
          break;
        }

        case 'cloudAgentArtifact': {
          addCloudAgentArtifactItem(msg.artifactType, msg.artifactUrl, msg.artifactLabel, msg.timestamp);
          break;
        }

        case 'clear': {
          const pp = document.getElementById('plan-progress');
          if (pp) pp.style.display = 'none';
          document.getElementById('live-files-strip').innerHTML = '';
          document.getElementById('live-stream').innerHTML = '<div class="empty-state" id="live-empty">Waiting for agent activity... Files and thinking will appear here.</div>';
          document.getElementById('panel-activity').innerHTML = '<div class="empty-state" id="activity-empty">Waiting for operator activity...</div>';
          document.getElementById('panel-files').innerHTML = '<div class="empty-state" id="files-empty">No files touched yet.</div>';
          document.getElementById('panel-decisions').innerHTML = '<div class="empty-state" id="decisions-empty">No decisions recorded yet.</div>';
          document.getElementById('operator-badge').textContent = '—';
          document.getElementById('sync-empty').style.display = '';
          document.getElementById('sync-user').style.display = 'none';
          document.getElementById('sync-operators').innerHTML = '';
          document.getElementById('sync-proposals').innerHTML = '';
          document.getElementById('sync-queue').innerHTML = '';
          const artifactsPanel = document.getElementById('panel-artifacts');
          if (artifactsPanel) { artifactsPanel.innerHTML = '<div class="empty-state" id="artifacts-empty">No Cloud Agent artifacts yet.</div>'; }
          touchedFiles.clear();
          break;
        }
      }
    });

    // ── Audio chimes (Web Audio API) ─────────────────────────────────────────
    function playChimes(count) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) { return; }
      const playTone = (delayMs) => {
        setTimeout(() => {
          try {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.18);
            osc.onended = () => ctx.close().catch(() => {});
          } catch (_) { /* audio unavailable */ }
        }, delayMs);
      };
      playTone(0);
      if (count >= 2) { playTone(260); }
    }

    function addActivity(operatorName, text, timestamp, extraClass) {
      const containers = [document.getElementById('panel-activity'), document.getElementById('live-stream')];
      ['activity-empty', 'live-empty'].forEach(function(id) {
        const empty = document.getElementById(id);
        if (empty) empty.remove();
      });
      const opStyle = operatorName && operatorName !== 'system' ? 'background:' + getOpColor(operatorName) + ';' : '';
      const itemHtml = '<span class="activity-time">' + formatTime(timestamp || Date.now()) + '</span>' +
        '<span class="activity-text">' + linkifyPaths(text) + '</span>' +
        (operatorName && operatorName !== 'system' ? '<span class="activity-operator" style="' + opStyle + '">' + escapeHtml(operatorName) + '</span>' : '');
      containers.forEach(function(container) {
        if (!container) return;
        const item = document.createElement('div');
        item.className = 'activity-item' + (extraClass ? ' ' + extraClass : '');
        item.setAttribute('data-testid', 'activity-item');
        item.innerHTML = itemHtml;
        container.appendChild(item);
        scrollToBottom(container);
      });
    }

    const touchedFiles = new Set();

    function addFile(operatorName, filePath, timestamp) {
      if (!filePath || touchedFiles.has(filePath)) { return; }
      touchedFiles.add(filePath);

      const container = document.getElementById('panel-files');
      const empty = document.getElementById('files-empty');
      if (empty) { empty.remove(); }

      const basename = filePath.split(/[/\\\\]/).pop() || filePath;
      const item = document.createElement('div');
      item.className = 'file-item';
      item.dataset.path = filePath;
      item.title = filePath;
      item.setAttribute('data-testid', 'file-item');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', 'Open ' + escapeHtml(filePath));
      const fileOpStyle = operatorName ? 'background:' + getOpColor(operatorName) + ';' : '';
      item.innerHTML = '<span class="file-icon">📄</span><span class="file-path">' + escapeHtml(basename) + '</span>' +
        (operatorName ? '<span class="file-operator" style="' + fileOpStyle + '">' + escapeHtml(operatorName) + '</span>' : '');
      container.appendChild(item);

      var strip = document.getElementById('live-files-strip');
      if (strip) {
        var chip = document.createElement('span');
        chip.className = 'file-chip';
        chip.dataset.path = filePath;
        chip.title = filePath;
        chip.textContent = basename;
        chip.onclick = function() { vscodeApi.postMessage({ type: 'openFile', path: filePath }); };
        strip.appendChild(chip);
      }
    }

    function addDecision(operatorName, text, timestamp) {
      const container = document.getElementById('panel-decisions');
      const empty = document.getElementById('decisions-empty');
      if (empty) { empty.remove(); }

      const item = document.createElement('div');
      item.className = 'decision-item';
      item.setAttribute('data-testid', 'decision-item');
      item.innerHTML =
        (operatorName ? \`<div class="decision-operator">\${escapeHtml(operatorName)}</div>\` : '') +
        \`<div>\${escapeHtml(text || '')}</div>\`;
      container.appendChild(item);
      scrollToBottom(container);
    }

    // ── Sync panel rendering ──────────────────────────────────────────────
    function renderSyncSnapshot(snap) {
      const emptyEl = document.getElementById('sync-empty');
      if (emptyEl) emptyEl.style.display = 'none';

      // User branch info
      const userEl = document.getElementById('sync-user');
      if (userEl) {
        userEl.style.display = 'block';
        userEl.innerHTML = \`<strong>User:</strong> \${escapeHtml(snap.userBranch || '?')}@\${escapeHtml((snap.userHeadCommit || '?').slice(0, 7))}\`;
      }

      // Operators
      const opsEl = document.getElementById('sync-operators');
      if (opsEl && snap.operators) {
        opsEl.innerHTML = '<div style="font-size:11px;font-weight:600;padding:6px 0 2px;">Operators</div>' +
          (snap.operators.length === 0 ? '<div style="font-size:12px;color:var(--vscode-descriptionForeground);">No operators with worktrees</div>' :
          snap.operators.map(function(op) {
            const stateColor = op.syncState === 'conflict' ? 'var(--vscode-editorWarning-foreground, orange)' :
                               op.syncState === 'error' ? 'var(--vscode-errorForeground, red)' : 'inherit';
            return '<div style="font-size:12px;padding:2px 0;">' +
              '<span style="font-weight:600;">' + escapeHtml(op.operatorName || op.operatorId) + '</span> ' +
              '<span style="color:' + stateColor + ';">[' + escapeHtml(op.syncState || 'idle') + ']</span> ' +
              '<span style="color:var(--vscode-descriptionForeground);">' + escapeHtml((op.headCommit || '?').slice(0, 7)) + '</span> ' +
              (op.changedFiles && op.changedFiles.length > 0 ? '(' + op.changedFiles.length + ' files)' : '') +
              '</div>';
          }).join(''));
      }

      // Proposals
      const propsEl = document.getElementById('sync-proposals');
      if (propsEl && snap.proposals) {
        const active = snap.proposals.filter(function(p) { return ['pending_review','approved','conflict','applying'].indexOf(p.status) !== -1; });
        propsEl.innerHTML = '<div style="font-size:11px;font-weight:600;padding:6px 0 2px;">Proposals (' + active.length + ' active)</div>' +
          (active.length === 0 ? '' :
          active.map(function(p) {
            const badge = p.status === 'approved' ? '✅' : p.status === 'conflict' ? '⚠️' : p.status === 'applying' ? '⏳' : '📋';
            return '<div style="font-size:12px;padding:2px 0;">' +
              badge + ' ' + escapeHtml(p.operatorName || p.operatorId) + ': ' +
              escapeHtml(p.status) + ' (' + (p.changedFiles ? p.changedFiles.length : 0) + ' files' +
              (p.conflictingFiles && p.conflictingFiles.length > 0 ? ', ' + p.conflictingFiles.length + ' conflicts' : '') + ')' +
              '</div>';
          }).join(''));
      }
    }

    function addCloudAgentArtifactItem(artifactType, artifactUrl, artifactLabel, timestamp) {
      const container = document.getElementById('panel-artifacts');
      const empty = document.getElementById('artifacts-empty');
      if (!container) return;
      if (empty) empty.remove();

      const label = artifactLabel || 'artifact';
      const item = document.createElement('div');
      item.className = 'artifact-item';
      item.setAttribute('data-testid', 'artifact-item');

      if (artifactType === 'video' && artifactUrl) {
        const video = document.createElement('video');
        video.src = artifactUrl;
        video.controls = true;
        video.setAttribute('data-testid', 'artifact-video');
        item.appendChild(video);
      } else if ((artifactType === 'screenshot' || artifactType === 'log') && artifactUrl) {
        if (artifactType === 'screenshot') {
          const img = document.createElement('img');
          img.src = artifactUrl;
          img.alt = label;
          img.setAttribute('data-testid', 'artifact-img');
          item.appendChild(img);
        }
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'artifact-label';
      const link = document.createElement('a');
      link.href = artifactUrl || '#';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = label;
      link.setAttribute('data-testid', 'artifact-link');
      labelEl.appendChild(link);
      item.appendChild(labelEl);
      container.appendChild(item);
      scrollToBottom(container);
    }

    function addCloudAgentStatusItem(agentId, status, prUrl, timestamp) {
      ['activity-empty', 'live-empty'].forEach(function(id) {
        const empty = document.getElementById(id);
        if (empty) empty.remove();
      });
      const statusColors = {
        pending: 'var(--vscode-descriptionForeground)',
        creating: 'var(--vscode-descriptionForeground)',
        running: 'var(--vscode-textLink-foreground)',
        finished: 'var(--vscode-testing-iconPassed, #4ec9b0)',
        completed: 'var(--vscode-testing-iconPassed, #4ec9b0)',
        error: 'var(--vscode-errorForeground)',
        failed: 'var(--vscode-errorForeground)',
        expired: 'var(--vscode-descriptionForeground)',
      };
      const color = statusColors[status] || 'inherit';
      const badge = '<span style="font-size:10px;padding:2px 6px;border-radius:6px;background:var(--vscode-badge-background);color:' + color + ';">' + escapeHtml(status || '?') + '</span>';
      const prHtml = prUrl
        ? ' <a href="' + escapeHtml(prUrl) + '" target="_blank" rel="noopener" class="file-path-link" style="margin-left:6px">View PR</a>'
        : '';
      const html = '<span class="activity-time">' + formatTime(timestamp || Date.now()) + '</span>' +
        '<span class="activity-text">' + badge + ' ' + escapeHtml(agentId || '?') + prHtml + '</span>' +
        '<span class="activity-operator">CloudAgent</span>';
      const containers = [document.getElementById('panel-activity'), document.getElementById('live-stream')];
      containers.forEach(function(container) {
        if (!container) return;
        const item = document.createElement('div');
        item.className = 'activity-item cloud-agent-status';
        item.setAttribute('data-testid', 'cloud-agent-status');
        item.innerHTML = html;
        container.appendChild(item);
        scrollToBottom(container);
      });
    }

    function addSyncLog(label, text) {
      const container = document.getElementById('sync-proposals');
      if (!container) return;
      const div = document.createElement('div');
      div.style.fontSize = '11px';
      div.style.padding = '1px 0';
      div.style.color = 'var(--vscode-descriptionForeground)';
      div.textContent = '[' + label + '] ' + text;
      container.appendChild(div);
    }
  </script>
</body>
</html>`;
