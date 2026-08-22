# Railway Deployment Guide — Option B
## Light Church · Web + API on Railway · Agent Containers on VPS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Railway (managed cloud)                        │
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐  │
│  │  Web     │   │  API     │   │  Postgres   │  │
│  │ Next.js  │──▶│ NestJS   │──▶│  (plugin)   │  │
│  │ :3000    │   │ :3001    │   └─────────────┘  │
│  └──────────┘   │          │   ┌─────────────┐  │
│                 │          │──▶│  Redis      │  │
│                 └────┬─────┘   │  (plugin)   │  │
│                      │ TLS     └─────────────┘  │
└──────────────────────┼──────────────────────────┘
                       │ tcp://VPS_IP:2376
          ┌────────────▼──────────────────────┐
          │  VPS (Hetzner / DigitalOcean)     │
          │                                   │
          │  Docker daemon (port 2376 + TLS)  │
          │  Agent containers (ephemeral)     │
          │  /data  (workspace files)         │
          └───────────────────────────────────┘
```

**What runs where:**
- Railway: dashboard UI, API server, database, cache
- VPS: AI agent sandboxes (Docker containers), workspace file storage

---

## Prerequisites

- A Railway account → [railway.app](https://railway.app)
- A VPS with Ubuntu 22.04 or 24.04 (min 2 vCPU, 4 GB RAM)
  - Hetzner CX22 (~€4/mo) or DigitalOcean Basic 2GB (~$12/mo)
- This repo pushed to GitHub (Railway pulls from GitHub)
- `gh` CLI authenticated (`gh auth status`)

---

## Step 1 — Set Up the VPS

SSH into your VPS as root and run the setup script:

```bash
# Copy the script to the VPS
scp infra/railway/vps-setup.sh root@YOUR_VPS_IP:/tmp/

# Run it
ssh root@YOUR_VPS_IP bash /tmp/vps-setup.sh
```

The script will:
1. Install Docker
2. Generate TLS certificates (CA + server + client)
3. Configure Docker daemon to listen on port 2376 with mutual TLS
4. Configure UFW firewall (SSH + Docker TLS only)
5. Create the `/data` workspace directory
6. Print the environment variables to paste into Railway

**Save the printed output** — you will need it in Step 3.

---

## Step 2 — Build the Agent Image on the VPS

The agent image must exist on the VPS where Docker runs:

```bash
ssh root@YOUR_VPS_IP

# Clone the repo
git clone https://github.com/YOUR_ORG/grace-mission /tmp/grace-mission

# Build the agent sandbox image
docker build \
  -t clawix-agent:latest \
  -f /tmp/grace-mission/infra/docker/agent/Dockerfile \
  /tmp/grace-mission

# Verify
docker image ls clawix-agent:latest
```

---

## Step 3 — Create the Railway Project

### 3a. Create project and link repo

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select this repo
3. Railway auto-detects `railway.toml` and sets up the **API service**

### 3b. Add plugins

In the Railway project dashboard:
- Click **+ New** → **Database** → **PostgreSQL** → Add
- Click **+ New** → **Database** → **Redis** → Add

These inject `DATABASE_URL` and `REDIS_URL` into the API service automatically.

### 3c. Add the Web service

1. Click **+ New** → **GitHub Repo** → same repo
2. In the service settings → **Config File Path** → set to:
   ```
   infra/railway/web.toml
   ```

---

## Step 4 — Set Environment Variables

### API service variables

In Railway → API service → **Variables**, add:

```env
# Core
NODE_ENV=production
JWT_SECRET=<run: openssl rand -hex 32>
PROVIDER_ENCRYPTION_KEY=<run: openssl rand -hex 32>
CORS_ALLOWED_ORIGINS=https://<your-web-service>.railway.app

# Admin bootstrap (first deploy only)
INITIAL_ADMIN_EMAIL=your@email.com
INITIAL_ADMIN_PASSWORD=<strong password>
INITIAL_ADMIN_NAME=Your Name

# LLM defaults
DEFAULT_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o

