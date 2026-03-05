/**
 * Builds standalone HTML for the Drive Agent Screen MCP App.
 * Renders in a sandboxed iframe when agent_screen_* tools return _meta.ui.resourceUri.
 * No acquireVsCodeApi(); uses App from @modelcontextprotocol/ext-apps for host communication.
 * When bundle is provided, loads from blob URL (CSP-compliant, no external script).
 */

export const AGENT_SCREEN_APP_RESOURCE_URI = "ui://cursor-drive/agent-screen";

export function buildAgentScreenAppHtml(bundle?: string): string {
  const loadApp = bundle
    ? `const _b=URL.createObjectURL(new Blob([${JSON.stringify(bundle)}],{type:"application/javascript"}));const {App}=await import(_b);URL.revokeObjectURL(_b);`
    : `const {App}=await import('https://esm.sh/@modelcontextprotocol/ext-apps');`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drive Agent Screen</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #d4d4d4;
      background: #1e1e1e;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 120px;
      overflow: hidden;
    }
    header {
      padding: 6px 10px;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    header h1 { font-size: 13px; font-weight: 600; margin: 0; color: #d4d4d4; }
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid #3c3c3c;
      flex-shrink: 0;
    }
    .tab {
      padding: 4px 10px;
      font-size: 11px;
      cursor: pointer;
      border: none;
      background: none;
      color: #969696;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab.active { color: #007acc; border-bottom-color: #007acc; }
    .tab:hover { color: #d4d4d4; background: #2d2d2d; }
    .panel { display: none; flex: 1; overflow-y: auto; padding: 6px 0; }
    .panel.active { display: block; }
    .activity-item, .file-item, .decision-item {
      padding: 3px 10px;
      font-size: 12px;
      border-bottom: 1px solid #2d2d2d;
    }
    .activity-item:hover, .file-item:hover { background: #2d2d2d; }
    .activity-operator, .file-operator, .decision-operator {
      font-size: 10px;
      color: #969696;
      margin-right: 6px;
    }
    .empty-state { color: #969696; font-size: 12px; text-align: center; padding: 16px; font-style: italic; }
  </style>
</head>
<body>
  <header>
    <h1 data-testid="agent-screen-title">Agent Screen</h1>
  </header>
  <div class="tabs" role="tablist">
    <button class="tab active" data-panel="activity" data-testid="tab-activity" role="tab">Activity</button>
    <button class="tab" data-panel="files" data-testid="tab-files" role="tab">Files</button>
    <button class="tab" data-panel="decisions" data-testid="tab-decisions" role="tab">Decisions</button>
  </div>
  <div id="panel-activity" class="panel active" role="tabpanel" data-testid="panel-activity">
    <div class="empty-state" id="activity-empty">Waiting for operator activity...</div>
    <div id="activity-feed"></div>
  </div>
  <div id="panel-files" class="panel" role="tabpanel" data-testid="panel-files">
    <div class="empty-state" id="files-empty">No files touched yet.</div>
    <div id="files-feed"></div>
  </div>
  <div id="panel-decisions" class="panel" role="tabpanel" data-testid="panel-decisions">
    <div class="empty-state" id="decisions-empty">No decisions recorded yet.</div>
    <div id="decisions-feed"></div>
  </div>
  <script type="module">
    (async function() {
      function hideEmpty(panelId) {
        const empty = document.getElementById(panelId + '-empty');
        if (empty) empty.style.display = 'none';
      }
      function appendActivity(op, text) {
        hideEmpty('activity');
        const feed = document.getElementById('activity-feed');
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = '<span class="activity-operator">' + escapeHtml(op || '') + '</span><span>' + escapeHtml(text || '') + '</span>';
        feed.appendChild(div);
        feed.scrollTop = feed.scrollHeight;
      }
      function appendFile(op, filePath) {
        hideEmpty('files');
        const feed = document.getElementById('files-feed');
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = '<span class="file-operator">' + escapeHtml(op || '') + '</span><span>' + escapeHtml(filePath || '') + '</span>';
        feed.appendChild(div);
      }
      function appendDecision(op, text) {
        hideEmpty('decisions');
        const feed = document.getElementById('decisions-feed');
        const div = document.createElement('div');
        div.className = 'decision-item';
        div.innerHTML = '<span class="decision-operator">' + escapeHtml(op || '') + '</span>' + escapeHtml(text || '');
        feed.appendChild(div);
      }
      function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
          document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
          tab.classList.add('active');
          document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
        });
      });
      try {
        ${loadApp}
        const app = new App({ name: 'Drive Agent Screen', version: '0.3.0' });
        app.connect();
        app.ontoolresult = function(result) {
          const textContent = result.content && result.content.find(function(c) { return c.type === 'text'; });
          const text = textContent && textContent.text;
          if (!text) return;
          try {
            const data = JSON.parse(text);
            if (data.kind === 'file') appendFile(data.op, data.file_path);
            else if (data.kind === 'decision') appendDecision(data.op, data.text);
            else appendActivity(data.op, data.text);
          } catch (_) {
            appendActivity('', text);
          }
        };
      } catch (e) {
        document.getElementById('activity-feed').innerHTML = '<div class="empty-state">MCP App failed to load. Enable script sources or check host CSP.</div>';
      }
    })();
  </script>
</body>
</html>`;
}
