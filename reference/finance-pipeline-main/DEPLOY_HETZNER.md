# Deploying SecureFin Pipeline on Hetzner Cloud

Step-by-step guide for standing up the app on your own Hetzner Cloud
server using the Docker setup already in this repo (`Dockerfile`,
`docker-compose.yml`, `install.sh`).

Estimated time: 20–30 minutes. No prior Docker experience required —
just copy/paste the commands.

---

## 1. Create the server

1. Sign in at [console.hetzner.cloud](https://console.hetzner.cloud) and create a new project (or use an existing one).
2. Click **Add Server** and choose:
   - **Location**: whichever region is closest to your users.
   - **Image**: **Ubuntu 24.04**.
   - **Type**: a shared-vCPU **CX22** (2 vCPU / 4 GB RAM) is enough to start; go up a size if you expect heavy use.
   - **Volume**: not required — the app's data lives on the server's own disk (see backups in step 8).
   - **Networking**: leave defaults (public IPv4 + IPv6).
   - **Firewall**: create/attach one that allows inbound **22** (SSH), **80** and **443** (if you'll add HTTPS in step 7), and **3000** (the app, until you put a reverse proxy in front of it).
   - **SSH key**: add your public key here rather than using a password — paste the contents of your `~/.ssh/id_ed25519.pub` (generate one locally first with `ssh-keygen -t ed25519` if you don't have one).
3. Click **Create & Buy now**. Note the server's public IPv4 address once it's up.

---

## 2. Connect and do basic hardening

```bash
ssh root@YOUR_SERVER_IP
```

Create a non-root user to run things as (recommended instead of staying on `root`):

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

From here on, log back in as that user:

```bash
ssh deploy@YOUR_SERVER_IP
```

Enable the firewall on the box itself (in addition to the Hetzner Cloud Firewall from step 1):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw enable
```

---

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in (`exit`, then `ssh deploy@YOUR_SERVER_IP` again) so the group change takes effect. Confirm it worked:

```bash
docker --version
docker compose version
```

---

## 4. Get the app onto the server

**Option A — from a git repository (recommended):** if you've pushed this project to GitHub/GitLab:

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git securefin-pipeline
cd securefin-pipeline
```

**Option B — copy directly from your own machine**, if there's no git remote yet. Run this from your local machine (not the server):

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  /Users/drpanda/RPA/ deploy@YOUR_SERVER_IP:~/securefin-pipeline/
```

Then on the server: `cd ~/securefin-pipeline`.

---

## 5. Configure environment variables

```bash
cp .env.example .env
nano .env
```

At minimum, set:
- `GEMINI_API_KEY` and/or `ANTHROPIC_API_KEY` — for AI-powered classification (the app works without these using a built-in local classifier, but AI features stay off).
- `APP_URL` — set to `http://YOUR_SERVER_IP:3000`, or your domain once you've set up HTTPS in step 7.

Leave `DB_PATH`, `STAGING_DIR`, `REPORTS_DIR`, `EXPORT_JSON_DIR`, `EXPORT_CSV_DIR` as-is — `docker-compose.yml` pins these to the persistent data volume regardless of what's in `.env`.

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## 6. Install and start the app

```bash
./install.sh
```

This builds the Docker image and starts the app, keeping any existing data intact on re-runs. When it finishes you'll see:

```
SecureFin Pipeline is running at http://localhost:3000
```

Visit `http://YOUR_SERVER_IP:3000` in a browser to confirm it loads. Log in with any credentials (demo mode).

Optional flags:
- `./install.sh --warehouse` — also start the bundled PostgreSQL container for Layer 5 warehouse export.
- `./install.sh --no-cache` — force a full rebuild instead of using Docker's build cache.

---

## 7. (Recommended) Put HTTPS in front of it with a domain

If you have a domain, point an **A record** at `YOUR_SERVER_IP`, then install [Caddy](https://caddyserver.com/) as a reverse proxy — it gets you a free, auto-renewing Let's Encrypt certificate with almost no config:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile` to:

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Then:

```bash
sudo systemctl reload caddy
```

Once this is working, you can close port 3000 on the Hetzner Cloud Firewall (step 1) and only keep 22/80/443 open — everything goes through Caddy on 443.

---

## 8. Back up the database

The SQLite database and generated reports/exports live in a Docker volume (`app-data`), not in the git checkout, so they survive `./install.sh` re-runs and container restarts. Back it up periodically:

```bash
docker run --rm -v securefin-pipeline_app-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/app-data-backup-$(date +%F).tar.gz -C /data .
```

(Adjust `securefin-pipeline_app-data` to match your actual volume name — check with `docker volume ls`; it's `<folder-name>_app-data`.)

To restore into a fresh volume:

```bash
docker run --rm -v securefin-pipeline_app-data:/data -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xzf /backup/app-data-backup-DATE.tar.gz"
```

---

## 9. Updating later

Whenever there's new code to deploy:

```bash
cd ~/securefin-pipeline
./install.sh
```

If you're on Option A (git), `install.sh` runs `git pull` automatically before rebuilding, as long as there are no uncommitted local changes on the server. It rebuilds the image and restarts the container without touching the data volume.

---

## Troubleshooting

- **Can't reach the app from a browser**: check the Hetzner Cloud Firewall (step 1) and `ufw status` on the server both allow the port you're using.
- **`./install.sh` fails with a Docker error**: make sure you logged out/in after `usermod -aG docker $USER`, and that `docker info` runs without `sudo`.
- **Check logs**: `docker compose logs -f app`
- **Check container status**: `docker compose ps`
- **Restart without rebuilding**: `docker compose restart app`
