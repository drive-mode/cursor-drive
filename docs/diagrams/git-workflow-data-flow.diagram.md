# Git Workflow Data Flow: Feature Branch Creation

Sequence diagram for the feature branch creation use case. Shows interaction between User, Agent, Rule, Skill, Command, Hook, and Git.

## Diagram

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Rule as git-workflow Rule
    participant Skill as git-workflow Skill
    participant Command as create-feature-branch Command
    participant Hook as beforeCommit Hook
    participant Git as Git System
    
    User->>Agent: "I want to work on authentication"
    Agent->>Rule: Load git-workflow conventions
    Rule-->>Agent: Branch naming: feature/type-description
    
    Agent->>Skill: Detect git workflow request
    Skill->>Agent: Suggest: "Create feature branch?"
    
    User->>Agent: "/create-feature-branch auth-oauth"
    Agent->>Command: Load create-feature-branch
    Command->>Agent: Instructions: Validate name, create branch
    
    Agent->>Hook: beforeCommit (validate branch name)
    Hook->>Hook: Check: matches feature/* pattern?
    Hook-->>Agent: {"permission": "allow"}
    
    Agent->>Git: git checkout -b feature/auth-oauth
    Git-->>Agent: Branch created
    
    Agent->>Hook: afterFileEdit (log branch creation)
    Hook-->>Agent: Logged
    
    Agent-->>User: "Created feature/auth-oauth branch"
```

## Steps

1. User expresses intent → Agent loads Rule for conventions
2. Skill detects git workflow → suggests branch creation
3. User invokes Command → Agent loads Command instructions
4. Hook validates branch name before git execution
5. Git creates branch
6. Hook logs activity
7. Agent confirms to user

## References

- Architecture: `git-workflow-architecture.diagram.md`
- Plan: `.cursor/plans/cursor-primitives-complete-bootstrap.plan.md`
