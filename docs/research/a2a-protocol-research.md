# A2A Protocol Research

Research summary for integrating the Agent2Agent (A2A) protocol with Cursor Drive's MCP server.

## Overview

A2A (Agent2Agent) is an open standard for agent-to-agent communication, originally developed by Google and donated to the Linux Foundation. It complements MCP (agent-to-tool) by enabling agents to discover, delegate, and collaborate without sharing internal state or tools.

- **Spec**: https://a2a-protocol.org
- **Version tested**: v0.3.0 / RC v1.0 (latest)
- **Protocol**: JSON-RPC 2.0 over HTTP, Server-Sent Events for streaming

## Agent Card Schema

The Agent Card is a self-describing manifest published at `/.well-known/agent-card.json` (IANA-registered well-known URI).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable agent name |
| `description` | string | Yes | Purpose and capabilities |
| `version` | string | Yes | Agent version (e.g. "1.0.0") |
| `supportedInterfaces` | AgentInterface[] | Yes | Ordered list of endpoints (URL, protocolBinding, protocolVersion) |
| `capabilities` | AgentCapabilities | Yes | streaming, pushNotifications, extendedAgentCard |
| `defaultInputModes` | string[] | Yes | Media types (e.g. ["text/plain"]) |
| `defaultOutputModes` | string[] | Yes | Output media types |
| `skills` | AgentSkill[] | Yes | Focused capabilities with id, name, description, tags |
| `securitySchemes` | map | No | Auth schemes (Bearer, OAuth2, etc.) |
| `securityRequirements` | array | No | Required security for contacting agent |

**AgentSkill**: id, name, description, tags, examples (optional)

**AgentInterface**: url, protocolBinding ("JSONRPC" | "HTTP+JSON" | "GRPC"), protocolVersion (e.g. "0.3")

## Task Lifecycle States

| State | Description |
|-------|--------------|
| `TASK_STATE_SUBMITTED` | Task acknowledged, queued |
| `TASK_STATE_WORKING` | Actively being processed |
| `TASK_STATE_COMPLETED` | Finished successfully (terminal) |
| `TASK_STATE_FAILED` | Finished with error (terminal) |
| `TASK_STATE_CANCELED` | Canceled before completion (terminal) |
| `TASK_STATE_REJECTED` | Agent declined to perform (terminal) |
| `TASK_STATE_INPUT_REQUIRED` | Needs user input (interrupted) |
| `TASK_STATE_AUTH_REQUIRED` | Needs authentication (interrupted) |

## Message Format

- **Transport**: JSON-RPC 2.0 over HTTP
- **Streaming**: Server-Sent Events (SSE) for real-time updates
- **Task object**: id, contextId, status (TaskStatus), artifacts, history, metadata
- **TaskStatus**: state (TaskState), message (optional), timestamp (ISO 8601)
- **Part**: text | raw (base64) | url | data (JSON) — exactly one required

## Core Operations

| Operation | Purpose |
|-----------|---------|
| Send Message | Initiate task; returns Task or direct Message |
| Get Task | Poll task status |
| List Tasks | Filter by contextId, status, pagination |
| Cancel Task | Request cancellation |
| Subscribe to Task | SSE stream for updates |
| Get Agent Card | Discovery (well-known or explicit endpoint) |

## Integration Path with DriveMcpServer (:7891)

1. **Agent Card**: Add `GET /.well-known/agent-card.json` to the existing HTTP server. Return A2A-compliant JSON describing Drive's capabilities (voice-pipeline, multi-agent, share-screen).

2. **Task endpoints**: Add JSON-RPC or HTTP/REST bindings for:
   - `POST /tasks` — create task, delegate to `OperatorRegistry.spawn()`
   - `GET /tasks/:id` — return task status (submitted → working → completed/failed/canceled)
   - `POST /tasks/:id/cancel` — set status=canceled, optionally pause/dismiss operator

3. **Mapping**: Drive operators map to A2A tasks. When a task is submitted, spawn an operator; when operator completes/dismisses, task status = completed/canceled.

4. **Authentication**: For local development, no auth (securitySchemes empty or "none"). Production would add Bearer or API key.

## References

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2A Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)
- [A2A JavaScript SDK](https://github.com/a2aproject/a2a-js)
- ADR-0014: Agent Orchestration Strategy
