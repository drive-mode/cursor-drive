---
planId: plan-governance
planType: project
isProject: true
parentPlanId: cursor-drive-v1
childPlanIds:
  - plans-audit-and-cleanup
dependsOn: []
overview: Plan governance and cleanup for Cursor Drive. Single child plan plans-audit-and-cleanup covers filter/audit and directory cleanup. Archives completed/superseded, deduplicates.
todos:
  - id: complete-plans-audit-cleanup
    content: Complete plans-audit-and-cleanup child plan
    status: pending
  - id: sync-registry
    content: Run plan-sync after any plan changes
    status: pending
---
