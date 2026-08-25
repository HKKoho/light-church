# Deploying on a Budget VPS (no Railway, no managed DB fees)

This is the cheapest way to put Light Church online. It doesn't touch Railway or any
managed database — everything (Postgres, Redis, the API, the web dashboard, and every
agent's Docker container) runs on one small server, using the installer this repo
already ships (`pnpm run install:clawix`, documented in `docs/GET_STARTED.md`). This
doc covers everything *around* that installer: picking a server, DNS, TLS, firewall,
and ongoing maintenance — none of which exists elsewhere in the repo yet.

**Why not a "normal" PaaS (Vercel/Render/Railway/Fly)?** The engine spawns each agent
run as its own Docker container via the Docker CLI directly
(`ContainerPoolService`/`ContainerRunner` in `packages/api/src/engine/`). That needs a
real Docker daemon the API process can reach. Most managed platforms don't give you
that without extra cost or complexity, so a plain VPS with Docker installed is both the
simplest *and* the cheapest option here.

## 1. Pick a server

| Provider | Spec | Price |
|---|---|---|
| **Hetzner Cloud CX22** (recommended) | 2 vCPU / 4 GB RAM / 40 GB SSD | ~€3.79/mo (~$4) |
| Hetzner Cloud CX32 | 4 vCPU / 8 GB RAM / 80 GB SSD | ~€7.59/mo (~$8) |
| Oracle Cloud "Always Free" | 4 ARM cores / 24 GB RAM | $0/mo |

Start with **CX22** — Postgres, Redis, the API, the web dashboard, and a couple of
warm/active agent containers (512 MB each, per `CLAUDE.md`) fit comfortably in 4 GB for
a small congregation's traffic. Move to CX32 if you turn on Telegram/WhatsApp and see
several concurrent conversations.

Oracle's free tier is real ($0 forever) but two caveats: account/capacity approval can
be flaky depending on region, and it's ARM64 — confirm `infra/docker/*/Dockerfile`
build cleanly for `arm64` before committing to it (most base images here — Node,
Postgres, Redis — are multi-arch, so this usually just works, but verify once).

Either way, choose **Ubuntu 22.04 or 24.04** as the OS image.

## 2. Point a domain at it

You don't need `aibyml.com` — any domain works, including a subdomain of one you
already own (free) or a fresh `.org` registration for the ministry (~$10–15/year, e.g.
Namecheap/Cloudflare Registrar).

Create one **A record** pointing at the server's public IP:

```
churchclawix.aibyml.uk.   A   <VPS_IP>
```

(This doc uses `churchclawix.aibyml.uk` throughout as the running example — swap in
whatever hostname you actually use.)

## 3. Provision the server

SSH in as root, then:

```bash
# Create a non-root sudo user (don't run the stack as root)
adduser deploy
usermod -aG sudo deploy
su - deploy

# Firewall — only what's needed
sudo apt-get update -qq && sudo apt-get install -y ufw
sudo ufw allow 22/tcp    # ssh
sudo ufw allow 80/tcp    # Caddy's ACME (Let's Encrypt) challenge
sudo ufw allow 3002/tcp  # web dashboard (see the port note in step 5)
sudo ufw allow 3003/tcp  # API / WebSocket
sudo ufw enable

# Docker
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -qq
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker deploy   # log out/in once for this to take effect

# Node 20+ and pnpm (CLAUDE.md: Node ≥ 20, pnpm ≥ 9)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

Log out and back in (or run `newgrp docker`) so your user's Docker group membership
takes effect before continuing.

## 4. Clone and run the installer

```bash
git clone https://github.com/aibyml-ngo/clawix-ngo.git lightchurch
cd lightchurch
pnpm run install:clawix
```

When prompted:
- **Deploy mode:** production
- **AI provider + key:** pick one (see the cost note below before choosing a model)
- **Public host or IP:** `churchclawix.aibyml.uk` (your domain, no `https://`, no port)
- **Use HTTPS?:** `y` — the installer will remind you a reverse proxy must sit in
  front of it, which step 5 sets up
- **Admin email/password:** yours

This step also builds the `clawix-agent:latest` Docker image and starts everything via
`docker-compose.prod.yml`. First run takes a few minutes.

> **Cost tip:** the installer defaults to `gpt-4o`. For pastoral-care/prayer-request
> conversations, a cheaper model (e.g. Claude Haiku or `gpt-4o-mini`) will matter far
> more for your monthly bill than which VPS tier you picked — change
> `DEFAULT_LLM_MODEL` in `.env` and re-run `node scripts/update.mjs` if you want that.

## 5. TLS with Caddy

One quirk to know: the installer bakes the **port number** into the URLs it
generates (`https://churchclawix.aibyml.uk:3002` for the dashboard,
`https://churchclawix.aibyml.uk:3003` for the API/WebSocket) — there's no built-in
option for a clean port-less URL. The simplest fix is to let Caddy terminate TLS on
those same two ports rather than fight it:

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -qq && sudo apt-get install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```caddyfile
churchclawix.aibyml.uk:3002 {
	reverse_proxy localhost:3002
}

churchclawix.aibyml.uk:3003 {
	reverse_proxy localhost:3003
}
```

```bash
sudo systemctl reload caddy
```

Caddy issues and renews Let's Encrypt certificates for both automatically (it uses
port 80 for the ACME challenge regardless of which port the site block listens on —
that's why port 80 is open in the firewall).

*(Want the classic port-less `https://churchclawix.aibyml.uk` URL instead? That needs
docker-compose.prod.yml's port mappings changed and a rebuild — ask and I can make
that small change.)*

## 6. Verify

Open `https://churchclawix.aibyml.uk:3002` in a browser and log in with the admin
credentials from step 4. Confirm the WebSocket connects (the "connected" dot in
`/conversations` should be green, not red).

## 7. Ongoing operations

```bash
# After a git pull or .env change — rebuild and restart
node scripts/update.mjs -- --pull

# Tail logs
docker compose -f docker-compose.prod.yml logs -f

# Back up the database (cron this — e.g. daily via crontab -e)
docker exec clawix-postgres pg_dump -U clawix clawix | gzip > ~/backups/db-$(date +%F).sql.gz

# Back up workspace data (prayer requests, incidents, pastoral-care records, etc.)
tar czf ~/backups/data-$(date +%F).tar.gz ./data

# Full teardown if ever needed
pnpm run uninstall:clawix              # keeps ./data
pnpm run uninstall:clawix -- --full    # removes .env, ./data, skills/custom too
```

## Cost recap

| Item | Monthly |
|---|---|
| Hetzner CX22 VPS | ~$4 |
| Domain (amortized, optional) | ~$1 |
| Caddy, Docker, TLS | $0 |
| **Infra total** | **~$5/mo** |
| LLM API usage | variable — dominates the bill; pick a cheap default model |
