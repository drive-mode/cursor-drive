# Guides

How-to docs for working with and contributing to Cursor Drive.

## Files

| File | What it covers |
|---|---|
| [getting-started.md](getting-started.md) | First-time setup, build, run, project layout overview |
| [live-testing.md](live-testing.md) | Full smoke test suite for extension + plugin layer + hooks |
| [handoff.md](handoff.md) | Handoff prompt for new chat sessions — paste into Cursor to continue work |
| [demo-mcp-apps.md](demo-mcp-apps.md) | Self-hosted demo: MCP Apps, port fallback, defaults, walkthrough |
| [cloudflare-workers-mcp-cicd.md](cloudflare-workers-mcp-cicd.md) | Deploy remote MCP to Cloudflare Workers via CI/CD and Terraform IaC |
| [dev-host-disabled-extensions.md](dev-host-disabled-extensions.md) | Why we disable cursor-socket and cursor-resolver-helper in the Extension Dev Host |
| [webview-dev-and-events.md](webview-dev-and-events.md) | Webview hot reload, event listener breakpoints, VS Code event catalog |

## Quick answers

**How do I run the extension?** → `getting-started.md`

**How do I test that the MCP server works?** → `live-testing.md` § B — MCP server

**How do I continue in a new chat?** → Copy `handoff.md` into a new chat

**Operators and Agent Screen (S-AS)?** → Current terms per [ADR-0016](../architecture/adr/ADR-0016-drive-terminology-and-hierarchy.md); see [reference/mcp-tools.md](../reference/mcp-tools.md) for MCP tools.

**How do I demo MCP Apps self-hosted?** → [demo-mcp-apps.md](demo-mcp-apps.md)

**How do I deploy a remote MCP server to Cloudflare Workers?** → [cloudflare-workers-mcp-cicd.md](cloudflare-workers-mcp-cicd.md)
