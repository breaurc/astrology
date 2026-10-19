# Deploying the demo to Oracle Cloud (free) with a Cloudflare domain

What runs on the server (`docker-compose.yml`):

```
Internet ──443──▶ Caddy (HTTPS, Let's Encrypt) ──▶ web (Next.js :3000) ──▶ engine (Spring :8080, internal only)
                                                   └─ volume astro-data: users.json
```

Total time: about an hour, most of it waiting for builds.

---

## 1. Push the code

On your PC, commit and push everything (the server pulls from GitHub):

```bash
git add -A && git commit -m "Deployment setup" && git push
```

## 2. Create the Oracle server

1. Sign up at **cloud.oracle.com**. Pick the **home region carefully**: it can't be changed and the free server only runs there. EU options: Frankfurt, Amsterdam, Milan, Paris, Marseille, Madrid, Stockholm. If Frankfurt says "out of capacity" later, the others are often easier.
2. **Compute → Instances → Create instance**
   - Image: **Canonical Ubuntu 24.04**
   - Shape: **Ampere → VM.Standard.A1.Flex**, **2 OCPU, 12 GB RAM** (the Always Free maximum; it shows an "Always Free-eligible" label)
   - Networking: create a new VCN with a **public subnet**, and **assign a public IPv4 address**
   - SSH keys: upload your public key (or let Oracle generate a pair and download the private key)
   - Boot volume: the default (~47 GB) is fine
3. Open the web ports in Oracle's firewall: **Networking → Virtual cloud networks → your VCN → Security → Default Security List → Add Ingress Rules**:
   - Source `0.0.0.0/0`, TCP, destination port **80**
   - Source `0.0.0.0/0`, TCP, destination port **443**
   - Source `0.0.0.0/0`, UDP, destination port **443** (optional, enables HTTP/3)
4. Note the instance's **public IP**.

## 3. Point the domain at it (Cloudflare)

In Cloudflare: **your domain → DNS → Records → Add record**:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| A | `@` | the server's public IP | **DNS only** (grey cloud) |
| A | `www` | the server's public IP | **DNS only** (grey cloud) |

"DNS only" keeps Cloudflare out of your visitors' traffic, which matches the `PRIVACY_HOSTING` text in `web.env.example`. If you switch to proxied (orange) later, set **SSL/TLS → Full (strict)** and add Cloudflare to `PRIVACY_HOSTING`.

## 4. Set up the server

```bash
ssh ubuntu@<public-ip>

# Public repo:
git clone https://github.com/breaurc/astrology.git astro && cd astro
# Private repo: create a read-only deploy key first:
#   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""   → add ~/.ssh/github_deploy.pub at
#   GitHub → repo → Settings → Deploy keys, then:
#   GIT_SSH_COMMAND="ssh -i ~/.ssh/github_deploy" git clone git@github.com:breaurc/astrology.git astro
#   cd astro && git config core.sshCommand "ssh -i ~/.ssh/github_deploy"

bash deploy/server-setup.sh     # Docker, firewall ports, security updates, nightly backup
exit                            # log out and back in so Docker works without sudo
```

## 5. Configure

```bash
ssh ubuntu@<public-ip> && cd astro
cp deploy/.env.example deploy/.env
cp deploy/web.env.example deploy/web.env
cp deploy/engine.env.example deploy/engine.env
openssl rand -base64 48         # paste as AUTH_SECRET in deploy/web.env
nano deploy/.env                # DOMAIN=your-domain.ro, ACME_EMAIL=your email
nano deploy/web.env             # AUTH_SECRET, PRIVACY_CONTROLLER, PRIVACY_EMAIL, check PRIVACY_HOSTING region
nano deploy/engine.env          # ASTRO_LLM_API_KEY (OpenRouter key)
chmod 600 deploy/*.env
```

**OpenRouter**: in your OpenRouter account's privacy settings, turn off providers that may store or train on data, and add **DeepSeek** to ignored providers (keeps requests out of China; see the privacy notice).

## 6. Start

```bash
docker compose --env-file deploy/.env up -d --build    # first build: 10–20 minutes on the ARM server
docker compose logs -f                                 # Ctrl+C to stop watching
```

Then open `https://your-domain.ro`. Caddy fetches the HTTPS certificate on the first request (a few seconds).

Check:
- `/ro/privacy` shows your name and email and **no red warning**
- Create an account in `/ro/start`, then download your data on `/ro/me`
- `docker compose ps` shows three containers "running"

## Day to day

| Task | Command (in `~/astro`) |
|---|---|
| Deploy new code (after `git push` on your PC) | `bash deploy/update.sh` |
| Logs | `docker compose logs -f web` (or `engine`, `caddy`) |
| Restart | `docker compose --env-file deploy/.env restart` |
| Manual backup | `bash deploy/backup.sh` (files in `~/backups`, 14 days kept; nightly via cron) |
| Restore a backup | `docker run --rm -v astro_astro-data:/data -v ~/backups:/in alpine sh -c "rm -rf /data/* && tar -xzf /in/astro-data-YYYY-MM-DD.tgz -C /data"` then restart |
| Reset the demo (delete all accounts) | `docker compose --env-file deploy/.env down && docker volume rm astro_astro-data && docker compose --env-file deploy/.env up -d` |

Copy a backup to your PC now and then: `scp ubuntu@<ip>:~/backups/astro-data-*.tgz .`

## Troubleshooting

- **Site doesn't load at all**: check both firewalls: the Oracle security list (step 2.3) *and* `sudo iptables -L INPUT -n --line-numbers` (80/443 must be ACCEPT above the REJECT line; `server-setup.sh` does this).
- **Certificate error**: DNS must point to the server and be grey-cloud while Caddy gets the first certificate; see `docker compose logs caddy`.
- **"AUTH_SECRET must be set"** in the web logs: fill it in `deploy/web.env`, then `docker compose --env-file deploy/.env up -d`.
- **Build runs out of memory**: unlikely with 12 GB; if you chose a smaller shape, add swap: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`.
- **Oracle "idle instance" reclamation**: Oracle may reclaim Always Free instances that stay almost idle for 7 days. Upgrading the account to Pay-As-You-Go (still free within the limits) avoids that.
