# Quick health check for the Drive MCP server (sandbox uses port 7892).
# Use this from PowerShell to avoid the Invoke-WebRequest script-parsing prompt.
$port = if ($env:DRIVE_MCP_PORT) { $env:DRIVE_MCP_PORT } else { 7892 }
$uri = "http://127.0.0.1:$port/health"
try {
  $r = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 3
  Write-Host "OK $($r.StatusCode) $uri"
  Write-Host $r.Content
  exit 0
}
catch {
  Write-Host "FAIL: $uri - $_"
  exit 1
}
