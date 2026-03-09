# Implemented Features — Data Flow

Simplified data-flow view of Cursor Drive. Complements [features-implemented-flow.md](features-implemented-flow.md).

---

## Request Flow (Simplified)

```mermaid
sequenceDiagram
    participant User
    participant Cursor
    participant Hook
    participant Pipeline
    participant MCP
    participant Model

    User->>Cursor: Submit prompt
    Cursor->>Hook: beforeSubmitPrompt
    Hook->>Pipeline: runPipeline
    Pipeline->>Pipeline: wake/submit/tangent
    Pipeline->>Pipeline: filler/glossary/sanitize/optimize
    Pipeline->>Pipeline: approvalGates
    Pipeline->>Pipeline: route + modelSelect
    Pipeline->>Model: Main model call
    Model->>MCP: tts_speak, agent_screen_*
    MCP->>User: TTS, Agent Screen update
```

---

## Voice Pipeline Stages

```mermaid
flowchart LR
    A[Raw text] --> B[fillerCleaner]
    B --> C[glossaryExpander]
    C --> D[sanitizer]
    D --> E[promptOptimizer]
    E --> F[approvalGates]
    F --> G[router]
    G --> H[modelSelector]
```

---

## MCP Tools Implemented

```mermaid
flowchart TB
    subgraph Voice [Voice]
        V1[tts_speak]
        V2[tts_stop]
    end

    subgraph AgentScreen [Agent Screen]
        AS1[agent_screen_activity]
        AS2[agent_screen_file]
        AS3[agent_screen_decision]
    end

    subgraph Operators [Operators]
        OP1[operator_spawn]
        OP2[operator_switch]
        OP3[operator_list]
        OP4[operator_merge]
        OP5[operator_dismiss]
        OP6[operator_pause]
        OP7[operator_resume]
    end

    subgraph Drive [Drive]
        DR1[drive_set_mode]
    end

    subgraph CLI [Cursor CLI]
        CL1[cursor_cli_run]
        CL2[cursor_cli_create_chat]
    end
```
