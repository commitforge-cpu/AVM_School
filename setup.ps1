# AVM School Portal - build everything (Windows PowerShell)
# Usage:  right-click > Run with PowerShell, or:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Need($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd was not found. $hint" }
}
Need dotnet "Install the .NET 10 SDK from https://dotnet.microsoft.com/download"
Need node   "Install Node.js 20.9 or newer (LTS) from https://nodejs.org"
Need npm    "npm comes with Node.js."

Write-Host "`n[1/3] Building the ASP.NET Core API..." -ForegroundColor Cyan
dotnet build "$root\backend\AvmSchool.Api\AvmSchool.Api.csproj" -c Release
if ($LASTEXITCODE -ne 0) { throw "API build failed." }

Write-Host "`n[2/3] Installing website packages..." -ForegroundColor Cyan
Push-Location "$root\frontend"
try {
    if (-not (Test-Path ".env.local")) { Copy-Item ".env.local.example" ".env.local" }
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

    Write-Host "`n[3/3] Building the Next.js website..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Website build failed." }
}
finally { Pop-Location }

Write-Host "`nDone. Run .\start.ps1 to start the API and the website." -ForegroundColor Green
