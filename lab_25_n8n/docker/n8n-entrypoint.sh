#!/bin/sh
set -e
if [ -d /seed/workflows ]; then
  count=$(find /seed/workflows -maxdepth 1 -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
  if [ "${count}" -gt 0 ]; then
    echo "[lab_25_n8n] Importing seed workflows from /seed/workflows (${count} file(s))..."
    n8n import:workflow --separate --input=/seed/workflows || echo "[lab_25_n8n] import:workflow finished with warnings (often safe if workflows already exist)."
  fi
fi
exec /docker-entrypoint.sh "$@"
