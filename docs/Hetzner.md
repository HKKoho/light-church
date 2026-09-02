# Replacing an Existing App on the Same Hetzner Instance

This doc covers a different scenario from `Hetzner_deploy.md` (fresh server) and
`docs/DEPLOY_VPS.md` (general VPS guide): you already have a Hetzner Cloud
server running another app — referred to below as **`gracemission`** — and you
want to deploy this repo (Light Church / Clawix) onto that **same instance**,
under a **new domain**, replacing `gracemission` rather than standing up a
second server.

> **Assumption check:** this guide assumes `gracemission` is itself a
> Docker-based stack (possibly an earlier Clawix deployment) reachable via
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

If it has a workspace/data directory (Clawix-style deployments keep one at
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
git clone https://github.com/aibyml-ngo/clawix-ngo.git lightchurch
cd lightchurch
pnpm run install:clawix
```

Answer the installer prompts as in `Hetzner_deploy.md` Step 4, using:

| Prompt            | Answer                                  |
| ----------------- | --------------------------------------- |
| Deployment mode   | `1` (production)                        |
| Public host or IP | `<new-domain>` (no `https://`, no port) |
| Use HTTPS?        | `y`                                     |

This builds `clawix-agent:latest` and starts the stack via
`docker-compose.prod.yml`, listening on `3002` (web) / `3003` (API) same as
before — since `gracemission` is stopped, these ports are free.

---

## Step 5 — Repoint the reverse proxy to the new domain

If **Caddy** (edit `/etc/caddy/Caddyfile`): remove or comment out the blocks
for gracemission's old domain, add blocks for the new one:

```caddyfile
<new-domain>:3002 {
	reverse_proxy localhost:3002
}

<new-domain>:3003 {
	reverse_proxy localhost:3003
}
```

```bash
sudo systemctl reload caddy
```

If **nginx**, the equivalent is swapping the `server_name` / upstream in
whichever `sites-enabled` file pointed at gracemission, then
`sudo nginx -t && sudo systemctl reload nginx`.

Firewall (`ufw`) — confirm the ports this app needs are open (80 for ACME, plus
3002/3003 if you keep the port-suffixed URLs as in `Hetzner_deploy.md`):

```bash
sudo ufw status
sudo ufw allow 3002/tcp
sudo ufw allow 3003/tcp
```

---

## Step 6 — Verify the new deployment

```bash
curl https://<new-domain>:3003/health
```

Open `https://<new-domain>:3002` in a browser, log in with the admin
credentials from Step 4, and confirm the WebSocket shows "connected" (green
dot) under `/conversations`.

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
