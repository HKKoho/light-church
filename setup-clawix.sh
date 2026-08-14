#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-clawix.sh — Clone and install Clawix from scratch
#
# INTERACTIVE (default):
#   ./setup-clawix.sh
#
# AUTONOMOUS (no prompts):
#   ./setup-clawix.sh --auto --provider anthropic --api-key sk-ant-xxx
#   ANTHROPIC_API_KEY=sk-ant-xxx ./setup-clawix.sh --auto
#
# OPTIONS:
#   --auto                  Skip all prompts; use defaults + supplied keys
#   --provider  NAME        anthropic | openai | gemini | zai-coding | kimi-code
#   --api-key   KEY         API key for the chosen provider
#   --model     MODEL       Override default model for the provider
#   --dir       PATH        Where to clone (default: ~/clawixngo)
#   --mode      dev|prod    Deployment mode (default: dev)
#   --telegram  TOKEN       Telegram bot token (optional, autonomous only)
#   --clean                 Force-remove all Clawix Docker resources before install
#   --skip-clean            Never prompt about or remove existing Docker resources
#   --help                  Show this message
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="https://github.com/aibyml-ngo/clawix-ngo.git"
DEFAULT_DIR="$HOME/clawixngo"

# ── colours ───────────────────────────────────────────────────────────────────
bold()  { printf '\033[1m%s\033[0m' "$*"; }
green() { printf '\033[32m%s\033[0m' "$*"; }
yellow(){ printf '\033[33m%s\033[0m' "$*"; }
red()   { printf '\033[31m%s\033[0m' "$*"; }
cyan()  { printf '\033[36m%s\033[0m' "$*"; }
dim()   { printf '\033[2m%s\033[0m'  "$*"; }

ok()   { echo "  $(green '✓') $*"; }
warn() { echo "  $(yellow '⚠') $*"; }
fail() { echo "  $(red '✗') $*" >&2; }
step() { echo; echo "$(bold "$(cyan "--- $* ---")")"; }
info() { echo "  $*"; }
lower(){ echo "$*" | tr '[:upper:]' '[:lower:]'; }

# ── provider helpers (case-based, compatible with bash 3.2) ───────────────────
provider_env_key() {
  case "$1" in
    anthropic)  echo "ANTHROPIC_API_KEY" ;;
    openai)     echo "OPENAI_API_KEY" ;;
    gemini)     echo "GEMINI_API_KEY" ;;
    zai-coding) echo "ZAI_CODING_API_KEY" ;;
    kimi-code)  echo "KIMI_CODE_API_KEY" ;;
    *)          echo "" ;;
  esac
}

provider_default_model() {
  case "$1" in
    anthropic)  echo "claude-sonnet-4-5" ;;
    openai)     echo "gpt-4o" ;;
    gemini)     echo "gemini-3-flash-preview" ;;
    zai-coding) echo "glm-4.7" ;;
    kimi-code)  echo "" ;;
    *)          echo "" ;;
  esac
}

# ── argument parsing ──────────────────────────────────────────────────────────
AUTO=false
FORCE_CLEAN=false
SKIP_CLEAN=false
PROVIDER=""
API_KEY=""
MODEL=""
TARGET_DIR="$DEFAULT_DIR"
DEPLOY_MODE="dev"
TELEGRAM_TOKEN=""

usage() {
  grep '^#' "$0" | grep -v '#!/' | sed 's/^# \{0,2\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto)        AUTO=true ;;
    --clean)       FORCE_CLEAN=true ;;
    --skip-clean)  SKIP_CLEAN=true ;;
    --provider)    PROVIDER="$2";       shift ;;
    --api-key)     API_KEY="$2";        shift ;;
    --model)       MODEL="$2";          shift ;;
    --dir)         TARGET_DIR="$2";     shift ;;
    --mode)        DEPLOY_MODE="$2";    shift ;;
    --telegram)    TELEGRAM_TOKEN="$2"; shift ;;
    --help|-h)     usage ;;
    *) fail "Unknown option: $1"; echo "Run with --help for usage."; exit 1 ;;
  esac
  shift
done

