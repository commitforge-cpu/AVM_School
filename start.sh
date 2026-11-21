#!/usr/bin/env bash
# AVM School Portal - start the API and the website together
# Usage: ./start.sh          development mode (auto-reload)
#        ./start.sh --prod   production mode (run ./setup.sh first)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG=Debug; WEB="dev"
if [ "${1:-}" = "--prod" ]; then CONFIG=Release; WEB="start"; fi

echo "Starting API on http://localhost:5080 ..."
( cd "$ROOT/backend/AvmSchool.Api" && dotnet run -c "$CONFIG" ) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT INT TERM

echo "Starting website on http://localhost:3000 ..."
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
npm run "$WEB"
