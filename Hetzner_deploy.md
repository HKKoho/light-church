# Hetzner Deployment Guide

The cheapest way to run Light Church in production: one Hetzner Cloud VPS
running everything (Postgres, Redis, the API, the web dashboard, and every
agent's Docker container) via the installer this repo already ships
(`pnpm run install:clawix`), fronted by Caddy for free automatic TLS.

**Domain used throughout this guide:** `lightchurch.aibyml.uk`
(swap in your own if this changes).

**Estimated cost:** ~$5/mo infra (Hetzner CX22 + amortized domain) + variable
LLM API usage. See [Cost recap](#cost-recap) at the end.

---

## Step 1 — Create the Hetzner Server

1. Go to [console.hetzner.cloud](https://console.hetzner.cloud) and sign up /
   log in.
2. Click **New Project** (or reuse an existing one) → name it e.g.
   `lightchurch`.
3. Inside the project, click **Add Server**:
   - **Location:** closest to your users
   - **Image:** Ubuntu 24.04
   - **Type:** Shared vCPU → **CX22** (2 vCPU / 4 GB RAM / 40 GB SSD, ~€3.79/mo)
   - **SSH Key:** click **Add SSH Key**, paste your public key
     (`cat ~/.ssh/id_ed25519.pub` locally if you need to generate one first:
     `ssh-keygen -t ed25519`)
   - Leave networking/firewall defaults — you'll configure `ufw` on the box
     itself in Step 3
   - **Name:** `lightchurch-prod`
4. Click **Create & Buy Now**.
5. Note the server's public IPv4 address once it boots (e.g. `95.216.x.x`).

---

## Step 2 — Point Your Domain

Add an **A record** at wherever you manage the `aibyml.uk` DNS:

```
A   lightchurch.aibyml.uk   →   <server IPv4>
```

Verify propagation before continuing (can take a few minutes, up to an hour):

```bash
dig lightchurch.aibyml.uk +short
```

It should return the server's IP.

> **Using Cloudflare?** Set the proxy toggle to **DNS only** (grey cloud), not
> orange/proxied — the orange proxy breaks the WebSocket connection the app
> uses for live agent output.

---

## Step 3 — Provision the Server

SSH in as root:

```bash
ssh root@<server IPv4>
```

Create a non-root user and set up the firewall:

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy

sudo apt-get update -qq && sudo apt-get install -y ufw
sudo ufw allow 22/tcp    # ssh
sudo ufw allow 80/tcp    # Caddy's ACME (Let's Encrypt) challenge
sudo ufw allow 443/tcp   # Caddy's HTTPS (web + API, both proxied — see Step 5)
sudo ufw enable
```

Install Docker:

```bash
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -qq
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker deploy   # log out/in once for this to take effect
```

Install Node 20+ and pnpm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

Log out and back in (or run `newgrp docker`) so your `deploy` user's Docker
group membership takes effect before continuing.

---

## Step 4 — Clone and Run the Installer

```bash
git clone https://github.com/HKKoho/light-church.git lightchurch
cd lightchurch
pnpm run install:clawix
```

The installer is interactive. Answer the prompts like this:

| Prompt | Answer |
| --- | --- |
| Deployment mode | `1` (production) |
| Provider selection | pick one or more (e.g. `1` for Anthropic) + paste your API key |
| Default model | accept the default, or pick a cheaper one — see cost tip below |
| Public host or IP | `lightchurch.aibyml.uk` (no `https://`, no port) |
| Use HTTPS? | `y` |
| Extra CORS origins | leave blank |
| Admin email / password / name | your admin login |

> **Cost tip:** the installer defaults to `gpt-4o` for OpenAI (or
> `claude-sonnet-4-5` for Anthropic). For most conversational use, a cheaper
> model (e.g. Claude Haiku or `gpt-4o-mini`) will matter far more for your
> monthly bill than which VPS tier you picked. You can change
> `DEFAULT_LLM_MODEL` in `.env` later and re-run
> `node scripts/update.mjs -- --pull` to apply it.

This step also builds the `clawix-agent:latest` Docker image and starts
everything via `docker-compose.prod.yml`. First run takes a few minutes —
the installer waits for `http://localhost:3003/health` to go green.

---

## Step 5 — TLS with Caddy

Do **not** point a Caddy site block at the same port number the app's Docker
container publishes on the host (e.g. `lightchurch.aibyml.uk:3010 {
reverse_proxy localhost:3010 }`) — Caddy would try to bind that port itself
*and* proxy to it, which is a straight `bind: address already in use`
conflict with the container. Two processes can't own one host port.

Instead, use a clean port-less URL: Caddy terminates TLS on 443 for the root
domain (web) and a subdomain (api), each proxying to the container's
loopback-only host port set in `docker-compose.prod.yml` (3000 for web, 3001
for api):

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -qq && sudo apt-get install -y caddy
```

Add an `api` DNS A/AAAA record pointing at the same server IP as the root
domain (grey-cloud / DNS-only, same as the root record), then edit
`/etc/caddy/Caddyfile`:

```caddyfile
lightchurch.aibyml.uk {
	reverse_proxy localhost:3000
}

api.lightchurch.aibyml.uk {
	reverse_proxy localhost:3001
}
```

```bash
sudo systemctl reload caddy
```

Caddy issues and renews Let's Encrypt certificates for both automatically
via the ACME HTTP-01 challenge on port 80 (that's why port 80 is open in the
firewall) — this only works once the `api` DNS record above resolves.

Set `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` to the `api.` subdomain and
`CORS_ALLOWED_ORIGINS` to the root domain in `.env`, then rebuild the web
image (these are baked in at build time) and restart the stack:

```bash
node scripts/update.mjs -- --pull
```

---

## Step 6 — Verify

Open `https://lightchurch.aibyml.uk` in a browser and log in with the
admin credentials from Step 4. Confirm the WebSocket connects (the
"connected" dot in `/conversations` should be green, not red).

API health check:

```bash
curl https://api.lightchurch.aibyml.uk/health
```

---

## Step 7 — Add LLM Provider Keys (if not set during install)

1. Log into the web dashboard with your admin credentials
2. Go to **Settings → Providers**
3. Add/confirm your OpenAI / Anthropic / Gemini API keys
4. Create agents and start conversations

---

## Ongoing Operations

```bash
# After a git pull or .env change — rebuild and restart
node scripts/update.mjs -- --pull

# Tail logs
docker compose -f docker-compose.prod.yml logs -f

# Container health
docker compose -f docker-compose.prod.yml ps

# Back up the database (cron this — e.g. daily via crontab -e)
docker exec clawix-postgres pg_dump -U clawix clawix | gzip > ~/backups/db-$(date +%F).sql.gz

# Back up workspace data (prayer requests, incidents, pastoral-care records, etc.)
tar czf ~/backups/data-$(date +%F).tar.gz ./data

# Full teardown if ever needed
pnpm run uninstall:clawix              # keeps ./data
pnpm run uninstall:clawix -- --full    # removes .env, ./data, skills/custom too
```

**Auto-start on reboot:** every container is declared `restart:
unless-stopped`, so as long as Docker starts on boot the whole stack comes
back automatically:

```bash
sudo systemctl enable docker
```

---

## Troubleshooting

### API fails to start
```bash
docker compose -f docker-compose.prod.yml logs api
```
Common causes: missing env var, Postgres not ready yet, bad provider API key.

### Agents fail to spawn
Confirm the Docker daemon is reachable and the agent image exists:
```bash
docker image ls clawix-agent:latest
docker ps
```

### WebSocket shows "disconnected" in the dashboard
Usually a proxy/Cloudflare issue — confirm Cloudflare DNS is set to **DNS
only** (grey cloud), not proxied, and that the Caddyfile blocks in Step 5
match your domain exactly.

---

## Cost recap

| Item | Monthly |
|---|---|
| Hetzner CX22 VPS | ~$4 |
| Domain (amortized, if newly registered) | ~$1 |
| Caddy, Docker, TLS | $0 |
| **Infra total** | **~$5/mo** |
| LLM API usage | variable — dominates the bill; pick a cheap default model |
