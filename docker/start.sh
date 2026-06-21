#!/bin/sh
set -eu

echo "[Better Media] Refreshing backend dependencies..."
npm ci --prefix backend --no-audit --no-fund --prefer-offline

echo "[Better Media] Refreshing frontend dependencies..."
npm ci --prefix frontend --no-audit --no-fund --prefer-offline

echo "[Better Media] Rebuilding the frontend..."
npm run build --prefix frontend

echo "[Better Media] Starting frontend, backend, realtime, and admin..."
exec npm run start --prefix backend
