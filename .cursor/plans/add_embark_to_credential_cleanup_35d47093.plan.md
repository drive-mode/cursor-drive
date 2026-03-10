---
name: Add Embark to credential cleanup
overview: Add the Embark Studios (game launcher) credential to the existing cleanup script and document it in the notes so it gets removed with the rest.
todos: []
isProject: false
---

# Add Embark to credential cleanup

## Change 1: Script

In [scripts/remove-unused-credentials.ps1](scripts/remove-unused-credentials.ps1), add one entry to the `$removePatterns` array so the Embark credential is included:

```powershell
'LegacyGeneric:target=EmbarkID/embark-discovery/',
```

Place it with the other `LegacyGeneric` patterns (e.g. after JianyingPro). No other script logic changes.

## Change 2: Docs (optional)

In [docs/credential-cleanup-notes.md](docs/credential-cleanup-notes.md), add a short “Embark” bullet under a “Removed by script” or “What the script removes” section so you have a record:

- **EmbarkID/embark-discovery/discovery-live** – Embark Studios game launcher (THE FINALS, etc.). Safe to remove if you don’t use their games or launcher.

## After applying

Run the script again (same as before). The Embark credential will be deleted with the rest. If any entry fails with “access denied,” run PowerShell as Administrator and re-run the script.
