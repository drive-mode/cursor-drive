<#
.SYNOPSIS
  Sets up the sandbox workspace for Cursor Drive live testing.

.DESCRIPTION
  Creates sandbox\.cursor as a real directory with junctions to the repo's
  .cursor subdirs (skills, plans, rules, agents, commands, hooks). Writes a
  sandbox-specific mcp.json so the Drive MCP server uses port 7892 (avoids
  conflict with main Cursor window on 7891). Any changes to .cursor\skills\,
  .cursor\commands\, .cursor\hooks\, etc. in the repo are immediately visible
  in the sandbox via the junctions.

.NOTES
  Run once from the repo root:
    .\sandbox\setup-drive-dev.ps1
  Requires no admin rights on most Windows 10/11 systems (junctions are
  available to normal users for directories).
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sandboxCursor = Join-Path $PSScriptRoot '.cursor'
$repoCursor = Join-Path $repoRoot    '.cursor'

$SANDBOX_MCP_PORT = 7892

if (-not (Test-Path $repoCursor -PathType Container)) {
  Write-Error "Repo .cursor not found at: $repoCursor"
  exit 1
}

# Remove existing sandbox\.cursor (directory or junction)
if (Test-Path $sandboxCursor) {
  $item = Get-Item $sandboxCursor -Force
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    Write-Host "Removing existing junction: $sandboxCursor"
    [System.IO.Directory]::Delete($sandboxCursor, $false)
  }
  else {
    Write-Host "Removing existing directory: $sandboxCursor"
    Remove-Item -Recurse -Force $sandboxCursor
  }
}

# Create sandbox\.cursor as a real directory
New-Item -ItemType Directory -Path $sandboxCursor -Force | Out-Null

# Junction each subdir from repo .cursor so skills/plans/hooks etc. stay in sync
$subdirs = @('skills', 'plans', 'rules', 'agents', 'commands', 'hooks')
foreach ($dir in $subdirs) {
  $repoSub = Join-Path $repoCursor $dir
  $sandSub = Join-Path $sandboxCursor $dir
  if (Test-Path $repoSub -PathType Container) {
    New-Item -ItemType Junction -Path $sandSub -Value $repoSub | Out-Null
    Write-Host "Junction: $sandSub -> $repoSub"
  }
}

# Sandbox-specific mcp.json: Drive server on port 7892 (no conflict with main window on 7891)
$mcpJson = @{ mcpServers = @{ drive = @{ url = "http://127.0.0.1:$SANDBOX_MCP_PORT/mcp" } } } | ConvertTo-Json -Depth 3
Set-Content -Path (Join-Path $sandboxCursor 'mcp.json') -Value $mcpJson -Encoding UTF8
Write-Host "Wrote sandbox .cursor/mcp.json (Drive URL port $SANDBOX_MCP_PORT)"

# Copy other repo .cursor files so sandbox has them
foreach ($file in @('hooks.json', 'BUGBOT.md')) {
  $src = Join-Path $repoCursor $file
  $dst = Join-Path $sandboxCursor $file
  if (Test-Path $src -PathType Leaf) {
    Copy-Item -Path $src -Destination $dst -Force
    Write-Host "Copied: $file"
  }
}

Write-Host ""
Write-Host "Setup complete. Sandbox uses MCP port $SANDBOX_MCP_PORT (main window can stay on 7891)."
Write-Host "Press F5 in Cursor and select 'Dev: Drive in sandbox' to start live testing."
