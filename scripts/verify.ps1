# Runs every automated check: backend tests, frontend tests, production build.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\verify.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location "$root\backend";  npm test;  if ($LASTEXITCODE) { exit 1 }; Pop-Location
Push-Location "$root\frontend"; npm test;  if ($LASTEXITCODE) { exit 1 }
npm run build; if ($LASTEXITCODE) { exit 1 }; Pop-Location
Write-Host "`nAll checks passed."
