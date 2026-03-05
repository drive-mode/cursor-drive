# serve-web-dev.ps1 — One-command browser dev workflow for Cursor Drive
# Steps: compile → package → install → serve-web → open browser
# Exit on first failure.
#
# MCP coordination: The Drive MCP server (:7891) must run separately for full functionality
# (drive_speak, share_screen_* tools). serve-web does not start it. Options:
#   - F5 in a separate Cursor window (Extension Development Host) — starts MCP
#   - No standalone MCP-only entry point exists; extension activation starts MCP

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = (Get-Location).Path }
Set-Location $RepoRoot

Write-Host "[serve-web-dev] Compiling..." -ForegroundColor Cyan
npm run compile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[serve-web-dev] Packaging extension..." -ForegroundColor Cyan
npx vsce package --no-dependencies --out out/cursor-drive.vsix
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[serve-web-dev] Installing extension..." -ForegroundColor Cyan
cursor --install-extension out/cursor-drive.vsix
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[serve-web-dev] Starting cursor serve-web on port 8000..." -ForegroundColor Cyan
Start-Process cursor -ArgumentList "serve-web --without-connection-token --accept-server-license-terms --port 8000"

Write-Host "[serve-web-dev] Waiting for server..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host "[serve-web-dev] Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:8000"
