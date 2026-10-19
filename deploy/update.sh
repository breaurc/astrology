#!/usr/bin/env bash
# Pull the latest code and rebuild. Accounts are kept (they live in the astro-data volume).
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose --env-file deploy/.env up -d --build
docker image prune -f
