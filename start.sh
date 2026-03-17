#!/usr/bin/env bash
# Quick-start script for the Deal Intelligence Platform
set -e

echo "==================================="
echo "  Deal Intelligence Platform"
echo "==================================="

# Install dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "Installing dependencies..."
  pip install -q -r requirements.txt
fi

echo ""
echo "Starting server at http://0.0.0.0:8000"
echo "Open http://localhost:8000 in your browser"
echo ""

python3 -m uvicorn app.server:app --host 0.0.0.0 --port 8000
