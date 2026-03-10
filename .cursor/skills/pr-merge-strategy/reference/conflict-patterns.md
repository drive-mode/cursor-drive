# Conflict Patterns and Resolution Strategies

Common merge conflict patterns and how to resolve them.

## Pattern: Same region, different edits

**Symptom:** Both branches edited the same lines in the same file.

**Strategy:**
- Fetch both versions; compare intent
- Prefer develop if PR change is obsolete; prefer PR if it supersedes
- Document choice in merge plan before merge

## Pattern: Adjacent edits

**Symptom:** Edits in nearby lines; no direct overlap but merge tool flags conflict.

**Strategy:**
- Usually auto-resolvable; keep both changes
- If tool fails, manually combine edits in logical order

## Pattern: Structural changes (imports, exports)

**Symptom:** Both branches added/removed imports or exports; ordering conflicts.

**Strategy:**
- Merge import blocks; deduplicate; sort if project convention requires
- For exports: union both sets; remove duplicates

## Pattern: Config / lockfile

**Symptom:** `package.json`, `package-lock.json`, or similar changed in both branches.

**Strategy:**
- Prefer regenerating lockfile after merge (e.g. `npm install`)
- For package.json: merge dependency lists; resolve version conflicts manually

## Pattern: Generated files

**Symptom:** Both branches modified generated output (e.g. compiled assets).

**Strategy:**
- Prefer regenerating after merge
- Document in plan: "Regenerate after merge" rather than manual resolution
