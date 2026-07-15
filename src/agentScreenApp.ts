/**
 * Builds standalone HTML for the Drive Agent Screen MCP App.
 * Renders in a sandboxed iframe when agent_screen_* tools return _meta.ui.resourceUri.
 * No acquireVsCodeApi(); uses App from @modelcontextprotocol/ext-apps for host communication.
 * When bundle is provided, loads from blob URL (CSP-compliant, no external script).
 *
 * Exposes window.__driveScreen for tests / hostless demo (applyEvent, clear).
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
    :root {
      --bg: #1a1b1e;
      --bg-elev: #222326;
      --border: #33363b;
      --text: #e8e8ea;
      --muted: #9a9da3;
      --accent: #3d9a8b;
      --accent-soft: rgba(61, 154, 139, 0.18);
      --link: #6cb6ff;
      --danger: #e06c75;
      --chip: #2c2e33;
      --radius: 8px;
      --font: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: var(--font);
      font-size: 12.5px;
      line-height: 1.45;
      color: var(--text);
      background: linear-gradient(165deg, #1c1d21 0%, #15161a 55%, #121318 100%);
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 160px;
      height: 100%;
      overflow: hidden;
    }
    header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-shrink: 0;
      background: var(--bg-elev);
    }
    .title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
    header h1 {
      font-size: 13px;
      font-weight: 650;
      margin: 0;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .conn {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--muted);
      flex-shrink: 0;
    }
    .conn.ok { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .conn.warn { background: #d4a017; }
    .operator-badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--chip);
      color: var(--text);
      border: 1px solid var(--border);
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .plan {
      display: none;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      flex-shrink: 0;
    }
    .plan.visible { display: block; }
    .plan-top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 11px;
      color: var(--muted);
    }
    .plan-name { color: var(--text); font-weight: 600; }
    .plan-bar {
      height: 6px;
      border-radius: 999px;
      background: var(--chip);
      overflow: hidden;
    }
    .plan-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--accent), #5ec4b4);
      transition: width 0.2s ease;
    }
    .plan-current {
      margin-top: 6px;
      font-size: 11px;
      color: var(--muted);
    }
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      background: var(--bg-elev);
      overflow-x: auto;
    }
    .tab {
      padding: 7px 12px;
      font-size: 11.5px;
      font-weight: 550;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      white-space: nowrap;
    }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab:hover { color: var(--text); background: rgba(255,255,255,0.03); }
    .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .panel {
      display: none;
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      min-height: 0;
    }
    .panel.active { display: block; }
    .live-files {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 12px 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 6px;
    }
    .live-files:empty { display: none; }
    .file-chip, .file-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: var(--radius);
      background: var(--chip);
      border: 1px solid var(--border);
      color: var(--link);
      cursor: pointer;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
    }
    .file-chip:hover, .file-item:hover { border-color: var(--accent); }
    .activity-item, .decision-item, .file-row {
      display: flex;
      gap: 8px;
      padding: 5px 12px;
      align-items: flex-start;
      border-radius: 6px;
      margin: 0 4px 2px;
    }
    .activity-item:hover, .decision-item:hover, .file-row:hover {
      background: rgba(255,255,255,0.04);
    }
    .ts {
      color: var(--muted);
      font-size: 10.5px;
      min-width: 42px;
      flex-shrink: 0;
      padding-top: 1px;
      font-variant-numeric: tabular-nums;
    }
    .op {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--accent-soft);
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 1px;
    }
    .body { flex: 1; word-break: break-word; }
    .decision-item { border-left: 2px solid var(--accent); margin-left: 8px; }
    .empty-state {
      color: var(--muted);
      font-size: 12px;
      text-align: center;
      padding: 20px 16px;
      font-style: italic;
    }
    footer {
      flex-shrink: 0;
      padding: 6px 12px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      background: var(--bg-elev);
      color: var(--muted);
      font-size: 10.5px;
    }
    .btn-clear {
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      border-radius: 6px;
      padding: 3px 8px;
      cursor: pointer;
      font-size: 10.5px;
    }
    .btn-clear:hover { color: var(--text); border-color: var(--muted); }
    .artifact-item {
      margin: 0 8px 12px;
      padding: 8px;
      border-radius: var(--radius);
      background: var(--chip);
      border: 1px solid var(--border);
    }
    .artifact-item video, .artifact-item img {
      max-width: 100%;
      border-radius: 4px;
    }
    .artifact-label {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }
    .artifact-label a { color: var(--link); }
  </style>
</head>
<body>
  <header>
    <div class="title-row">
      <span class="conn warn" id="conn-dot" title="Connecting" data-testid="conn-dot"></span>
      <h1 data-testid="agent-screen-title">Agent Screen</h1>
    </div>
    <span class="operator-badge" id="operator-badge" data-testid="operator-badge">—</span>
  </header>
  <section class="plan" id="plan-section" data-testid="plan-section" aria-label="Plan progress">
    <div class="plan-top">
      <span class="plan-name" id="plan-name">Plan</span>
      <span id="plan-counts">0 / 0</span>
    </div>
    <div class="plan-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="plan-bar">
      <div class="plan-fill" id="plan-fill"></div>
    </div>
    <div class="plan-current" id="plan-current"></div>
  </section>
  <div class="tabs" role="tablist" aria-label="Agent Screen panels">
    <button class="tab active" data-panel="live" data-testid="tab-live" role="tab" aria-selected="true">Live</button>
    <button class="tab" data-panel="activity" data-testid="tab-activity" role="tab" aria-selected="false">Activity</button>
    <button class="tab" data-panel="files" data-testid="tab-files" role="tab" aria-selected="false">Files</button>
    <button class="tab" data-panel="decisions" data-testid="tab-decisions" role="tab" aria-selected="false" aria-controls="panel-decisions">Decisions</button>
    <button class="tab" data-panel="sync" data-testid="tab-sync" role="tab" aria-selected="false" aria-controls="panel-sync">Sync</button>
    <button class="tab" data-panel="artifacts" data-testid="tab-artifacts" role="tab" aria-selected="false" aria-controls="panel-artifacts">Artifacts</button>
  </div>
  <div id="panel-live" class="panel active" role="tabpanel" data-testid="panel-live">
    <div class="live-files" id="live-files" data-testid="live-files"></div>
    <div class="empty-state" id="live-empty">Waiting for operator activity…</div>
    <div id="live-feed" data-testid="live-feed"></div>
  </div>
  <div id="panel-activity" class="panel" role="tabpanel" data-testid="panel-activity">
    <div class="empty-state" id="activity-empty">No activity yet.</div>
    <div id="activity-feed" data-testid="activity-feed"></div>
  </div>
  <div id="panel-files" class="panel" role="tabpanel" data-testid="panel-files">
    <div class="empty-state" id="files-empty">No files touched yet.</div>
    <div id="files-feed" data-testid="files-feed"></div>
  </div>
  <div id="panel-decisions" class="panel" role="tabpanel" data-testid="panel-decisions">
    <div class="empty-state" id="decisions-empty">No decisions recorded yet.</div>
    <div id="decisions-feed" data-testid="decisions-feed"></div>
  </div>
  <div id="panel-sync" class="panel" role="tabpanel" data-testid="panel-sync" aria-label="Sync panel">
    <div class="empty-state" id="sync-empty" data-testid="sync-empty">No sync data yet.</div>
    <div id="sync-user" style="display:none; padding: 6px 12px; font-size: 12px; border-bottom: 1px solid var(--border);"></div>
    <div id="sync-operators" style="padding: 0 12px;"></div>
    <div id="sync-proposals" style="padding: 0 12px;"></div>
    <div id="sync-queue" style="padding: 0 12px;"></div>
  </div>
  <div id="panel-artifacts" class="panel" role="tabpanel" data-testid="panel-artifacts" aria-label="Artifacts panel">
    <div class="empty-state" id="artifacts-empty" data-testid="artifacts-empty">No Cloud Agent artifacts yet.</div>
  </div>
  <footer>
    <span id="status-text" data-testid="status-text">MCP App ready</span>
    <button type="button" class="btn-clear" id="btn-clear" data-testid="btn-clear">Clear</button>
  </footer>
  <script type="module">
    (async function() {
      const seenFiles = new Set();
      let app = null;
      let lastOp = '';

      function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      function nowTs() {
        const d = new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      function hideEmpty(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      }
      function setConn(state, label) {
        const dot = document.getElementById('conn-dot');
        const status = document.getElementById('status-text');
        dot.className = 'conn ' + state;
        status.textContent = label;
      }
      function setOperator(name) {
        if (!name) return;
        lastOp = name;
        document.getElementById('operator-badge').textContent = name;
      }
      function appendRow(feedId, emptyId, html, className) {
        hideEmpty(emptyId);
        const feed = document.getElementById(feedId);
        const div = document.createElement('div');
        div.className = className;
        div.innerHTML = html;
        feed.appendChild(div);
        feed.scrollTop = feed.scrollHeight;
        return div;
      }
      function appendActivity(op, text) {
        setOperator(op);
        const html = '<span class="ts">' + escapeHtml(nowTs()) + '</span>'
          + (op ? '<span class="op">' + escapeHtml(op) + '</span>' : '')
          + '<span class="body">' + escapeHtml(text || '') + '</span>';
        appendRow('activity-feed', 'activity-empty', html, 'activity-item');
        appendRow('live-feed', 'live-empty', html, 'activity-item');
      }
      function appendFile(op, filePath) {
        setOperator(op);
        const path = filePath || '';
        if (!path) return;
        if (!seenFiles.has(path)) {
          seenFiles.add(path);
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'file-chip';
          chip.dataset.path = path;
          chip.textContent = path.split(/[/\\\\]/).pop() || path;
          chip.title = path;
          document.getElementById('live-files').appendChild(chip);
          const rowHtml = '<span class="ts">' + escapeHtml(nowTs()) + '</span>'
            + (op ? '<span class="op">' + escapeHtml(op) + '</span>' : '')
            + '<button type="button" class="file-item" data-path="' + escapeHtml(path) + '">' + escapeHtml(path) + '</button>';
          appendRow('files-feed', 'files-empty', rowHtml, 'file-row');
        }
        appendActivity(op, 'Touched: ' + path);
      }
      function appendDecision(op, text) {
        setOperator(op);
        const html = '<span class="ts">' + escapeHtml(nowTs()) + '</span>'
          + (op ? '<span class="op">' + escapeHtml(op) + '</span>' : '')
          + '<span class="body">' + escapeHtml(text || '') + '</span>';
        appendRow('decisions-feed', 'decisions-empty', html, 'decision-item');
        appendRow('live-feed', 'live-empty', html, 'decision-item');
      }
      function updatePlan(data) {
        const section = document.getElementById('plan-section');
        section.classList.add('visible');
        document.getElementById('plan-name').textContent = data.plan_name || data.planName || 'Plan';
        const done = Number(data.completed_count ?? data.completedCount ?? 0);
        const total = Math.max(1, Number(data.total_count ?? data.totalCount ?? 0));
        const pct = Math.min(100, Math.round((done / total) * 100));
        document.getElementById('plan-counts').textContent = done + ' / ' + (data.total_count ?? data.totalCount ?? 0);
        document.getElementById('plan-fill').style.width = pct + '%';
        document.getElementById('plan-bar').setAttribute('aria-valuenow', String(pct));
        document.getElementById('plan-current').textContent = data.current_todo || data.currentTodo || '';
      }
      function renderSyncSnapshot(snap) {
        const emptyEl = document.getElementById('sync-empty');
        if (emptyEl) emptyEl.style.display = 'none';
        const userEl = document.getElementById('sync-user');
        if (userEl) {
          userEl.style.display = 'block';
          userEl.innerHTML = '<strong>User:</strong> ' + escapeHtml(snap.userBranch || '?') + '@' + escapeHtml((snap.userHeadCommit || '?').slice(0, 7));
        }
        const opsEl = document.getElementById('sync-operators');
        if (opsEl && snap.operators) {
          opsEl.innerHTML = '<div style="font-size:11px;font-weight:600;padding:6px 0 2px;">Operators</div>' +
            (snap.operators.length === 0 ? '<div style="font-size:12px;color:var(--muted);">No operators with worktrees</div>' :
            snap.operators.map(function(op) {
              const stateColor = op.syncState === 'conflict' ? '#d4a017' :
                                 op.syncState === 'error' ? 'var(--danger)' : 'inherit';
              return '<div style="font-size:12px;padding:2px 0;">' +
                '<span style="font-weight:600;">' + escapeHtml(op.operatorName || op.operatorId) + '</span> ' +
                '<span style="color:' + stateColor + ';">[' + escapeHtml(op.syncState || 'idle') + ']</span> ' +
                '<span style="color:var(--muted);">' + escapeHtml((op.headCommit || '?').slice(0, 7)) + '</span> ' +
                (op.changedFiles && op.changedFiles.length > 0 ? '(' + op.changedFiles.length + ' files)' : '') +
                '</div>';
            }).join(''));
        }
        const propsEl = document.getElementById('sync-proposals');
        if (propsEl && snap.proposals) {
          const active = snap.proposals.filter(function(p) {
            return ['pending_review','approved','conflict','applying'].indexOf(p.status) !== -1;
          });
          propsEl.innerHTML = '<div style="font-size:11px;font-weight:600;padding:6px 0 2px;">Proposals (' + active.length + ' active)</div>' +
            (active.length === 0 ? '' :
            active.map(function(p) {
              return '<div style="font-size:12px;padding:2px 0;" data-testid="sync-proposal">' +
                escapeHtml(p.operatorName || p.operatorId) + ': ' +
                escapeHtml(p.status) + ' (' + (p.changedFiles ? p.changedFiles.length : 0) + ' files' +
                (p.conflictingFiles && p.conflictingFiles.length > 0 ? ', ' + p.conflictingFiles.length + ' conflicts' : '') + ')' +
                '</div>';
            }).join(''));
        }
      }
      function addSyncLog(label, text) {
        const emptyEl = document.getElementById('sync-empty');
        if (emptyEl) emptyEl.style.display = 'none';
        const container = document.getElementById('sync-proposals');
        if (!container) return;
        const div = document.createElement('div');
        div.style.fontSize = '11px';
        div.style.padding = '1px 0';
        div.style.color = 'var(--muted)';
        div.setAttribute('data-testid', 'sync-log');
        div.textContent = '[' + label + '] ' + text;
        container.appendChild(div);
      }
      function addCloudAgentArtifactItem(artifactType, artifactUrl, artifactLabel) {
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
        } else if (artifactType === 'screenshot' && artifactUrl) {
          const img = document.createElement('img');
          img.src = artifactUrl;
          img.alt = label;
          img.setAttribute('data-testid', 'artifact-img');
          item.appendChild(img);
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
      }
      function clearAll() {
        seenFiles.clear();
        ['live-feed', 'activity-feed', 'files-feed', 'decisions-feed', 'live-files', 'sync-operators', 'sync-proposals', 'sync-queue'].forEach(function(id) {
          const el = document.getElementById(id);
          if (el) el.innerHTML = '';
        });
        const syncUser = document.getElementById('sync-user');
        if (syncUser) { syncUser.style.display = 'none'; syncUser.innerHTML = ''; }
        ['live-empty', 'activity-empty', 'files-empty', 'decisions-empty', 'sync-empty'].forEach(function(id) {
          const el = document.getElementById(id);
          if (el) el.style.display = '';
        });
        const artifactsPanel = document.getElementById('panel-artifacts');
        if (artifactsPanel) {
          artifactsPanel.innerHTML = '<div class="empty-state" id="artifacts-empty" data-testid="artifacts-empty">No Cloud Agent artifacts yet.</div>';
        }
        document.getElementById('plan-section').classList.remove('visible');
        document.getElementById('operator-badge').textContent = '—';
        setConn(app ? 'ok' : 'warn', app ? 'Connected' : 'Hostless demo mode');
      }
      function applyEvent(data) {
        if (!data || typeof data !== 'object') return;
        const kind = data.kind || data.type;
        if (kind === 'clear') { clearAll(); return; }
        if (kind === 'plan' || kind === 'planProgress') { updatePlan(data); return; }
        if (kind === 'syncStatus') {
          let snap = data.syncSnapshot;
          if (snap) {
            snap = typeof snap === 'string' ? JSON.parse(snap) : snap;
            renderSyncSnapshot(snap);
          }
          return;
        }
        if (kind === 'proposalUpdate') {
          if (data.text) addSyncLog('Proposal', data.text);
          return;
        }
        if (kind === 'queueStatus') {
          if (data.text) addSyncLog('Queue', data.text);
          return;
        }
        if (kind === 'cloudAgentArtifact') {
          addCloudAgentArtifactItem(data.artifactType, data.artifactUrl, data.artifactLabel);
          return;
        }
        if (kind === 'file') appendFile(data.op || data.operatorName, data.file_path || data.filePath);
        else if (kind === 'decision') appendDecision(data.op || data.operatorName, data.text);
        else appendActivity(data.op || data.operatorName, data.text);
      }
      function selectTab(panel) {
        document.querySelectorAll('.tab').forEach(function(t) {
          const on = t.dataset.panel === panel;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        document.querySelectorAll('.panel').forEach(function(p) {
          p.classList.toggle('active', p.id === 'panel-' + panel);
        });
      }
      document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() { selectTab(tab.dataset.panel); });
        tab.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTab(tab.dataset.panel); }
        });
      });
      document.getElementById('btn-clear').addEventListener('click', clearAll);
      async function openFile(filePath) {
        if (!filePath) return;
        if (!app) {
          setConn('warn', 'Open file needs extension MCP');
          return;
        }
        try {
          const result = await app.callServerTool({ name: 'cursor_drive_open_file', arguments: { path: filePath } });
          if (result && !result.isError) {
            await app.updateModelContext({ content: [{ type: 'text', text: '[Agent Screen] User opened file: ' + filePath }] });
          }
        } catch (err) {
          console.warn('[Agent Screen] Failed to open file:', filePath, err);
          setConn('warn', 'Could not open file');
        }
      }
      document.body.addEventListener('click', function(e) {
        const item = e.target.closest('[data-path]');
        if (!item) return;
        void openFile(item.dataset.path);
      });

      window.__driveScreen = { applyEvent: applyEvent, clear: clearAll, selectTab: selectTab };

      try {
        ${loadApp}
        app = new App({ name: 'Drive Agent Screen', version: '0.4.0' });
        app.connect();
        setConn('ok', 'Connected to host');
        app.ontoolresult = function(result) {
          const textContent = result.content && result.content.find(function(c) { return c.type === 'text'; });
          const text = textContent && textContent.text;
          if (!text) return;
          try {
            applyEvent(JSON.parse(text));
          } catch (_) {
            appendActivity('', text);
          }
        };
      } catch (e) {
        setConn('warn', 'Hostless — use extension for live MCP');
        document.getElementById('live-empty').textContent = 'Demo mode: MCP host unavailable. Events via __driveScreen.applyEvent.';
      }
    })();
  </script>
</body>
</html>`;
}
