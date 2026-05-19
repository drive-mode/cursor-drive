---
name: steam-dota2-debug
overview: Identify which Steam components were disabled by REAPER, confirm which are required for Dota 2 to launch directly, and define an iterative fix+verify loop that updates both the machine state and REAPER’s keep/disable lists to prevent regressions.
todos:
  - id: review-steam-log
    content: Confirm Steam-related disables from audit logs.
    status: pending
  - id: snapshot-steam-state
    content: Check current Steam service/startup/protocol state.
    status: pending
  - id: research-steam-deps
    content: Validate required Steam components for Dota 2 launch.
    status: pending
  - id: plan-fix-and-guardrails
    content: Define re-enable steps and REAPER keep rules.
    status: pending
  - id: verify-and-iterate
    content: Test Dota 2 shortcut, re-evaluate if needed.
    status: pending
isProject: false
---

# Dota2 Steam Launch Debug Plan

## Evidence And Current State

- Review the most recent execution log to confirm what was disabled, using `data/audit_logs/2026-01-19_22-30-44_execution.log` as primary evidence. This already shows `Steam Client Service` was disabled during the prior run.

```51:53:C:\Users\harri\Documents\Coding Projects\cleaning_pc\data\audit_logs\2026-01-19_22-30-44_execution.log
 [22:30:58]  [OK]  DISABLED: Steam Client Service
 [22:30:58]          Was: Manual -> Now: Disabled
```

- Capture current machine state for Steam-related items (service state, startup entry, scheduled tasks, protocol handler) using targeted PowerShell queries to avoid broad changes. This confirms whether the runtime mismatch (Steam not connected) aligns with a disabled service or a missing auto-start entry.

## Root Cause Hypotheses And Research

- Start with the top hypothesis: `Steam Client Service` (`SteamService`) disabled, which can prevent Steam from handling protocol/game launches; validate with current service state and online references.
- Secondary hypotheses to check if the service is fine: Steam auto-start disabled, `steam://` protocol handler missing, or firewall rules blocking Steam client connectivity.
- Use web research to validate which Steam components are required for Dota 2 to launch from the desktop URL/shortcut, and document in `config/known_processes.yaml` if new items are discovered.

## Remediation Plan (After Confirmation)

- If `Steam Client Service` is disabled: set it to `Manual` and start it, then ensure REAPER does not disable it going forward.
- If auto-start is disabled and you want Dota 2 to launch directly without manually opening Steam, re-enable the Steam startup entry (or create a lightweight startup task). Document the preference and keep it out of REAPER’s disable set.
- If protocol handler is missing or broken, repair it via Steam reinstall/repair steps and confirm the `steam://` handler registry values.

## REAPER Guardrails

- Ensure REAPER’s service list avoids any Steam-critical items. This is already reflected in `scripts/execute_cleanup.ps1`, but we will verify and update if new items are identified.

```447:481:C:\Users\harri\Documents\Coding Projects\cleaning_pc\scripts\execute_cleanup.ps1
$services = @(
    # ...
)

if ($Level -in @("moderate", "aggressive")) {
    $services += @(
        @{Name="CortexLauncherService"; Reason="Razer Cortex - no real performance benefit"}
        @{Name="Razer Game Manager Service 3"; Reason="Razer game detection"}
        @{Name="RzActionSvc"; Reason="Razer macros - only if you use complex macros"}
        @{Name="ClickToRunSvc"; Reason="Office starts this on-demand"}
        @{Name="Apple Mobile Device Service"; Reason="Only when syncing iPhone"}
        @{Name="Bonjour Service"; Reason="iTunes network discovery"}
    )
}
```

- Update `config/known_processes.yaml` with any newly validated Steam dependencies so future analysis doesn’t misclassify them.

## Verify And Iterate

- Test by running `C:\Users\harri\Desktop\Dota 2.url` and check whether Steam connects automatically and Dota 2 launches.
- If the issue persists, re-check logs and expand hypotheses (Steam login state, Steam client repair, network connectivity). Repeat the collect → adjust → retest loop until the desktop shortcut works reliably.
