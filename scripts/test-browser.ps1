# test-browser.ps1 — Run Playwright browser tests against a running serve-web instance
# Prerequisite: Run scripts/serve-web-dev.ps1 first (or cursor serve-web on port 8000)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# Check if serve-web is responding on :8000
try {
  $r = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
} catch {
  Write-Host "[test-browser] serve-web not running on localhost:8000" -ForegroundColor Red
  Write-Host "Run scripts/serve-web-dev.ps1 first." -ForegroundColor Yellow
  exit 1
}

Write-Host "[test-browser] Running Playwright tests..." -ForegroundColor Cyan
npx playwright test
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Host "[test-browser] Tests failed. Opening HTML report..." -ForegroundColor Yellow
  npx playwright show-report
}

exit $exitCode
