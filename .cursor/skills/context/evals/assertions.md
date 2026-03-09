# Context skill — grading assertions

Checkbox list per eval. Use for manual or automated grading of context skill behavior.

---

## Eval 1: basic-report

- [ ] Output includes token count total
- [ ] Output shows at least 3 categories (system_prompt, loaded_files, conversation minimum)
- [ ] Output includes workflow type label
- [ ] At least one file flagged as candidate for optimization
- [ ] Output does NOT apply any changes (report only)

---

## Eval 2: optimize-with-confirmation

- [ ] Agent generates proposal before applying
- [ ] Proposal shows token delta (before vs after)
- [ ] Agent explicitly pauses and asks for confirmation when full→exclude change proposed
- [ ] Agent does NOT apply changes without user confirmation

---

## Eval 3: prior-cold-start

- [ ] Agent does not crash when prior is empty
- [ ] Agent falls back to flag-based heuristics
- [ ] Agent notes first session / no prior data
- [ ] Agent still produces valid proposal

---

## Eval 4: prior-warm-start

- [ ] Agent loads and displays content from workflow-priors.yaml
- [ ] Agent reports session count for detected workflow
- [ ] Agent mentions at least one learned pattern (reliable_outline or reliable_exclude)

---

## Eval 5: learn-after-session

- [ ] workflow-priors.yaml is updated after the command
- [ ] Session counter increments
- [ ] Outcome recorded as success
- [ ] Agent reports what changed in the prior
