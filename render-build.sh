#!/usr/bin/env bash
set -e

echo "--- Installing Python dependencies ---"
pip install -r backend/requirements.txt

echo "--- Checking Node.js ---"
if ! command -v node &>/dev/null; then
  echo "Node not found, installing..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version
npm --version

echo "--- Building frontend ---"
npm install --prefix frontend
npm run build --prefix frontend

echo "--- Copying dist to backend/static ---"
mkdir -p backend/static
cp -r frontend/dist/. backend/static/

echo "--- Verifying ---"
ls backend/static/
echo "Build complete."
