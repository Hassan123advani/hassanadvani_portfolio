# Portfolio — first-time local setup (Windows PowerShell)
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Installing backend dependencies..."
Push-Location "$root\backend"; npm install; Pop-Location

Write-Host "Installing frontend dependencies..."
Push-Location "$root\frontend"; npm install; Pop-Location

if (-not (Test-Path "$root\backend\.env.local")) {
  Copy-Item "$root\backend\.env.example" "$root\backend\.env.local"
  Write-Host "Created backend\.env.local  -> fill in Firebase Admin, Cloudinary and RESEND_API_KEY and ANTHROPIC_API_KEY values."
}
if (-not (Test-Path "$root\frontend\.env.local")) {
  Copy-Item "$root\frontend\.env.example" "$root\frontend\.env.local"
  Write-Host "Created frontend\.env.local -> set VITE_FIREBASE_API_KEY."
}

Write-Host "`nIntegration status:"
Push-Location "$root\backend"; npm run check-env; Pop-Location

Write-Host "`nNext:"
Write-Host "  1. cd backend;  npm run dev        (API on http://localhost:4000)"
Write-Host "  2. cd frontend; npm run dev        (site on http://localhost:5173)"
Write-Host "  3. cd backend;  npm run create-super-admin -- you@example.com `"Your Name`""
