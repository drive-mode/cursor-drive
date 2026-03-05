# Implemented Features Flow

Mermaid diagrams of implemented Cursor Drive features. Renders in any Markdown viewer that supports Mermaid (GitHub, VS Code, etc.).

---

## 1. Main Pipeline Flow

```mermaid
flowchart TB
    subgraph Input [User Input]
        A[User types or speaks]
    end

    subgraph Gate [Drive Gate]
        B{Drive active?}
        C[Wake word: activate + strip]
        D[activateVoiceInput for next turn]
    end

    subgraph Pipeline [Pipeline Stages]
        E[fillerCleaner]
        F[glossaryExpander]
        G[sanitizer]
        H[promptOptimizer]
        I[approvalGates]
        J[sessionMemory]
        K[router]
        L[modelSelector]
    end

    subgraph Tangent [Tangent Flow]
        M{tangent keyword?}
        N[extractTangentNameAndTask]
        O[confirmTangentAgent]
        P[operatorRegistry.spawn]
    end

    subgraph Output [Model + Response]
        Q[Main model call]
        R[responseFormatter]
        S[tts.speak via MCP]
    end

    A --> B
    B -->|No| C
    C --> D
    B -->|Yes| E
    E --> F --> G --> H --> I --> J --> K --> L
    K --> M
    M -->|Yes| N --> O --> P
    M -->|No| Q
    L --> Q
    Q --> R --> S
```

---

## 2. MCP Bridge: AI to Extension

```mermaid
flowchart LR
    subgraph AI [Cursor AI]
        A1[Calls MCP tools]
    end

    subgraph Server [MCP Server :7891]
        B1[mcpServer.ts]
    end

    subgraph Extension [Extension]
        C1[agentScreen.postEvent]
        C2[tts.speak]
        C3[operatorRegistry]
        C4[statusBar]
        C5[driveMode]
    end

    subgraph UI [User Visible]
        D1[Agent Screen webview]
        D2[Speaker]
        D3[Status bar]
    end

    A1 --> B1
    B1 --> C1
    B1 --> C2
    B1 --> C3
    B1 --> C4
    B1 --> C5
    C1 --> D1
    C2 --> D2
    C4 --> D3
```

---

## 3. Operator Lifecycle

```mermaid
flowchart TB
    subgraph Spawn [Spawn]
        S1[tangent keyword or operator_spawn]
        S2[operatorRegistry.spawn]
        S3[worktreeManager allocates]
    end

    subgraph Active [Active]
        A1[Foreground operator]
        A2[Background operators]
        A3[commsAgent batches updates]
    end

    subgraph Switch [Switch]
        W1[operator_switch]
        W2[Foreground changes]
    end

    subgraph Merge [Merge]
        M1[operator_merge]
        M2[Context combined]
    end

    subgraph Dismiss [Dismiss]
        D1[operator_dismiss]
        D2[Worktree released]
    end

    S1 --> S2 --> S3
    S2 --> A1
    S2 --> A2
    A2 --> A3
    W1 --> W2
    M1 --> M2
    D1 --> D2
```

---

## 4. UI Surfaces

```mermaid
flowchart TB
    subgraph Surfaces [Drive UI Surfaces]
        U1[Status Bar: Drive > Mode | Operator]
        U2[Agent Screen: Activity | Files | Decisions | Sync]
        U3[Drive Sidebar: Activity Bar panel]
        U4[QuickPick: mode switch, operator switcher]
    end

    subgraph Sources [Data Sources]
        D1[mcpServer agent_screen_*]
        D2[operatorRegistry]
        D3[driveMode]
    end

    D1 --> U2
    D2 --> U1
    D2 --> U4
    D3 --> U1
    D3 --> U4
```

---

## 5. Module to ADR/PRD Map

| Module | ADRs | PRDs |
|--------|------|------|
| pipeline.ts | 0005, 0009, 0012 | 1, 2 |
| fillerCleaner, glossaryExpander, sanitizer | 0012 | 1 |
| promptOptimizer | 0012 | 1 |
| tts, voiceCommands | 0012 | 1 |
| mcpServer | 0003, 0004, 0016, 0022 | 3, 5 |
| operatorRegistry, commsAgent | 0004, 0016, 0020, 0021 | 3 |
| agentScreen, agentScreenApp | 0003, 0016, 0017 | 5 |
| approvalGates, toolAllowlist | 0005, 0020 | 4 |
| sessionMemory, persistentMemory | 0015, 0005 | 2 |
| worktreeManager, syncLedger, integrationQueue | 0022 | 3 |
| driveMode, statusBar, driveSidebar | 0002, 0008, 0013 | 5 |
