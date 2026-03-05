#!/usr/bin/env python3
"""Plan lifecycle hook runner with hierarchy-aware validation and registry sync.

Usage:
  .cursor/hooks/plan-runner.py <eventName>

Events: session Start, stop, sessionEnd, subagentStop, beforeSubmitPrompt, sync-registry

The runner is intentionally fail-soft:
- validates project/subplan hierarchy and metadata contracts
- evaluates TODO semantic completion for project child checks
- sync-registry: updates .cursor/plans/registry.yaml with todo counts (TODO-empty = completion signal)
- emits machine-readable JSON
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml
except Exception:  # pragma: no cover - fail-soft for hook environment
    yaml = None


ROOT = Path(__file__).resolve().parents[2]
PLAN_GRAPH = ROOT / ".cursor" / "plans" / "plan-graph.yaml"
REGISTRY = ROOT / ".cursor" / "plans" / "registry.yaml"
PLANS_DIR = ROOT / ".cursor" / "plans"
ARCHIVE_DIR = ROOT / ".cursor" / "plans" / "archive"


def _load_yaml(path: Path) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    errors: List[str] = []
    if yaml is None:
        return None, ["PyYAML unavailable; cannot evaluate governance checks."]
    try:
        parsed = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(parsed, dict):
            return None, [f"{path} must parse to a mapping."]
        return parsed, []
    except Exception as exc:
        return None, [f"Failed parsing YAML {path}: {exc}"]


def _read_frontmatter(path: Path) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    errors: List[str] = []
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None, [f"{path} missing frontmatter."]
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
    if not match:
        return None, [f"{path} has malformed frontmatter delimiters."]
    if yaml is None:
        return None, [f"PyYAML unavailable; cannot parse frontmatter for {path}."]
    try:
        data = yaml.safe_load(match.group(1)) or {}
        if not isinstance(data, dict):
            return None, [f"{path} frontmatter must be a mapping."]
        return data, []
    except Exception as exc:
        return None, [f"{path} frontmatter parse error: {exc}"]


def _normalize_parent(value: Any) -> Optional[str]:
    if value in (None, "", "null"):
        return None
    return str(value)


def _remaining_todos(frontmatter: Dict[str, Any]) -> List[str]:
    todos = frontmatter.get("todos", [])
    if not isinstance(todos, list):
        return ["todos frontmatter must be a list"]
    remaining: List[str] = []
    for item in todos:
        if not isinstance(item, dict):
            remaining.append("invalid-todo-item")
            continue
        status = str(item.get("status", "pending")).lower()
        todo_id = str(item.get("id", "unknown"))
        if status not in {"completed", "cancelled"}:
            remaining.append(todo_id)
    return remaining


def _validate_plan_graph(graph: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []

    plans = graph.get("plans", [])
    if not isinstance(plans, list):
        return {"errors": ["plan-graph.yaml plans must be a list."], "warnings": []}

    id_map: Dict[str, Dict[str, Any]] = {}
    for plan in plans:
        if not isinstance(plan, dict):
            errors.append("Each plan entry must be a mapping.")
            continue
        plan_id = plan.get("id")
        if not plan_id:
            errors.append("Plan entry missing id.")
            continue
        if plan_id in id_map:
            errors.append(f"Duplicate plan id: {plan_id}")
            continue
        id_map[str(plan_id)] = plan

    frontmatter_map: Dict[str, Dict[str, Any]] = {}
    for plan_id, plan in id_map.items():
        plan_file = plan.get("file")
        if not plan_file:
            errors.append(f"{plan_id} missing file field.")
            continue
        path = ROOT / str(plan_file)
        if not path.exists():
            errors.append(f"{plan_id} references missing file: {plan_file}")
            continue

        if path.suffix == ".md":
            frontmatter, fm_errors = _read_frontmatter(path)
            if fm_errors:
                errors.extend(fm_errors)
            elif frontmatter is not None:
                frontmatter_map[plan_id] = frontmatter

    for plan_id, plan in id_map.items():
        parent = _normalize_parent(plan.get("parent_plan_id"))
        if parent and parent not in id_map:
            errors.append(f"{plan_id} has unknown parent_plan_id: {parent}")

        for child_id in plan.get("child_plan_ids", []) or []:
            if child_id not in id_map:
                errors.append(f"{plan_id} child_plan_ids references unknown id: {child_id}")
                continue
            child_parent = _normalize_parent(id_map[child_id].get("parent_plan_id"))
            if child_parent != plan_id:
                errors.append(
                    f"{plan_id} lists child {child_id} but child parent_plan_id is {child_parent}"
                )

    for plan_id, plan in id_map.items():
        frontmatter = frontmatter_map.get(plan_id)
        if frontmatter is None:
            continue
        graph_type = plan.get("plan_type")
        fm_type = frontmatter.get("planType")
        if graph_type and fm_type and str(graph_type) != str(fm_type):
            errors.append(
                f"{plan_id} plan type mismatch graph={graph_type} frontmatter={fm_type}"
            )

        fm_plan_id = frontmatter.get("planId")
        if fm_plan_id and str(fm_plan_id) != plan_id:
            errors.append(f"{plan_id} frontmatter planId mismatch: {fm_plan_id}")

        graph_parent = _normalize_parent(plan.get("parent_plan_id"))
        fm_parent = _normalize_parent(frontmatter.get("parentPlanId"))
        if graph_parent != fm_parent:
            errors.append(
                f"{plan_id} parent mismatch graph={graph_parent} frontmatter={fm_parent}"
            )

    for plan_id, plan in id_map.items():
        if plan.get("plan_type") != "project":
            continue
        child_ids = plan.get("child_plan_ids", []) or []
        if not child_ids:
            warnings.append(f"{plan_id} is project type but has no child_plan_ids.")
            continue
        for child_id in child_ids:
            child_fm = frontmatter_map.get(child_id)
            if child_fm is None:
                continue
            remaining = _remaining_todos(child_fm)
            if str(plan.get("state", "")).lower() == "completed" and remaining:
                errors.append(
                    f"{plan_id} is completed but child {child_id} has remaining TODOs: {remaining}"
                )

    # Run required checks for each plan
    for plan_id, plan in id_map.items():
        for check_name in plan.get("required_checks", []) or []:
            if check_name == "check_docs_exist":
                for ev in plan.get("evidence", []) or []:
                    ev_path = ROOT / str(ev)
                    if not ev_path.exists():
                        errors.append(f"{plan_id} evidence missing: {ev}")
            elif check_name == "check_plan_links_resolve":
                plan_file = plan.get("file")
                if plan_file:
                    plan_path = ROOT / str(plan_file)
                    if plan_path.exists():
                        link_errors = _check_plan_links(plan_path)
                        errors.extend([f"{plan_id}: {e}" for e in link_errors])
            elif check_name == "check_dependency_completed":
                for dep_id in plan.get("depends_on", []) or []:
                    dep_plan = id_map.get(dep_id)
                    if dep_plan and str(dep_plan.get("state", "")).lower() != "completed":
                        errors.append(f"{plan_id} depends on {dep_id} which is not completed")
            elif check_name == "check_child_plans_complete":
                for child_id in plan.get("child_plan_ids", []) or []:
                    child_fm = frontmatter_map.get(child_id)
                    if child_fm is not None:
                        rem = _remaining_todos(child_fm)
                        if rem:
                            errors.append(f"{plan_id} child {child_id} has remaining TODOs: {rem}")

    return {"errors": errors, "warnings": warnings, "plan_count": len(id_map)}


def _check_plan_links(plan_path: Path) -> List[str]:
    """Extract markdown links [text](path) and verify path exists. Returns list of error messages."""
    errors: List[str] = []
    text = plan_path.read_text(encoding="utf-8")
    # Match [text](path) - path can be relative
    for m in re.finditer(r"\]\(([^)]+)\)", text):
        link_path = m.group(1).strip()
        if link_path.startswith(("http://", "https://", "#", "mailto:")):
            continue
        if ":" in link_path.split("/")[0] and len(link_path) > 1:
            continue  # skip url-like
        resolved = (plan_path.parent / link_path).resolve()
        try:
            rel = resolved.relative_to(ROOT)
        except ValueError:
            continue
        if not resolved.exists():
            errors.append(f"link target not found: {link_path}")
    return errors


def _plan_has_reconciliation(path: Path) -> Tuple[bool, str]:
    """Check plan body has ## Reconciliation or ## Completion Summary with non-empty content."""
    text = path.read_text(encoding="utf-8")
    for heading in ("## Reconciliation", "## Completion Summary", "## Reconciliation Summary"):
        if heading not in text:
            continue
        # Find content after heading until next ## or end
        idx = text.find(heading)
        rest = text[idx + len(heading) :]
        # Strip to next ## or EOF
        next_h2 = rest.find("\n## ")
        if next_h2 >= 0:
            rest = rest[:next_h2]
        content = rest.strip()
        if len(content) > 20:  # Non-trivial content
            return True, ""
    return False, "Plan must include ## Reconciliation or ## Completion Summary with content before semantic completion."


