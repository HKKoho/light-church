# Replacing an Existing App on the Same Hetzner Instance

This doc covers a different scenario from `Hetzner_deploy.md` (fresh server) and
`docs/DEPLOY_VPS.md` (general VPS guide): you already have a Hetzner Cloud
server running another app — referred to below as **`gracemission`** — and you
want to deploy this repo (Light Church / Clawixea) onto that **same instance**,
under a **new domain**, replacing `gracemission` rather than standing up a
second server.

> **Assumption check:** this guide assumes `gracemission` is itself a
> Docker-based stack (possibly an earlier Clawixea deployment) reachable via
> `docker compose` on the box, fronted by Caddy or nginx for TLS. SSH in and
> confirm with the commands in Step 1 before proceeding — if `gracemission`
> turns out to be something else (a different framework, bare-metal process,
> managed by systemd only, etc.), the stop/remove steps will differ and you
> should adapt them rather than run this verbatim.

---

## Step 0 — Back up before touching anything

Whatever `gracemission` turns out to be, get a backup off the box first. This
step is cheap insurance and should not be skipped even if you intend to delete
everything:

```bash
ssh deploy@<server-ip>
mkdir -p ~/backups/gracemission-final
```

If it's Postgres-backed (adjust container/db names to match what Step 1 finds):

```bash
docker exec <gracemission-postgres-container> pg_dump -U <db_user> <db_name> \
  | gzip > ~/backups/gracemission-final/db-$(date +%F).sql.gz
```

If it has a workspace/data directory (Clawixea-style deployments keep one at
`./data`):

```bash
tar czf ~/backups/gracemission-final/data-$(date +%F).tar.gz /path/to/gracemission/data
```

Copy the backup off the server too (`scp` it to your laptop) — don't leave the
only copy on the instance you're about to tear apart.

---

## Step 1 — Inventory what's currently running

```bash
ssh deploy@<server-ip>

# What containers/stacks exist
docker ps -a
docker compose ls

# What's listening on 80/443 and terminating TLS
sudo ss -tlnp | grep -E ':80|:443'
sudo systemctl status caddy 2>/dev/null || sudo systemctl status nginx 2>/dev/null

# Where gracemission's compose files / .env live
find / -maxdepth 4 -iname "docker-compose*.yml" 2>/dev/null
find / -maxdepth 4 -iname "gracemission*" 2>/dev/null
```

Note down:

- The directory `gracemission` runs from (call it `$GRACEMISSION_DIR` below)
- Its compose project name (`docker compose ls` shows this)
- Whether Caddy or nginx is the reverse proxy, and where its config file is
  (`/etc/caddy/Caddyfile` or `/etc/nginx/sites-enabled/*`)

---

## Step 2 — Point the new domain at the (existing) server

You're reusing the server's current IP — no new server needed. Add an **A
record** for your new domain:

```
A   <new-domain>   →   <server IPv4>   (the same IP gracemission already uses)
```

```bash
dig <new-domain> +short   # confirm it resolves before continuing
```

> **Cloudflare users:** set the proxy toggle to **DNS only** (grey cloud), not
> orange/proxied — the orange proxy breaks the WebSocket connection this app
> uses for live agent output (same caveat as in `Hetzner_deploy.md`).

Leave `gracemission`'s existing DNS record alone until you're sure the cutover
worked — it costs nothing to keep pointing at the same IP and gives you a
rollback path.

---

## Step 3 — Stop (don't delete yet) gracemission

Stop it rather than removing it outright, so you can roll back if the new
deploy has problems:

```bash
cd $GRACEMISSION_DIR
docker compose -f docker-compose.prod.yml stop   # or whatever compose file it uses
```

This frees up ports 3002/3003 (or whatever it was using) and stops it from
serving traffic, without deleting containers, images, or volumes yet.

---

## Step 4 — Clone and install this repo alongside it

Put this app in its own directory, separate from `$GRACEMISSION_DIR`:

```bash
cd ~
git clone https://github.com/HKKoho/light-church.git lightchurch
cd lightchurch
pnpm run install:clawix
```