# Paths
WORKSPACE_BASE_PATH=/data
WORKSPACE_HOST_BASE_PATH=/data
SKILLS_BUILTIN_DIR=/app/skills/builtin
SKILLS_BUILTIN_HOST_DIR=/app/skills/builtin
SKILLS_CUSTOM_DIR=/app/skills/custom
SKILLS_CUSTOM_HOST_DIR=/app/skills/custom

# Remote Docker (paste from vps-setup.sh output)
DOCKER_HOST=tcp://YOUR_VPS_IP:2376
DOCKER_TLS_VERIFY=1
DOCKER_CA_CERT=<base64 from vps-setup.sh>
DOCKER_CLIENT_CERT=<base64 from vps-setup.sh>
DOCKER_CLIENT_KEY=<base64 from vps-setup.sh>
```

### Web service variables

In Railway → Web service → **Variables**, add:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<api-service>.railway.app
NEXT_PUBLIC_WS_URL=wss://<api-service>.railway.app
```

> **Tip:** In Railway you can use `${{api.RAILWAY_PUBLIC_DOMAIN}}` to reference
> the API service domain without hardcoding it.

---

## Step 5 — Deploy

Click **Deploy** on both services (or push to your main branch — Railway auto-deploys).

**Deployment order Railway handles automatically:**
1. Builds API Docker image (`infra/docker/api/Dockerfile`)
2. Builds Web Docker image (`infra/docker/web/Dockerfile`)
3. Runs API entrypoint: waits for Postgres → runs migrations → starts server
4. Starts Web service

**First deploy health check:**
```bash
# API health
curl https://<api-service>.railway.app/health

# Web dashboard
open https://<web-service>.railway.app
```

---

## Step 6 — Post-Deploy: Add LLM Provider Keys

1. Log into the web dashboard with your admin credentials
2. Go to **Settings → Providers**
3. Add your OpenAI / Anthropic / Gemini API keys
4. Create agents and start conversations

---

## Updating the Deployment

After `git push` to main, Railway rebuilds automatically.

To force a redeploy:
```bash
# Using Railway CLI
railway redeploy
```

To update the VPS agent image after code changes:
```bash
ssh root@YOUR_VPS_IP
cd /tmp/grace-mission && git pull
docker build -t clawix-agent:latest -f infra/docker/agent/Dockerfile .
```

---

## Troubleshooting

### API fails to start
```bash
railway logs --service api
```
Common causes: missing env var, Postgres not ready, TLS cert decode failure.

### Agents fail to spawn
Check that the VPS Docker daemon is reachable:
```bash
# From your local machine (with certs)
docker \
  --host tcp://YOUR_VPS_IP:2376 \
  --tlsverify \
  --tlscacert /etc/docker/tls/ca.pem \
  --tlscert   /etc/docker/tls/client-cert.pem \
  --tlskey    /etc/docker/tls/client-key.pem \
  version
```

Check VPS firewall allows port 2376:
```bash
ssh root@YOUR_VPS_IP ufw status
```

### TLS certificate expired (after 5 years)
Re-run `vps-setup.sh` — it regenerates certs if they already exist by deleting the old ones first, then update Railway vars with the new base64 values.

---

## Cost Estimate

| Service | Provider | Monthly cost |
|---------|----------|-------------|
| Web + API | Railway Hobby | ~$5–10 |
| Postgres | Railway plugin | ~$5 |
| Redis | Railway plugin | ~$3 |
| VPS (agent runner) | Hetzner CX22 | ~€4 |
| **Total** | | **~$17–22/mo** |

---

## Files Reference

| File | Purpose |
|------|---------|
| `railway.toml` | API service Railway config (auto-detected) |
| `infra/railway/web.toml` | Web service Railway config |
| `infra/railway/env-reference.txt` | Full env var reference |
| `infra/railway/vps-setup.sh` | VPS bootstrap + TLS cert generation |
| `infra/docker/api/entrypoint.sh` | API entrypoint (handles TLS cert env vars) |
| `infra/docker/api/Dockerfile` | API production image |
| `infra/docker/web/Dockerfile` | Web production image |