# ── auto-detect API key from environment ──────────────────────────────────────
if $AUTO && [[ -z "$API_KEY" ]]; then
  if   [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then API_KEY="$ANTHROPIC_API_KEY"; [[ -z "$PROVIDER" ]] && PROVIDER="anthropic"
  elif [[ -n "${OPENAI_API_KEY:-}" ]];    then API_KEY="$OPENAI_API_KEY";    [[ -z "$PROVIDER" ]] && PROVIDER="openai"
  elif [[ -n "${GEMINI_API_KEY:-}" ]];    then API_KEY="$GEMINI_API_KEY";    [[ -z "$PROVIDER" ]] && PROVIDER="gemini"
  fi
fi

# ── validate autonomous requirements ─────────────────────────────────────────
if $AUTO; then
  if [[ -z "$PROVIDER" ]]; then
    fail "Autonomous mode requires --provider (or set ANTHROPIC_API_KEY / OPENAI_API_KEY in env)."
    exit 1
  fi
  ENV_KEY=$(provider_env_key "$PROVIDER")
  if [[ -z "$ENV_KEY" ]]; then
    fail "Unknown provider: $PROVIDER. Valid: anthropic, openai, gemini, zai-coding, kimi-code"
    exit 1
  fi
  if [[ -z "$API_KEY" ]]; then
    fail "Autonomous mode requires --api-key (or set $ENV_KEY in env)."
    exit 1
  fi
  if [[ -z "$MODEL" ]]; then
    MODEL=$(provider_default_model "$PROVIDER")
    if [[ -z "$MODEL" ]]; then
      fail "Provider $PROVIDER has no default model. Pass --model MODEL."
      exit 1
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "$(bold '=== Clawix Setup ===')"
echo

# ── prerequisites ─────────────────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Install from https://nodejs.org (v20+)."
  exit 1
fi
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  fail "Node.js 20+ required. Current: $(node --version)"
  exit 1
fi
ok "Node.js $(node --version)"

if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found — installing..."
  npm install -g pnpm
fi
ok "pnpm $(pnpm --version)"

if ! command -v docker &>/dev/null; then
  fail "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop"
  exit 1
fi
ok "$(docker --version)"

if ! docker info &>/dev/null 2>&1; then
  echo
  warn "Docker Desktop is not running."
  echo
  info "  Please open Docker Desktop now:"
  info "    1. Press $(bold 'Cmd + Space') on your keyboard"
  info "    2. Type $(bold 'Docker') and press Enter"
  info "    3. Wait for the whale icon $(bold '🐳') to appear in your menu bar (top-right of screen)"
  info "    4. The script will continue automatically once Docker is ready"
  echo
  DOCKER_WAIT=0
  while ! docker info &>/dev/null 2>&1; do
    if [[ $DOCKER_WAIT -ge 180 ]]; then
      echo
      fail "Docker did not start within 3 minutes."
      info "  Please make sure Docker Desktop is open and fully loaded, then run this script again."
      exit 1
    fi
    printf "\r  $(yellow '⏳') Waiting for Docker to be ready... ${DOCKER_WAIT}s"
    sleep 3
    DOCKER_WAIT=$(( DOCKER_WAIT + 3 ))
  done
  printf "\r%50s\r" " "
fi
ok "Docker daemon running"

if ! docker compose version &>/dev/null 2>&1; then
  fail "Docker Compose v2 plugin not found. Update Docker Desktop."
  exit 1
fi
ok "Docker Compose available"

# ─────────────────────────────────────────────────────────────────────────────
# DOCKER CLEANUP
# Detect any existing Clawix containers, images, volumes, and networks that
# could conflict with a fresh install and offer to remove them.
# ─────────────────────────────────────────────────────────────────────────────
if ! $SKIP_CLEAN; then
  step "Checking for existing Clawix Docker resources"

  # Named containers: lightchurch-postgres, lightchurch-redis, lightchurch-api,
  # lightchurch-web, lightchurch-browser. Scoped to the `lightchurch-` prefix
  # (not a bare `clawix-`/`clawix_` pattern) deliberately — this host runs
  # several sibling Clawix checkouts side by side, each with their own live
  # containers/volumes/networks, and a generic pattern here previously risked
  # this cleanup step detecting and offering to delete another project's
  # running production stack (including its database) as if it were this
  # repo's own leftovers.
  EXISTING_CONTAINERS=$(docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Image}}' \
    | grep -E '^lightchurch-' || true)

  # Agent containers spawned at runtime (random names but clawix-agent image —
  # shared image tag across sibling checkouts, so this can't be scoped further)
  AGENT_CONTAINERS=$(docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Image}}' \
    | grep 'clawix-agent' | grep -vE '^lightchurch-' || true)

  # Images: clawix-agent:latest, clawix-api:latest, clawix-web:latest — these
  # tags are shared across sibling checkouts (not project-scoped), so we can't
  # safely offer to remove them here; left undetected rather than risk
  # deleting an image another project's running containers still reference.
  EXISTING_IMAGES=""

  # Volumes prefixed light-church_ (the Compose project-name prefix for this
  # checkout's postgres_data, redis_data, node_modules volumes)
  EXISTING_VOLUMES=$(docker volume ls --format '{{.Name}}' \
    | grep -E '^light-church_' || true)

  # Networks
  EXISTING_NETWORKS=$(docker network ls --format '{{.Name}}' \
    | grep -E '^lightchurch[_-]' || true)

  # Port conflicts on ports this checkout uses
  PORT_CONFLICTS=""
  for PORT in 3010 3011 5443 6390; do
    if lsof -iTCP:"$PORT" -sTCP:LISTEN &>/dev/null 2>&1; then
      PROC=$(lsof -iTCP:"$PORT" -sTCP:LISTEN -Fp 2>/dev/null | head -1 | sed 's/^p//')
      PNAME=$(ps -p "$PROC" -o comm= 2>/dev/null || echo "unknown")
      PORT_CONFLICTS="${PORT_CONFLICTS}    port $PORT — held by $PNAME (pid $PROC)\n"
    fi
  done

  HAS_RESOURCES=false
  if [[ -n "$EXISTING_CONTAINERS" || -n "$AGENT_CONTAINERS" || \
        -n "$EXISTING_IMAGES" || -n "$EXISTING_VOLUMES" || \
        -n "$EXISTING_NETWORKS" ]]; then
    HAS_RESOURCES=true
  fi

  if $HAS_RESOURCES || [[ -n "$PORT_CONFLICTS" ]]; then
    echo

    if [[ -n "$EXISTING_CONTAINERS" ]]; then
      warn "Containers found:"
      while IFS='	' read -r name status image; do
        info "    $(red "$name")  [$status]  ($image)"
      done <<< "$EXISTING_CONTAINERS"
    fi

    if [[ -n "$AGENT_CONTAINERS" ]]; then
      warn "Agent containers found (spawned at runtime):"
      while IFS='	' read -r name status image; do
        info "    $(red "$name")  [$status]  ($image)"
      done <<< "$AGENT_CONTAINERS"
    fi

    if [[ -n "$EXISTING_IMAGES" ]]; then
      warn "Images found:"
      while read -r img; do
        info "    $(yellow "$img")"
      done <<< "$EXISTING_IMAGES"
    fi

    if [[ -n "$EXISTING_VOLUMES" ]]; then
      warn "Volumes found (contain database data — removal is destructive):"
      while read -r vol; do
        info "    $(yellow "$vol")"
      done <<< "$EXISTING_VOLUMES"
    fi

    if [[ -n "$EXISTING_NETWORKS" ]]; then
      warn "Networks found:"
      while read -r net; do
        info "    $(yellow "$net")"
      done <<< "$EXISTING_NETWORKS"
    fi

    if [[ -n "$PORT_CONFLICTS" ]]; then
      warn "Port conflicts detected:"
      printf "$PORT_CONFLICTS"
      info "  Stop these processes manually before starting the stack."
    fi

    echo

    DO_CLEAN=false

    if $FORCE_CLEAN; then
      DO_CLEAN=true
      info "$(yellow '--clean flag set — removing all Clawix Docker resources.')"
    elif $AUTO; then
      DO_CLEAN=true
      info "$(yellow 'Autonomous mode — removing existing Clawix Docker resources.')"
    else
      printf "  Remove all Clawix containers, images, volumes, and networks listed above? (y/N): "
      read -r CLEAN_ANSWER
      if [[ "$(lower "$CLEAN_ANSWER")" == "y" || "$(lower "$CLEAN_ANSWER")" == "yes" ]]; then
        DO_CLEAN=true
      fi
    fi

    if $DO_CLEAN; then
      echo

      # Stop and remove named + agent containers
      ALL_CONTAINERS=$(printf '%s\n%s' "$EXISTING_CONTAINERS" "$AGENT_CONTAINERS" \
        | awk -F'\t' '{print $1}' | grep -v '^$' || true)
      if [[ -n "$ALL_CONTAINERS" ]]; then
        info "Stopping and removing containers..."
        while read -r name; do
          docker rm -f "$name" &>/dev/null && info "  removed container: $(red "$name")" || true
        done <<< "$ALL_CONTAINERS"
      fi

      # Remove images
      if [[ -n "$EXISTING_IMAGES" ]]; then
        info "Removing images..."
        while read -r img; do
          docker rmi -f "$img" &>/dev/null && info "  removed image: $(yellow "$img")" || true
        done <<< "$EXISTING_IMAGES"
      fi

      # Remove volumes — ask again in interactive mode (destructive)
      if [[ -n "$EXISTING_VOLUMES" ]]; then
        REMOVE_VOLUMES=false
        if $AUTO || $FORCE_CLEAN; then
          REMOVE_VOLUMES=true
        else
          printf "\n  $(red 'Volumes contain database data and will be permanently deleted.')\n"
          printf "  Delete volumes too? (y/N): "
          read -r VOL_ANSWER
          if [[ "$(lower "$VOL_ANSWER")" == "y" || "$(lower "$VOL_ANSWER")" == "yes" ]]; then
            REMOVE_VOLUMES=true
          fi
        fi

        if $REMOVE_VOLUMES; then
          info "Removing volumes..."
          while read -r vol; do
            docker volume rm "$vol" &>/dev/null && info "  removed volume: $(yellow "$vol")" || true
          done <<< "$EXISTING_VOLUMES"
        else
          warn "Volumes kept — existing database data will be reused."
        fi
      fi

      # Remove networks
      if [[ -n "$EXISTING_NETWORKS" ]]; then
        info "Removing networks..."
        while read -r net; do
          docker network rm "$net" &>/dev/null && info "  removed network: $(yellow "$net")" || true
        done <<< "$EXISTING_NETWORKS"
      fi

      ok "Cleanup complete"
    else
      warn "Skipping cleanup. Existing resources may conflict with the new install."
    fi

  else
    ok "No existing Clawix Docker resources found"
  fi
