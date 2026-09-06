#!/usr/bin/env bash
set -euo pipefail

echo "Installing backend dependencies..."
npm install --prefix Backend --no-audit --no-fund --ignore-scripts

echo "Installing frontend dependencies..."
npm install --prefix Frontend --no-audit --no-fund --ignore-scripts

echo "Building frontend..."
npm run build --prefix Frontend

echo "Post-merge setup complete."