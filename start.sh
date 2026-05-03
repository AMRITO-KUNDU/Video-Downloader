#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing Python dependencies..."
pip install -q -r "$SCRIPT_DIR/backend/requirements.txt"

echo "==> Installing frontend dependencies..."
npm install --prefix "$SCRIPT_DIR/frontend" --silent

echo "==> Building frontend..."
npm run build --prefix "$SCRIPT_DIR/frontend"

echo "==> Copying frontend build to backend/static..."
mkdir -p "$SCRIPT_DIR/backend/static"
cp -r "$SCRIPT_DIR/frontend/dist/." "$SCRIPT_DIR/backend/static/"

echo "==> Clearing port 5000 if in use..."
pkill -f "gunicorn" 2>/dev/null || true
sleep 1

echo "==> Starting server on port 5000..."
exec gunicorn \
  --worker-class sync \
  --workers 1 \
  --threads 4 \
  --bind 0.0.0.0:5000 \
  --timeout 120 \
  --keep-alive 5 \
  --chdir "$SCRIPT_DIR/backend" \
  "app:app"
