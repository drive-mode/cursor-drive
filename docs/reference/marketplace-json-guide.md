# marketplace.json — Cursor Drive Guide

How to build and use `.cursor-plugin/marketplace.json` for Cursor's plugin marketplace. Reference: [Building plugins — Multi-plugin repositories](https://cursor.com/docs/plugins/building#multi-plugin-repositories).

---

## When do you need marketplace.json?

| Scenario | marketplace.json needed? |
|----------|---------------------------|
| **Single plugin at repo root** | No. Cursor discovers `.cursor-plugin/plugin.json` at root and treats the repo as one plugin. |
| **Multiple plugins in one repo** | Yes. You must have `marketplace.json` listing each plugin; each lives in its own subdirectory. |
| **Future: cursor-drive + tldraw + others** | Yes, once you add a second plugin. |

---

## Marketplace manifest format

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Org",
    "email": "plugins@yourorg.com"
  },
  "metadata": {
    "description": "A collection of developer tool plugins"
  },
  "plugins": [
    {
      "name": "plugin-one",
      "source": "plugin-one",
      "description": "First plugin"
    },
    {
      "name": "plugin-two",
      "source": "plugin-two",
      "description": "Second plugin"
    }
  ]
}
```

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Marketplace identifier (kebab-case) |
| `owner` | object | `name` (required), `email` (optional) |
| `plugins` | array | Plugin entries (max 500) |

### Plugin entry fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **(required)** Plugin identifier (kebab-case) |
| `source` | string or object | **(required)** Path to plugin directory (relative to repo root) |
| `description` | string | Plugin description |
| `version` | string | Semantic version |
| `author` | object | Author info |
| `keywords` | array | Search tags |
| `logo` | string | Relative path or URL to logo |

Each `source` points to a subdirectory that contains its own `.cursor-plugin/plugin.json`. Example:

```
my-repo/
├── .cursor-plugin/
│   └── marketplace.json
├── plugin-one/
│   ├── .cursor-plugin/
│   │   └── plugin.json
│   └── rules/
└── plugin-two/
    ├── .cursor-plugin/
    │   └── plugin.json
    └── skills/
```

---

## Cursor Drive: current vs multi-plugin

### Current structure (single plugin)

```
cursor-drive/
├── .cursor-plugin/
│   ├── plugin.json          ← single plugin manifest
│   ├── marketplace.json     ← empty today
│   ├── agents/
│   └── README.md
├── .cursor/                 ← dev source
├── assets/
└── ...
```

**Today:** The plugin lives at repo root. Cursor discovers it via `.cursor-plugin/plugin.json`. You can submit without `marketplace.json` — Cursor treats the repo as one plugin.

### Future: multi-plugin (cursor-drive + tldraw + others)

To add tldraw or other plugins you **build and own**, restructure:

```
cursor-drive/
├── .cursor-plugin/
│   └── marketplace.json     ← lists cursor-drive, tldraw, etc.
├── plugins/
│   ├── cursor-drive/
│   │   ├── .cursor-plugin/
│   │   │   └── plugin.json
│   │   ├── agents/
│   │   ├── skills/
│   │   ├── rules/
│   │   └── commands/
│   └── tldraw/
│       ├── .cursor-plugin/
│       │   └── plugin.json
│       ├── skills/
│       │   └── diagram-whiteboard/
│       │       └── SKILL.md
│       └── .mcp.json        ← if tldraw exposes MCP tools
└── ...
```

**marketplace.json:**

```json
{
  "name": "drive-mode-plugins",
  "owner": { "name": "Drive Mode" },
  "metadata": {
    "description": "Cursor Drive and complementary plugins"
  },
  "plugins": [
    {
      "name": "cursor-drive",
      "source": "plugins/cursor-drive",
      "description": "AI pair-programming driver. Voice-first, multi-agent, share-screen."
    },
    {
      "name": "tldraw",
      "source": "plugins/tldraw",
      "description": "Whiteboard and diagram skills for Agent"
    }
  ]
}
```

---

## Important: you cannot bundle other people's plugins

From Cursor's docs:

> You cannot directly bundle or re-publish someone else's plugin under your own.

| What you want | What you can do |
|---------------|------------------|
| **List someone else's plugin in your marketplace** | No. Plugins must be in your repo, maintained by you. |
| **Use tldraw (or similar) as a dependency** | Yes — as an **npm package** in your VS Code extension (e.g. bundle tldraw in a webview). That's separate from the plugin marketplace. |
| **Create a tldraw Cursor plugin** | Yes — build it in your repo as a subdir, add skills/agents that leverage tldraw (or an MCP server that wraps it). |
| **Recommend plugins that pair well** | Yes — document in README: "Works well with: tldraw plugin, X, Y" — users install them separately. |
| **Team marketplace (Teams/Enterprise)** | Yes — import multiple plugin repos; each stays in its original repo. |

---

## tldraw integration options

| Option | Mechanism | marketplace.json |
|--------|------------|------------------|
| **A. npm dependency in extension** | Bundle tldraw in Agent Screen or new webview. Use it as a UI library. | N/A — extension, not plugin |
| **B. Cursor plugin you build** | Create `plugins/tldraw/` with skills (e.g. "create diagram", "whiteboard session") and optionally an MCP server. | Yes — list in marketplace.json |
| **C. Recommend existing plugin** | If a tldraw Cursor plugin exists elsewhere, document it as "pairs well with". | No — you don't list it |
| **D. MCP server for tldraw** | Build an MCP server that exposes tldraw tools; ship as plugin with `.mcp.json`. | Yes — if it's your plugin |

---

## Minimal marketplace.json for now (single plugin)

If you want a non-empty `marketplace.json` today for consistency or future use, you can use `pluginRoot` or list the root as the single plugin. Cursor's docs allow `source` to point to a directory.

**Option 1 — Root as plugin (if supported):**

```json
{
  "name": "drive-mode",
  "owner": { "name": "Drive Mode" },
  "plugins": [
    {
      "name": "cursor-drive",
      "source": ".",
      "description": "AI pair-programming driver for Cursor"
    }
  ]
}
```

**Option 2 — Leave empty:** Single-plugin repos often omit `marketplace.json`. Cursor discovers the plugin from `.cursor-plugin/plugin.json` at root.

**Recommendation:** Leave `marketplace.json` empty until you add a second plugin. When you do, restructure into `plugins/cursor-drive/` and `plugins/<second>/`, then add the manifest.

---

## Publishing the Cursor plugin

To submit the Drive plugin to the Cursor marketplace:

1. **Build the plugin:** `npm run build:plugin` — syncs `.cursor/` → `.cursor-plugin/` (agents, rules, skills, commands, hooks).
2. **Commit** the updated `.cursor-plugin/` contents.
3. **Submit:** Go to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) and submit your repository link.
4. **Note:** The VS Code extension (VSIX) is separate — users need both the extension (UI, MCP server, TTS) and the plugin (rules, skills, agents). The extension ships via VS Code Marketplace or direct VSIX; the plugin ships via Cursor marketplace.

---

## Checklist for adding a new plugin (e.g. tldraw)

- [ ] Create `plugins/<name>/` with `.cursor-plugin/plugin.json`
- [ ] Add skills, rules, agents, or MCP as needed
- [ ] Add entry to `.cursor-plugin/marketplace.json`
- [ ] Run `build:plugin` (or equivalent) to sync assets
- [ ] Test locally; submit at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
