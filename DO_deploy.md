# DigitalOcean Deployment Guide

This guide deploys Clawix to a single DigitalOcean droplet using the built-in
installer (`pnpm run install:clawix`), fronted by Nginx with HTTPS on two clean
subdomains. The installer generates all secrets, builds the images, starts the
stack, and waits for the API to go healthy — you don't edit `docker-compose`
files by hand.

> **Naming:** the production containers are `clawix-postgres`, `clawix-redis`,
> `clawix-api`, and `clawix-web`. The repo clones into `clawixngo`.

---

## Step 1 — Create a Droplet

1. Log in to [digitalocean.com](https://digitalocean.com) → **Create → Droplets**
2. Choose:
   - **Image:** Ubuntu 24.04 LTS
   - **Size:** Basic → **$24/mo** (2 vCPU, **4 GB RAM** minimum — the first build needs the headroom)
   - **Region:** closest to your users
   - **Authentication:** SSH key
3. Click **Create Droplet**, note the IP (e.g. `165.22.10.50`)

---

## Step 2 — Point Your Domain

You own `aibyml.com`. Add two DNS A records at your registrar (wherever you manage aibyml.com DNS — GoDaddy, Namecheap, Cloudflare, etc.):

```
A   clawix.aibyml.com       →  <your droplet IP>
A   api.clawix.aibyml.com   →  <your droplet IP>
```

DNS propagates in a few minutes (up to 1 hour max). Verify with:

```bash
dig clawix.aibyml.com +short
dig api.clawix.aibyml.com +short
```

Both should return your droplet IP before you reach SSL (Step 7).

---

## Step 3 — SSH In and Install Dependencies

The installer runs on the host with Node + pnpm, then builds everything inside Docker. Install all of it:

```bash
ssh root@165.22.10.50

# Docker
curl -fsSL https://get.docker.com | sh

# Node.js 20 + pnpm (the installer is a Node script)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git
corepack enable && corepack prepare pnpm@latest --activate

# Nginx + Certbot + firewall
apt install -y nginx certbot python3-certbot-nginx ufw

# Firewall rules
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Quick sanity check — all three should print a version:

```bash
docker --version && node --version && pnpm --version
```

---

## Step 4 — Clone and Run the Installer

```bash
git clone https://github.com/aibyml-ngo/clawix-ngo.git /opt/clawixngo
cd /opt/clawixngo

pnpm run install:clawix
```

The installer is interactive. Answer the prompts like this for a production deployment:

| Prompt                                | Answer                                 |
| ------------------------------------- | -------------------------------------- |
| Deployment mode                       | `1` (production)                       |
| Provider + API key                    | e.g. Anthropic / OpenAI + your key     |
| Default model                         | accept the default, or enter your own  |
| **Public host or IP**                 | `clawix.aibyml.com`                    |
| **Use HTTPS?**                        | `y` (Nginx terminates TLS in Step 6–7) |
| Extra CORS origins                    | leave blank                            |
| Initial admin email / password / name | your admin login                       |
| Telegram bot token                    | optional                               |

The installer then automatically:

1. Checks prerequisites (Node 20+, pnpm, Docker)
2. Writes `.env` (file mode `600`) with cryptographically random `JWT_SECRET`, `PROVIDER_ENCRYPTION_KEY`, and `POSTGRES_PASSWORD` — you never set these by hand
3. Builds `clawix-agent:latest` (the image used for isolated per-task containers)
4. Runs `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`
5. Syncs the Postgres password so the API can connect on first boot
6. Waits for `http://localhost:3001/health` to go green (migrations + admin bootstrap run inside the API container on first start — up to ~3 minutes)

When it prints **"Installation complete"**, the stack is running on `localhost:3000` / `:3001`. Next we put a domain and HTTPS in front of it.

---

## Step 5 — Set the Public URLs for the Subdomain Setup

The installer bakes `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` into the web image using the host you entered **plus the internal ports** (`:3000` / `:3001`). Because this guide serves the API on its own clean subdomain through Nginx (no ports in the URL), update those three lines in `.env`:

```bash
nano /opt/clawixngo/.env
```

```env
NEXT_PUBLIC_API_URL=https://api.clawix.aibyml.com
NEXT_PUBLIC_WS_URL=wss://api.clawix.aibyml.com
CORS_ALLOWED_ORIGINS=https://clawix.aibyml.com
```

These values are compiled into the Next.js bundle at **build time**, so rebuild the web image to pick them up:

```bash
cd /opt/clawixngo
pnpm run update:clawix
```

> Skip this step only if you intend to expose ports `3000`/`3001` directly with a TLS proxy on those ports. The Nginx subdomain setup below is cleaner and is what the rest of this guide assumes.

---

## Step 6 — Configure Nginx Reverse Proxy

```bash
nano /etc/nginx/sites-available/clawix
```

Paste:

```nginx
server {
    server_name clawix.aibyml.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    server_name api.clawix.aibyml.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> The `X-Forwarded-Proto` header matters: the API trusts it to know the original request was HTTPS.

```bash
ln -s /etc/nginx/sites-available/clawix /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Step 7 — SSL

```bash
certbot --nginx -d clawix.aibyml.com -d api.clawix.aibyml.com
```

Certbot edits the Nginx config automatically and sets up auto-renewal.

Open `https://clawix.aibyml.com` and sign in with the admin credentials you entered during install.

---

## Step 8 — Auto-start on Reboot

No custom service file is needed. Every container is declared `restart: unless-stopped`, so as long as Docker starts on boot the whole stack comes back automatically:

```bash
systemctl enable docker
```

(Optional) confirm after a reboot:

```bash
reboot
# …reconnect…
docker compose -f /opt/clawixngo/docker-compose.prod.yml ps
```

---

## Updating

From the droplet, pull the latest code and rebuild in one command:

```bash
cd /opt/clawixngo
pnpm run update:clawix -- --pull
```

What it does safely:

- `git pull --ff-only` — fetches the latest code
- Rebuilds the Docker images with the new code
- Restarts containers with `--remove-orphans`
- Waits for the API to become healthy

What it does **not** touch:

- Your `.env` — kept as-is
- `postgres_data` / `redis_data` volumes — your database and cache are preserved

Other update variants:

```bash
pnpm run update:clawix               # rebuild + restart, no git pull
pnpm run update:clawix -- --no-build # plain restart, reuse existing images
```

> `setup-clawix.sh` and `install:clawix` are **first-time installers**. For routine updates always use `update:clawix`.

---

## Useful Commands

```bash
# View logs
pnpm run docker:prod:logs
# (equivalently) docker compose -f docker-compose.prod.yml logs -f

# Container health
docker compose -f docker-compose.prod.yml ps

# Database shell
docker exec -it clawix-postgres psql -U clawix -d clawix

# Database backup
docker exec clawix-postgres pg_dump -U clawix clawix > backup.sql
```

---

## Uninstall

```bash
cd /opt/clawixngo
pnpm run uninstall:clawix            # remove containers/images/volumes, keep .env + data
pnpm run uninstall:clawix -- --full  # also remove .env, ./data/, ./skills/custom/
```

---

## Notes

- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are baked into the Next.js bundle at **build time**. If you change your domain later, update `.env` and rebuild with `pnpm run update:clawix` — a plain restart won't pick up the change.
- The API container runs as root to access the Docker socket for spawning agent containers. This is intentional.
- Postgres data persists in the `postgres_data` Docker volume. Back it up with the `pg_dump` command above.
- If the API ever fails to connect to Postgres after a manual change, re-sync the password:
  ```bash
  docker exec clawix-postgres psql -U clawix -d clawix \
    -c "ALTER USER clawix WITH PASSWORD '<your POSTGRES_PASSWORD from .env>';"
  ```

---

## Appendix — Domain Setup for aibyml.com

### A. Add DNS Records

Log in to wherever you manage `aibyml.com` DNS and add two A records:

| Type | Name         | Value               | TTL  |
| ---- | ------------ | ------------------- | ---- |
| A    | `clawix`     | `<your droplet IP>` | 3600 |
| A    | `api.clawix` | `<your droplet IP>` | 3600 |

This creates:

- `clawix.aibyml.com` → web dashboard
- `api.clawix.aibyml.com` → API + WebSocket

Verify propagation before continuing:

```bash
dig clawix.aibyml.com +short
dig api.clawix.aibyml.com +short
# Both should return your droplet IP
```

---

### B. Cloudflare Users (if aibyml.com uses Cloudflare)

**Important:** set the proxy toggle to **DNS only (grey cloud)** for both records — not the orange proxied mode.

The orange proxy breaks WebSocket connections, which the app uses for live agent output.

In the Cloudflare dashboard:

1. DNS → Records
2. Find `clawix` and `api.clawix`
3. Click the orange cloud icon on each → switch to grey (DNS only)

---

### C. Common Registrar Instructions

**Namecheap**

1. Domain List → Manage → Advanced DNS
2. Add Record → A Record → Host: `clawix` → Value: `<IP>`
3. Add Record → A Record → Host: `api.clawix` → Value: `<IP>`

**GoDaddy**

1. My Products → DNS → Manage
2. Add → Type: A → Name: `clawix` → Value: `<IP>`
3. Add → Type: A → Name: `api.clawix` → Value: `<IP>`

**Cloudflare**

1. Select `aibyml.com` → DNS → Records → Add record
2. Type: A → Name: `clawix` → IPv4: `<IP>` → Proxy: **DNS only**
3. Repeat for `api.clawix`

---

### D. If You Change the Domain Later

Since `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are baked into the web image at build time, changing domains requires:

1. Update `.env` with the new URLs and `CORS_ALLOWED_ORIGINS`
2. Rebuild + restart: `pnpm run update:clawix`
3. Re-run Certbot for the new domain: `certbot --nginx -d newdomain.com -d api.newdomain.com`
