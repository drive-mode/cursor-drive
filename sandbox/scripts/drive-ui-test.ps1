# Drive UI test script - run after Cursor is launched with --remote-debugging-port=9222
# Usage: .\scripts\drive-ui-test.ps1
#
# Prereq: Quit Cursor, then:
#   Start-Process "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe" -ArgumentList "--remote-debugging-port=9222"
#   Start-Sleep -Seconds 10
#   .\scripts\drive-ui-test.ps1

$ErrorActionPreference = "Stop"

Write-Host "1. Connecting to Cursor on port 9222..."
npx agent-browser connect 9222
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed. Quit Cursor, then run:"
    Write-Host '  Start-Process "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe" -ArgumentList "--remote-debugging-port=9222"'
    Write-Host "  Wait 10s, then re-run this script."
    exit 1
}

Write-Host "`n2. Snapshot status bar..."
npx agent-browser snapshot -i

Write-Host "`n3. Toggle Drive (Ctrl+Shift+D)..."
npx agent-browser press "Control+Shift+d"
Start-Sleep -Seconds 1
npx agent-browser snapshot -i

Write-Host "`n4. Open Agent Screen (Ctrl+Shift+S)..."
npx agent-browser press "Control+Shift+s"
Start-Sleep -Seconds 2
npx agent-browser snapshot -i

Write-Host "`n5. MCP health check..."
$mcpPort = 7892
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$mcpPort/health" -UseBasicParsing -TimeoutSec 3
    Write-Host $r.Content
} catch {
    Write-Host "MCP not reachable on port $mcpPort"
}