fi

# ── clone ─────────────────────────────────────────────────────────────────────
step "Repository"

if [[ -d "$TARGET_DIR/.git" ]]; then
  warn "Repository already exists at $TARGET_DIR — skipping clone."
else
  if [[ -d "$TARGET_DIR" ]]; then
    fail "Directory $TARGET_DIR exists but is not a git repo. Remove it or choose a different --dir."
    exit 1
  fi
  info "Cloning into $TARGET_DIR ..."
  git clone "$REPO_URL" "$TARGET_DIR"
  ok "Cloned"
fi

cd "$TARGET_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# INTERACTIVE MODE — hand off to the project's own installer
# ─────────────────────────────────────────────────────────────────────────────
if ! $AUTO; then
  step "Starting interactive installer"
  info "Docker is running and any conflicting resources have been handled."
  info "Handing off to the Clawix installer..."
  echo
  pnpm run install:clawix
  echo
  step "Seeding NGO agents and workspace"
  info "Running NGO agent seed..."
  node scripts/seed-ngo-agents.mjs && ok "NGO agents seeded" || warn "NGO agent seed failed — run manually: node scripts/seed-ngo-agents.mjs"
  info "Running NGO workspace + skills setup..."
  node scripts/setup-ngo.mjs && ok "NGO workspace and skills seeded" || warn "NGO setup failed — run manually: node scripts/setup-ngo.mjs"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# AUTONOMOUS MODE — write .env and run each step directly
