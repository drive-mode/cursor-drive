# Start GitHub MCP server with PAT from .env.
# Uses GITHUB_MCP_PAT, else GITHUB_PAT_HHALPERIN, else GITHUB_PAT_AI_SECRETAGENT.
# Run from workspace root (Cursor sets cwd).

$ErrorActionPreference = "Stop"
$repoRoot = $env:CURSOR_WORKSPACE_ROOT
if (-not $repoRoot) {
    $repoRoot = git rev-parse --show-toplevel 2>$null
}
if (-not $repoRoot -and $PSScriptRoot) {
    $repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}
if ($repoRoot -and (Test-Path $repoRoot)) { Set-Location $repoRoot }

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

$token = $env:GITHUB_MCP_PAT
if (-not $token) { $token = $env:GITHUB_PAT_HHALPERIN }
if (-not $token) { $token = $env:GITHUB_PAT_AI_SECRETAGENT }
if ($token) { $env:GITHUB_PERSONAL_ACCESS_TOKEN = $token }

& npx -y @modelcontextprotocol/server-github
