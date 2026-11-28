# AVM School Portal - start the API (new window) and the website (this window)
# Usage:  .\start.ps1          development mode (auto-reload)
#         .\start.ps1 -Prod    production mode (run setup.ps1 first)
param([switch]$Prod)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$api = "$root\backend\AvmSchool.Api"

Write-Host "Starting API on http://localhost:5080 ..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $api -ArgumentList "-NoExit", "-Command", "dotnet run -c $(if ($Prod) { 'Release' } else { 'Debug' })"

Write-Host "Starting website on http://localhost:3000 ..." -ForegroundColor Cyan
Push-Location "$root\frontend"
try {
    if (-not (Test-Path ".env.local")) { Copy-Item ".env.local.example" ".env.local" }
    if (-not (Test-Path "node_modules")) { npm install }
    if ($Prod) { npm run start } else { npm run dev }
}
finally { Pop-Location }