# ─────────────────────────────────────────────────────────────────────────────
step "Writing .env  $(dim '(autonomous)')"

if [[ -f .env ]]; then
  warn ".env already exists — keeping existing file. Delete it to regenerate."
else
  cp .env.example .env

  ENV_KEY_NAME=$(provider_env_key "$PROVIDER")
  ENCRYPTION_KEY=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
  JWT_SECRET_VAL=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  POSTGRES_PASS=$(node -e "process.stdout.write(require('crypto').randomBytes(16).toString('hex'))")

  upsert() {
    local key="$1" val="$2"
    if grep -qE "^[[:space:]]*#?[[:space:]]*${key}=" .env; then
      sed -i.bak -E "s|^[[:space:]]*#?[[:space:]]*${key}=.*|${key}=${val}|" .env
      rm -f .env.bak
    else
      printf '\n%s=%s\n' "$key" "$val" >> .env
    fi
  }

  upsert "DEFAULT_PROVIDER"        "$PROVIDER"
  upsert "DEFAULT_LLM_MODEL"       "$MODEL"
  upsert "$ENV_KEY_NAME"           "$API_KEY"
  upsert "PROVIDER_ENCRYPTION_KEY" "$ENCRYPTION_KEY"
  upsert "JWT_SECRET"              "$JWT_SECRET_VAL"
  upsert "POSTGRES_PASSWORD"       "$POSTGRES_PASS"
  upsert "POSTGRES_USER"           "clawix"
  upsert "POSTGRES_DB"             "clawix"
  upsert "NODE_ENV"                "development"
  upsert "CLAWIX_DEPLOY_MODE"      "development"

  if [[ -n "$TELEGRAM_TOKEN" ]]; then
    upsert "TELEGRAM_BOT_TOKEN" "$TELEGRAM_TOKEN"
  fi

  chmod 600 .env
  ok ".env written (permissions 600)"
