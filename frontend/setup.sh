#!/usr/bin/env bash
# Setup and run the Next.js frontend
set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "  FMCG Deal Intelligence Frontend"
echo "  Next.js 14 + TypeScript + Tailwind"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required. Install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
  echo "Error: Node.js 18+ required (found $(node -v))"
  exit 1
fi

# Install deps
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed."
fi

echo ""
echo "Make sure the FastAPI backend is running on port 8000:"
echo "  cd .. && ./start.sh"
echo ""
echo "Starting Next.js dev server on http://localhost:3000"
echo ""

npm run dev