def _run_command(cmd: str, cwd: Path) -> Tuple[bool, str]:
    """Run shell command. Returns (success, error_message)."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            err = result.stderr or result.stdout or ""
            return False, f"Command failed (exit {result.returncode}): {cmd}\n{err[:500]}"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, f"Command timed out: {cmd}"
    except Exception as e:
        return False, f"Command error: {e}"


def _run_on_todo_complete(
    graph: Dict[str, Any],
    plan_id: str,
    plan_file: str,
    frontmatter: Dict[str, Any],
) -> List[str]:
    """Run on_todo_complete actions for a TODO-empty plan. Returns list of error messages."""
    errors: List[str] = []
    actions = graph.get("settings", {}).get("on_todo_complete") or []
    if not actions:
        return []

    path = ROOT / str(plan_file)
    if not path.exists():
        return [f"{plan_id}: plan file not found for on_todo_complete"]

    for action in actions:
        if not isinstance(action, dict):
            continue
        if action.get("require_reconciliation"):
            ok, msg = _plan_has_reconciliation(path)
            if not ok:
                errors.append(f"{plan_id}: {msg}")
        if "run" in action:
            cmd = action["run"]
            ok, msg = _run_command(cmd, ROOT)
            if not ok:
                errors.append(f"{plan_id} on_todo_complete: {msg}")

    return errors


def _get_todo_empty_plans(graph: Dict[str, Any]) -> List[Tuple[str, str, Dict[str, Any]]]:
    """Return list of (plan_id, plan_file, frontmatter) for plans with no remaining TODOs."""
    result: List[Tuple[str, str, Dict[str, Any]]] = []
    for plan in graph.get("plans", []) or []:
        plan_id = plan.get("id")
        plan_file = plan.get("file")
        if not plan_id or not plan_file:
            continue
        path = ROOT / str(plan_file)
        if not path.exists():
            continue
        frontmatter, _ = _read_frontmatter(path)
        if frontmatter is None:
            continue
        if _remaining_todos(frontmatter):
            continue
        # Skip project plans (they complete when children complete)
        if plan.get("plan_type") == "project":
            continue
        result.append((plan_id, plan_file, frontmatter))
    return result


def _scan_and_register_new_plans(graph: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Scan PLANS_DIR for .plan.md files not yet in plan-graph.yaml.

    For each unregistered file, read frontmatter and add a minimal entry to the graph
    (in-memory). Caller must write the graph back to disk if desired.

    Returns (new_plan_ids, messages).
    """
    if yaml is None:
        return [], ["PyYAML unavailable; cannot scan for new plans."]

    existing_files: set = set()
    for plan in graph.get("plans", []) or []:
        f = plan.get("file")
        if f:
            # Normalise separators for comparison
            existing_files.add(str(f).replace("\\", "/"))

    new_ids: List[str] = []
    messages: List[str] = []

    for plan_file in sorted(PLANS_DIR.glob("*.plan.md")):
        rel = str(plan_file.relative_to(ROOT)).replace("\\", "/")
        if rel in existing_files:
            continue

        frontmatter, errs = _read_frontmatter(plan_file)
        if frontmatter is None:
            messages.append(f"Skip {plan_file.name}: {'; '.join(errs)}")
            continue

        # Derive planId: prefer frontmatter field, fall back to filename stem
        plan_id = (
            frontmatter.get("planId")
            or frontmatter.get("id")
            or plan_file.stem.replace(".plan", "")
        )
        plan_id = str(plan_id)

        # Avoid duplicate IDs
        existing_ids = {p.get("id") for p in graph.get("plans", []) or []}
        if plan_id in existing_ids:
            # Suffix with filename hash fragment to de-duplicate
            plan_id = plan_file.stem.replace(".plan", "")

        plan_name = frontmatter.get("name", plan_id)
        depends_on = frontmatter.get("dependsOn") or []
        if isinstance(depends_on, str):
            depends_on = [depends_on]
        plan_type = frontmatter.get("planType", "task")
        parent_id = frontmatter.get("parentPlanId")

        new_entry: Dict[str, Any] = {
            "id": plan_id,
            "file": rel,
            "title": plan_name,
            "plan_type": plan_type,
            "state": "pending",
            "depends_on": depends_on,
        }
        if parent_id:
            new_entry["parent_plan_id"] = str(parent_id)

        graph.setdefault("plans", []).append(new_entry)
        existing_files.add(rel)
        new_ids.append(plan_id)
        messages.append(f"Registered new plan: {plan_id} ({plan_file.name})")

    return new_ids, messages