fi

step "Installing dependencies"
pnpm install
ok "pnpm install done"

step "Building @clawix/shared"
pnpm --filter @clawix/shared run build
ok "Built"

step "Generating Prisma client"
pnpm --filter @clawix/api run db:generate
ok "Prisma client generated"

step "Building agent Docker image"
docker build -t clawix-agent:latest -f infra/docker/agent/Dockerfile .
ok "clawix-agent:latest built"

step "Starting stack"
docker compose -f docker-compose.dev.yml up -d --remove-orphans
ok "Containers started"

step "Waiting for API /health  $(dim '(up to 3 min on first run)')"
DEADLINE=$(( $(date +%s) + 180 ))
until curl -sf http://localhost:3011/health &>/dev/null; do
  if [[ $(date +%s) -ge $DEADLINE ]]; then
    fail "API did not become healthy within 3 minutes."
    info "Check logs: docker compose -f docker-compose.dev.yml logs api"
    exit 1
  fi
  sleep 3
done
ok "API is healthy"

step "Seeding NGO agents and workspace"
info "Running NGO agent seed..."
node scripts/seed-ngo-agents.mjs && ok "NGO agents seeded" || warn "NGO agent seed failed — run manually: node scripts/seed-ngo-agents.mjs"
info "Running NGO workspace + skills setup..."
node scripts/setup-ngo.mjs && ok "NGO workspace and skills seeded" || warn "NGO setup failed — run manually: node scripts/setup-ngo.mjs"

echo
echo "$(bold "$(green '=== Installation complete ===')")"
echo
echo "  $(bold 'Dashboard:')  $(cyan 'http://localhost:3010')"
echo "  $(bold 'API:')        $(cyan 'http://localhost:3011')"
echo
echo "  $(bold 'Log in with:')"
echo "    Email:    ${INITIAL_ADMIN_EMAIL:-aibyml.ngo@gmail.com}"
echo "    Password: (as set in INITIAL_ADMIN_PASSWORD in your .env)"
echo
echo "  $(bold 'Useful commands') (run from $TARGET_DIR):"
echo "    $(dim 'pnpm run docker:dev')                                 start the stack"
echo "    $(dim 'pnpm run docker:dev:down')                            stop the stack"
echo "    $(dim 'pnpm run update:clawix')                              rebuild after code changes"
echo "    $(dim 'docker compose -f docker-compose.dev.yml logs -f')    tail logs"
echo
