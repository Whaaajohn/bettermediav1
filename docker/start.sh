#!/bin/sh
set -eu

if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "[Better Media] Production image already has dependencies and built frontend assets."
else
  echo "[Better Media] Refreshing backend dependencies..."
  npm ci --prefix backend --no-audit --no-fund --prefer-offline

  echo "[Better Media] Refreshing frontend dependencies..."
  npm ci --prefix frontend --include=dev --no-audit --no-fund --prefer-offline

  echo "[Better Media] Rebuilding the frontend..."
  npm run build --prefix frontend
fi

echo "[Better Media] Starting frontend, backend, realtime, and admin..."
exec npm run start --prefix backend
