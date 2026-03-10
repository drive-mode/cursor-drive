---
name: README Redesign
overview: Convert docs/design/README-redesign-plan.md into a proper .plan.md in .cursor/plans/, with frontmatter, todos, and the full specification. Then implement the README changes per the plan.
todos: []
isProject: false
---

# README Redesign Plan

Convert [docs/design/README-redesign-plan.md](docs/design/README-redesign-plan.md) into a proper `.plan.md` file and implement the README changes.

## Step 1: Create the .plan.md file

Create [.cursor/plans/readme-redesign.plan.md](.cursor/plans/readme-redesign.plan.md) with:

**Frontmatter:**

- `planId`: readme-redesign
- `planType`: task
- `parentPlanId`: cursor-drive
- `dependsOn`: []
- `name`: README Redesign
- `overview`: Build root-level README matching popular agent/SDK repos (claude-agent-sdk-python, copilot-sdk, etc.). Voice-first, multi-operator, Cursor IDE extension.
- `todos`: 8 items mapping to Implementation Order (section 7 of the design doc)

**Body:** Migrate all content from [docs/design/README-redesign-plan.md](docs/design/README-redesign-plan.md) into the plan body, preserving:

- Benchmark findings table
- Proposed section order
- Section-by-section specification (3.1–3.13)
- Content cuts, additions, target metrics
- Implementation order
- Out of scope
- References

**Todo IDs and content:**

- `rdr-01-restructure`: Reorder README sections per proposed order
- `rdr-02-install-quickstart`: Split Install + Quick Start, add prerequisites
- `rdr-03-key-decisions`: Convert Key design decisions to table
- `rdr-04-support`: Add Support / Contributing section
- `rdr-05-license`: Add License section (LICENSE exists)
- `rdr-06-badges`: Add badges if CI supports
- `rdr-07-polish`: Trim prose, verify links
- `rdr-08-optional`: FAQ, second diagram, TOC (optional)

## Step 2: Register in plan-graph

Add entry to [.cursor/plans/plan-graph.yaml](.cursor/plans/plan-graph.yaml):

```yaml
- id: readme-redesign
  file: .cursor/plans/readme-redesign.plan.md
  title: README Redesign
  plan_type: task
  state: pending
  parent_plan_id: cursor-drive
  depends_on: []
```

## Step 3: Handle source doc

**Option A:** Delete [docs/design/README-redesign-plan.md](docs/design/README-redesign-plan.md) after migration (plan is canonical).
**Option B:** Keep as reference; add a one-line note at top: "Superseded by .cursor/plans/readme-redesign.plan.md"

Recommend Option B for traceability.

## File locations


| Action          | Path                                                        |
| --------------- | ----------------------------------------------------------- |
| Create          | `.cursor/plans/readme-redesign.plan.md`                     |
| Edit            | `.cursor/plans/plan-graph.yaml`                             |
| Edit (optional) | `docs/design/README-redesign-plan.md` (add superseded note) |


## Plan body structure (from design doc)

The plan body will include sections 1–9 from the design doc:

1. Benchmark Findings
2. Proposed Section Order
3. Section-by-Section Specification (3.1–3.13)
4. Content Cuts and Consolidations
5. Additions from benchmarks
6. Target Metrics
7. Implementation Order (maps to todos)
8. Out of Scope
9. References
