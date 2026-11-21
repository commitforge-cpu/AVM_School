#!/usr/bin/env bash
# AVM School Portal - build everything (macOS / Linux)
# Usage: ./setup.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "$1 was not found. $2" >&2; exit 1; }; }
need dotnet "Install the .NET 10 SDK from https://dotnet.microsoft.com/download"
need node   "Install Node.js 20.9 or newer (LTS) from https://nodejs.org"
need npm    "npm comes with Node.js."

echo; echo "[1/3] Building the ASP.NET Core API..."
dotnet build "$ROOT/backend/AvmSchool.Api/AvmSchool.Api.csproj" -c Release

echo; echo "[2/3] Installing website packages..."
cd "$ROOT/frontend"
[ -f .env.local ] || cp .env.local.example .env.local
npm install

echo; echo "[3/3] Building the Next.js website..."
npm run build

echo; echo "Done. Run ./start.sh to start the API and the website."
