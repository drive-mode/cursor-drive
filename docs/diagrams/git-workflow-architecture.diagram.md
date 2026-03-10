# Git Workflow Architecture

Primitive orchestration for git workflow management. Shows how Rule, Command, Skill, Subagent, and Hooks work together.

## Diagram

```mermaid
flowchart TD
    User[User Action] --> Agent[Cursor Agent]
    
    Agent --> CheckGitContext{Git Operation?}
    CheckGitContext -->|Yes| LoadGitRule[Load git-workflow.mdc Rule]
    CheckGitContext -->|No| NormalFlow[Normal Flow]
    
    LoadGitRule --> CheckSkill{Git Workflow Skill Relevant?}
    CheckSkill -->|Yes| LoadSkill[Load git-workflow Skill]
    CheckSkill -->|No| CheckCommand{Command Invoked?}
    
    LoadSkill --> CheckCommand
    CheckCommand -->|/create-feature-branch| LoadCommand[Load Command]
    CheckCommand -->|No| CheckSubagent{Subagent Needed?}
    
    LoadCommand --> ExecuteCommand[Execute Branch Creation]
    
    CheckSubagent -->|Proactive Monitoring| SpawnSubagent[Spawn git-workflow-manager Subagent]
    CheckSubagent -->|No| Execute[Execute]
    
    SpawnSubagent --> SubagentWork[Subagent: Monitor Changes, Suggest Actions]
    
    Execute --> BeforeHook[Before Hooks]
    ExecuteCommand --> BeforeHook
    SubagentWork --> BeforeHook
    
    BeforeHook --> ValidateCommit{Validate Commit?}
    ValidateCommit -->|Invalid| Block[Block with Message]
    ValidateCommit -->|Valid| Action[Perform Git Action]
    
    Action --> AfterHook[After Hooks]
    AfterHook --> Log[Log Git Activity]
    AfterHook --> Result[Return Result]
    
    Block --> User
    Result --> User
```

## Primitive roles

| Primitive | Role | When |
|-----------|------|------|
| **Rule** | What (standards) | Git context active |
| **Command** | How (manual procedure) | `/create-feature-branch` invoked |
| **Skill** | When (orchestration) | Git workflow request detected |
| **Subagent** | Who (proactive specialist) | Monitoring, suggestions |
| **Hooks** | Enforcement | Before commits, validation |

## References

- Plan: `.cursor/plans/cursor-primitives-complete-bootstrap.plan.md`
- Rule: `.cursor/rules/git-workflow.mdc`
- Skill: `.cursor/skills/git-workflow/SKILL.md`
- Data flow: `git-workflow-data-flow.diagram.md`