def _write_plan_graph(graph: Dict[str, Any]) -> Tuple[bool, str]:
    """Write the in-memory graph dict back to plan-graph.yaml."""
    if yaml is None:
        return False, "PyYAML unavailable; cannot write plan-graph.yaml."
    try:
        PLAN_GRAPH.write_text(
            yaml.dump(graph, default_flow_style=False, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
        return True, "plan-graph.yaml updated."
    except Exception as exc:
        return False, f"Failed to write plan-graph.yaml: {exc}"


def _sync_registry(graph: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Update registry.yaml with todo counts from plan files. Returns (success, messages)."""
    if yaml is None:
        return False, ["PyYAML unavailable; cannot sync registry."]

    # Load or create registry
    registry: Dict[str, Any] = {"version": 1, "project_id": "cursor-drive", "plans": []}
    plan_id_to_registry_id: Dict[str, str] = {}
    next_num = 1

    if REGISTRY.exists():
        reg_data, _ = _load_yaml(REGISTRY)
        if reg_data:
            registry = reg_data
            for p in registry.get("plans", []) or []:
                pid = p.get("planId")
                rid = p.get("id")
                if pid and rid:
                    plan_id_to_registry_id[str(pid)] = str(rid)
                    # Parse next number from cd-NNN
                    if rid.startswith("cd-"):
                        try:
                            n = int(rid.split("-")[1])
                            next_num = max(next_num, n + 1)
                        except ValueError:
                            pass

    graph_plans = graph.get("plans", []) or []
    updated_plans: List[Dict[str, Any]] = []
    seen_plan_ids: set = set()

    for plan in graph_plans:
        plan_id = plan.get("id")
        if not plan_id or plan_id in seen_plan_ids:
            continue
        seen_plan_ids.add(plan_id)

        file_path = plan.get("file")
        if not file_path:
            continue
        path = ROOT / str(file_path)
        if not path.exists():
            continue

        frontmatter, _ = _read_frontmatter(path)
        if frontmatter is None:
            continue

        remaining = _remaining_todos(frontmatter)
        todos = frontmatter.get("todos", [])
        total = len(todos) if isinstance(todos, list) else 0
        todo_count = len(remaining)
        todo_empty = todo_count == 0
        is_project = bool(frontmatter.get("isProject") or plan.get("plan_type") == "project")

        reg_id = plan_id_to_registry_id.get(plan_id)
        if not reg_id:
            reg_id = f"cd-{next_num:03d}"
            next_num += 1

        updated_plans.append({
            "id": reg_id,
            "planId": plan_id,
            "file": file_path,
            "plan_type": plan.get("plan_type", "task"),
            "todo_count": todo_count,
            "todo_empty": todo_empty,
            "is_project": is_project,
        })

    # Include archived plans (scan archive dir, supports archive/{project}/)
    if ARCHIVE_DIR.exists():
        for f in ARCHIVE_DIR.rglob("*.plan.md"):
            rel = str(f.relative_to(ROOT)).replace("\\", "/")
            # Check if already in registry
            if any(p.get("file") == rel for p in updated_plans):
                continue
            frontmatter, _ = _read_frontmatter(f)
            if frontmatter is None:
                continue
            plan_id = frontmatter.get("planId") or f.stem.replace(".plan", "")
            remaining = _remaining_todos(frontmatter)
            reg_id = plan_id_to_registry_id.get(plan_id) or f"cd-{next_num:03d}"
            if not plan_id_to_registry_id.get(plan_id):
                next_num += 1
            updated_plans.append({
                "id": reg_id,
                "planId": plan_id,
                "file": rel,
                "plan_type": frontmatter.get("planType", "task"),
                "todo_count": len(remaining),
                "todo_empty": len(remaining) == 0,
                "is_project": False,
                "archived": True,
            })

    registry["plans"] = updated_plans
    registry["last_synced"] = datetime.now(timezone.utc).isoformat()

    try:
        REGISTRY.parent.mkdir(parents=True, exist_ok=True)
        REGISTRY.write_text(yaml.dump(registry, default_flow_style=False, sort_keys=False), encoding="utf-8")
        return True, [f"Registry synced: {len(updated_plans)} plans"]
    except Exception as e:
        return False, [f"Failed to write registry: {e}"]


def emit(decision: str, reason: str, details: Optional[Dict[str, Any]] = None) -> int:
    payload: Dict[str, Any] = {"decision": decision, "reason": reason}
    if details:
        payload["details"] = details
    print(json.dumps(payload))
    return 0 if decision != "deny" else 2


def main() -> int:
    event = sys.argv[1] if len(sys.argv) > 1 else "unknown"
    if not PLAN_GRAPH.exists():
        return emit(
            "warn",
            "plan-graph not found; plan governance checks skipped",
            {"event": event},
        )

    valid_events = {"sessionStart", "stop", "sessionEnd", "subagentStop", "beforeSubmitPrompt", "sync-registry", "scan-new"}
    if event not in valid_events:
        return emit("allow", "unknown event; no action", {"event": event})

    graph, graph_errors = _load_yaml(PLAN_GRAPH)
    if graph_errors or graph is None:
        return emit(
            "warn",
            "plan governance validation unavailable",
            {
                "event": event,
                "errors": graph_errors,
                "reminder": "Update plan TODOs as each completed task is finished.",
            },
        )

    # scan-new: discover .plan.md files not yet in plan-graph and register them
    if event == "scan-new":
        new_ids, msgs = _scan_and_register_new_plans(graph)
        if new_ids:
            ok, write_msg = _write_plan_graph(graph)
            msgs.append(write_msg)
            # Also sync registry so counts are fresh
            _sync_registry(graph)
        summary = f"{len(new_ids)} new plan(s) registered" if new_ids else "No new plans found"
        return emit("allow", summary, {"newPlans": new_ids, "messages": msgs})

    # sync-registry: update registry + auto-discover new plans
    if event == "sync-registry":
        new_ids, scan_msgs = _scan_and_register_new_plans(graph)
        if new_ids:
            _write_plan_graph(graph)
        ok, reg_msgs = _sync_registry(graph)
        all_msgs = scan_msgs + reg_msgs
        if new_ids:
            all_msgs.insert(0, f"Auto-registered {len(new_ids)} new plan(s): {', '.join(new_ids)}")
        return emit("allow" if ok else "warn", all_msgs[0] if all_msgs else "Registry synced", {"messages": all_msgs})

    # beforeSubmitPrompt fires on every prompt — keep output minimal to avoid
    # injecting file paths into agent context (which causes spurious editor opens).
    if event == "beforeSubmitPrompt":
        return emit(
            "allow",
            "plan governance active",
            {"reminder": "Map work to a plan TODO before implementing."},
        )

    # At sessionStart, auto-discover any new plan files and register them
    new_plan_ids: List[str] = []
    if event == "sessionStart":
        new_plan_ids, _scan_msgs = _scan_and_register_new_plans(graph)
        if new_plan_ids:
            _write_plan_graph(graph)

    report = _validate_plan_graph(graph)

    # Strip file paths from error/warning strings so Cursor doesn't auto-open them.
    def _redact_paths(messages: List[str]) -> List[str]:
        return [re.sub(r"[\w./\\-]+\.(?:md|yaml|py|ts|json)", "<file>", m) for m in messages]

    details = {
        "event": event,
        "planCount": report.get("plan_count", 0),
        "errors": _redact_paths(report.get("errors", [])),
        "warnings": _redact_paths(report.get("warnings", [])),
        "reminder": "Update plan TODOs as each completed task is finished.",
    }
    if new_plan_ids:
        details["newPlansRegistered"] = new_plan_ids

    # On stop/subagentStop: sync registry and run on_todo_complete for TODO-empty plans
    if event in {"stop", "subagentStop"}:
        ok, sync_msgs = _sync_registry(graph)
        details["registrySync"] = ["synced" if ok else "sync-failed"]

        # Run on_todo_complete gate for plans with no remaining TODOs
        gate_errors: List[str] = []
        for plan_id, plan_file, frontmatter in _get_todo_empty_plans(graph):
            gate_errors.extend(_run_on_todo_complete(graph, plan_id, plan_file, frontmatter))
        details["errors"].extend(_redact_paths(gate_errors))
        if gate_errors:
            details["onTodoCompleteBlocked"] = True

    if details["errors"]:
        return emit("warn", "plan governance validation failed", details)
    if details["warnings"]:
        return emit("warn", "plan governance validation passed with warnings", details)

    return emit("allow", "plan governance validation passed", details)


if __name__ == "__main__":
    raise SystemExit(main())