Answer the installer prompts as in `Hetzner_deploy.md` Step 4, using:

| Prompt            | Answer                                  |
| ----------------- | --------------------------------------- |
| Deployment mode   | `1` (production)                        |
| Public host or IP | `<new-domain>` (no `https://`, no port) |
| Use HTTPS?        | `y`                                     |

The stack publishes on the server's **loopback** interface only — web on
`127.0.0.1:3000`, API on `127.0.0.1:3001` — and Caddy (Step 5) serves them
publicly on 443. The installer's pre-flight check stops before building
anything if those ports are still taken (for example by gracemission, if Step 3
didn't stop it). If something else on this box must keep 3000/3001, set other
ports first — e.g. `LIGHTCHURCH_WEB_PORT=3002 LIGHTCHURCH_API_PORT=3003 pnpm run
install:clawix` — and use them in the Caddyfile below; the installer saves them
to `.env` so updates keep them.

The installer bakes `https://<new-domain>:<port>` URLs into the build. Because
Caddy serves the API on its own subdomain without a port, follow
`Hetzner_deploy.md` (right after its Caddy step) to set `NEXT_PUBLIC_API_URL` /
`NEXT_PUBLIC_WS_URL` to `https://api.<new-domain>` / `wss://api.<new-domain>`
and `CORS_ALLOWED_ORIGINS` to `https://<new-domain>` in `.env`, then rebuild:
`pnpm run update:clawix`.

---

## Step 5 — Repoint the reverse proxy to the new domain

Add an `api.<new-domain>` DNS record pointing at this server (same as the root
record). Then, with **Caddy** (`/etc/caddy/Caddyfile`), remove or comment out
gracemission's blocks and add:

```caddyfile
<new-domain> {
	reverse_proxy localhost:3000
}

api.<new-domain> {
	reverse_proxy localhost:3001
}
```

Do **not** use a block like `<new-domain>:3000 { reverse_proxy localhost:3000 }` —
Caddy would try to bind the same host port the container already uses
(`bind: address already in use`).

```bash
sudo systemctl reload caddy
```

If **nginx**, the equivalent is two `server` blocks (`server_name <new-domain>`
→ `proxy_pass http://127.0.0.1:3000`, `server_name api.<new-domain>` →
`http://127.0.0.1:3001`, with WebSocket upgrade headers on the API), then
`sudo nginx -t && sudo systemctl reload nginx`.

Firewall (`ufw`) — only 80 (ACME) and 443 need to be open; the app ports stay
on loopback:

```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Step 6 — Verify the new deployment

```bash
curl https://api.<new-domain>/health
```

Open `https://<new-domain>` in a browser, log in with the admin credentials
from Step 4, and confirm the WebSocket shows "connected" (green dot) under
`/conversations`.

---

## Step 7 — Decommission gracemission for good

Only after the new domain has been verified working for a while:

```bash
cd $GRACEMISSION_DIR
docker compose -f docker-compose.prod.yml down          # add -v to also drop volumes
docker image ls | grep gracemission                       # review before removing
docker image rm <gracemission-image-ids>                  # optional cleanup
rm -rf $GRACEMISSION_DIR                                   # only once you're sure
```

Remove its DNS record and its Caddy/nginx block (if you left it in place as a
rollback path in Step 5) once you're confident you won't need to fall back to
it.

---

## Rollback

If the new deploy has problems before Step 7:

```bash
cd ~/lightchurch
docker compose -f docker-compose.prod.yml stop

cd $GRACEMISSION_DIR
docker compose -f docker-compose.prod.yml start
```

Re-enable gracemission's Caddy/nginx block if you'd disabled it, and reload
the proxy.

---

## See also

- `Hetzner_deploy.md` — fresh-server setup (server creation, Docker/Node
  install, full installer walkthrough) for anything in this doc that assumes
  prior steps you haven't done yet.
- `docs/DEPLOY_VPS.md` — general VPS deployment reference, provider-agnostic.
