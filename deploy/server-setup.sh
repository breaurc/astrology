#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server on Oracle Cloud (Ampere A1).
# Usage:  bash deploy/server-setup.sh
set -euo pipefail

echo "== Updates"
sudo apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git iptables-persistent unattended-upgrades

echo "== Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "== Firewall: Oracle's Ubuntu image blocks everything except SSH in iptables; open 80 and 443"
for port in 80 443; do
  sudo iptables -C INPUT -p tcp --dport $port -m state --state NEW -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 6 -p tcp --dport $port -m state --state NEW -j ACCEPT
done
sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "== Automatic security updates"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== Nightly backup of the users file at 03:30"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
( crontab -l 2>/dev/null | grep -v astro-backup; echo "30 3 * * * bash $DIR/deploy/backup.sh >> $HOME/astro-backup.log 2>&1 # astro-backup" ) | crontab -

echo
echo "Done. Log out and back in (so the docker group applies), then:"
echo "  cp deploy/.env.example deploy/.env           # set DOMAIN, ACME_EMAIL"
echo "  cp deploy/web.env.example deploy/web.env     # set AUTH_SECRET, PRIVACY_*"
echo "  cp deploy/engine.env.example deploy/engine.env"
echo "  docker compose --env-file deploy/.env up -d --build"
