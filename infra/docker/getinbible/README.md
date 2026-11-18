# Get in Bible — self-hosted

`reference/GetinBible` runs inside the Light Church stack instead of on Vercel +
supabase.com. Four services in `docker-compose.prod.yml`:

| Service              | What it is                                     | Reachable from                                        |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `getinbible`         | The app, its AI proxies, and the Supabase door | host `127.0.0.1:${LIGHTCHURCH_GETINBIBLE_PORT:-3005}` |
| `getinbible-db`      | Supabase Postgres 17 (`supabase/postgres`)     | `getinbible-internal` network only                    |
| `getinbible-rest`    | PostgREST — Supabase's `/rest/v1`              | `getinbible-internal` network only                    |
| `getinbible-storage` | Supabase Storage — `/storage/v1`               | `getinbible-internal` network only                    |

The app talks to "Supabase" at its own address: `server.ts` forwards
`/rest/v1/*` and `/storage/v1/*` to PostgREST and Storage (the job Kong does
in Supabase's own stack). Supabase Auth, Realtime, Studio and Kong are not
needed — Get in Bible keeps its own `users` table and uses only tables + one
storage bucket.

Data lives in Docker volumes `light-church_getinbible_db` (database) and
`light-church_getinbible_storage` (uploaded files). `uninstall:clawix` removes
them — export first if you want to keep them.

## Settings

`install:clawix` / `update:clawix` generate these into `.env` (never change
existing values):

| Variable                       | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `GETINBIBLE_POSTGRES_PASSWORD` | Password of the local database's service logins             |
| `GETINBIBLE_JWT_SECRET`        | Signs and verifies the API keys below                       |
| `GETINBIBLE_ANON_KEY`          | Public key compiled into the app (like Supabase's anon key) |
| `GETINBIBLE_SERVICE_KEY`       | Admin key — bypasses row security. Only for imports/admin.  |

You set:

| Variable                                                           | Default                 |                                                                    |
| ------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------ |
| `GETINBIBLE_URL`                                                   | `http://localhost:3005` | Address browsers use. Rebuild `web` + `getinbible` after changing. |
| `GETINBIBLE_OPENAI_API_KEY`                                        | `OPENAI_API_KEY`        | Michael assistant + OpenAI TTS                                     |
| `GETINBIBLE_GEMINI_API_KEY`, `GETINBIBLE_GOOGLE_CLOUD_TTS_API_KEY` | —                       | optional, with `GETINBIBLE_*_ENABLED=true`                         |

> The database secrets are fixed at the database's **first start**. If you
> change `GETINBIBLE_POSTGRES_PASSWORD` or `GETINBIBLE_JWT_SECRET` later, also
> reset the database (see "Starting over") or the services can't log in.

## Moving the data from supabase.com

The cloud project is only **read**; nothing there changes. Run this once,
before people start using the self-hosted copy (anything written to the cloud
after the import is not copied).

### 1. Collect three values from the Supabase dashboard

1. **`SOURCE_DB_URL`** — project → **Connect** (top bar) → **Session pooler**
   → copy the URI and put your database password in place of
   `[YOUR-PASSWORD]`. It looks like
   `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
   If the password has symbols such as `@ : / ? #`, percent-encode them
   (`@` → `%40`), or reset it to letters and digits under
   **Project Settings → Database**.
2. **`SOURCE_SUPABASE_URL`** — **Project Settings → Data API → Project URL**,
   e.g. `https://<ref>.supabase.co`.
3. **`SOURCE_SERVICE_KEY`** — **Project Settings → API Keys → Legacy API keys
   → `service_role`** (the long `eyJ…` key). Treat it like a password.

### 2. Start the local Supabase

```bash
pnpm run update:clawix          # adds the GETINBIBLE_* secrets, builds, starts
docker ps --filter name=lightchurch-getinbible   # db shows (healthy)
```

### 3. Import

Put a space before the command so the secrets stay out of shell history:

```bash
 SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
 SOURCE_SUPABASE_URL='https://<ref>.supabase.co' \
 SOURCE_SERVICE_KEY='eyJ…' \
 node scripts/getinbible-import-supabase.mjs
```

What it does:

1. **Database** — `pg_dump` of the `public` schema (tables, indexes, row
   security policies, grants, functions) and then its data, run from the
   `supabase/postgres` image so nothing needs installing. Loaded into
   `getinbible-db` in **one transaction**: it either all lands or nothing
   changes. The dump is kept in `data/getinbible-import/<time>/` (mode 600 — it
   contains member data; delete it once you're happy).
2. **Secure sign-in** — applies `reference/GetinBible/sql/secure_auth.sql`
   (see "Sign-in and passwords" below). Existing passwords are converted to
   bcrypt, so members keep theirs. It lists admin accounts that still need
   their own password.
3. **Files** — every Storage bucket (e.g. `scripture-documents`) is recreated
   with the same public/private setting, and every file is downloaded and
   uploaded. The database stores only relative paths (`storage_path`), so
   links keep working without rewriting.
4. **Check** — prints row counts per table. Compare with **Table Editor** on
   supabase.com.

Flags: `--skip-db` (files only — safe to repeat, it overwrites) and
`--skip-storage` (database only).

The script refuses to load into a database that already has tables, so a
second run can't double the data.

### 4. Give each admin their own password

Admins used to share one password written into the app's code (and so
visible to anyone). That no longer works. For each admin:

```bash
node scripts/getinbible-set-password.mjs "<admin name>"          # existing account
node scripts/getinbible-set-password.mjs "<new name>" --admin    # create an admin
```

The password is typed hidden (8+ characters). The same command resets a
member's forgotten password.

### 5. Check, then switch over

- Open `http://localhost:3005` (or Light Church → Bible & Ministries →
  Scripture & Learning → Get in Bible), sign in with an existing account, and
  open a lesson that has an uploaded document.
- When it looks right, point people at the new address, and pause the
  supabase.com project (Project Settings → General → Pause) and the Vercel
  deployment once you're sure you won't need them.

## Sign-in and passwords

`sql/secure_auth.sql` replaced the original browser-side login, which kept
passwords base64-encoded (reversible) in a table the public key could read,
used one hard-coded admin password, and let any visitor edit any user.

- **Server-side check** — the app posts to `/api/auth/login`
  (`reference/GetinBible/api/auth.ts`). The database function `gib_login()`
  compares the bcrypt hash; only the service key may call it. On success the
  server issues a 7-day session token that the app sends with every request.
- **Passwords out of reach** — hashes live in `user_credentials`, which the
  public and signed-in roles cannot read or write. `users` no longer has a
  password column.
- **Admin-only changes** — only admins (checked in the database on every
  request) can change or delete users, manage lesson documents, or upload to
  `scripture-documents`. New accounts are created only by signing in.
- **Brute force** — 10 failed attempts per name (or 50 per address) in 15
  minutes pauses sign-in for that name/address. Behind a reverse proxy every
  visitor shares one address, so the per-name limit is the one that counts.
- **Unchanged on purpose** — students without a password still sign in by
  name, and a new name still creates a student, as before.

Not yet tightened: the lesson, response, progress and group tables still
allow any visitor to read and write them (their original "allow all" rules).
That is the next step.

## Starting over

Wipes the local Get in Bible database and files:

```bash
docker compose -f docker-compose.prod.yml rm -sf getinbible getinbible-storage getinbible-rest getinbible-db
docker volume rm light-church_getinbible_db light-church_getinbible_db_config light-church_getinbible_storage
docker compose -f docker-compose.prod.yml up -d getinbible
```

## Backups

```bash
docker exec lightchurch-getinbible-db pg_dump -U postgres --schema=public > getinbible-$(date +%F).sql
docker run --rm -v light-church_getinbible_storage:/s -v "$PWD":/out alpine tar czf /out/getinbible-files-$(date +%F).tgz -C /s .
```
