#!/usr/bin/env bash
# Copies the users file out of the Docker volume; keeps 14 days. Run nightly by cron (see server-setup.sh).
set -euo pipefail
DEST="$HOME/backups"
mkdir -p "$DEST"
STAMP=$(date +%F)
docker run --rm -v astro_astro-data:/data:ro -v "$DEST":/out alpine \
  tar -czf "/out/astro-data-$STAMP.tgz" -C /data .
chmod 600 "$DEST/astro-data-$STAMP.tgz"
find "$DEST" -name 'astro-data-*.tgz' -mtime +14 -delete
echo "$(date -Is) backup ok: $DEST/astro-data-$STAMP.tgz"
