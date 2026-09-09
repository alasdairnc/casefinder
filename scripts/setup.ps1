# CaseDive setup — Windows convenience wrapper around scripts/setup.mjs.
#
# Usage (no execution-policy change required):
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 --dry-run
#
# Or just use the cross-platform entry point: npm run setup
$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found. Install Node 20+ from https://nodejs.org (or 'winget install OpenJS.NodeJS.LTS') and re-run."
    exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

node scripts/setup.mjs @args
exit $LASTEXITCODE
