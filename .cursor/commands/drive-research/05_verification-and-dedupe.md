# Verification and Dedupe Check

## Focus
Verify plan consistency, detect duplicates, and validate dependencies.

## Input
Read ALL files:
- `.cursor/plans/*.plan.md`
- `.cursor/plans/plan-graph.yaml` (if exists)
- `.cursor/plans/task-graph.yaml` (if exists)
- `docs/research/drive-tech/_synthesis/04_dependency-dag.md`

## Checks to perform

### 1. PlanId consistency
- Every plan file has a unique planId in frontmatter
- All planId references (parentPlanId, dependsOn, childPlanIds) resolve to existing plans
- No orphan plans (every non-root plan has a valid parent)

### 2. Dependency cycle detection
- Build dependency graph from dependsOn fields
- Check for cycles (A depends on B depends on A)
- Report any cycles found

### 3. Duplicate TODO detection
- Extract all TODOs across all plans
- Compare for semantic duplicates (same intent, different wording)
- Report duplicates with plan file locations

### 4. Stale assumption detection
- Check TODOs against research decisions (ADOPT/PROTOTYPE/DEFER/REJECT)
- Flag TODOs that conflict with research recommendations
- Flag TODOs referencing DEFERred technologies as if they were adopted

### 5. Acceptance criteria coverage
- Every TODO must have acceptance criteria
- Report TODOs missing acceptance criteria

### 6. Timeline violation detection
- Scan all TODOs for time-related language (weeks, days, sprints, Q1, Q2, deadlines)
- Report violations

## Output format
```markdown
## Verification Report

### Passed
- [x] Check name — details

### Failed
- [ ] Check name — details + location

### Warnings
- [!] Check name — details
```

## Automation approach
This check can be partially automated via:
1. YAML frontmatter parsing (planId, dependsOn)
2. Regex for timeline language
3. TODO extraction and comparison
4. Graph traversal for cycles

Recommend adding as a pre-commit hook or CI step.
