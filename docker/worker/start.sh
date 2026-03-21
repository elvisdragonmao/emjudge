#!/bin/sh
set -eu

echo "[worker] waiting for PostgreSQL"
until node -e "const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL }); c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));"; do
  sleep 2
done

echo "[worker] building judge image ${JUDGE_IMAGE} if needed"
if ! docker image inspect "$JUDGE_IMAGE" >/dev/null 2>&1; then
  docker build -t "$JUDGE_IMAGE" /app/docker/judge-runner
fi

echo "[worker] starting"
exec node dist/index.js
