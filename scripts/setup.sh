#!/usr/bin/env sh
# Portfolio — first-time local setup (macOS / Linux / Git Bash)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Installing backend dependencies..."; (cd "$ROOT/backend" && npm install)
echo "Installing frontend dependencies..."; (cd "$ROOT/frontend" && npm install)

[ -f "$ROOT/backend/.env.local" ] || { cp "$ROOT/backend/.env.example" "$ROOT/backend/.env.local"; echo "Created backend/.env.local"; }
[ -f "$ROOT/frontend/.env.local" ] || { cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"; echo "Created frontend/.env.local"; }

echo; echo "Integration status:"; (cd "$ROOT/backend" && npm run check-env) || true
echo; echo "Next: run 'npm run dev' in backend/ and frontend/, then create the super admin:"
echo "  cd backend && npm run create-super-admin -- you@example.com \"Your Name\""
