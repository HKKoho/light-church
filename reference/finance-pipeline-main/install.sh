#!/usr/bin/env bash
# Install or update SecureFin Pipeline (Docker-based).
# Safe to re-run: rebuilds the image with any new code and recreates the
# container, but never touches the `app-data` volume (finance.db, reports,
# exports) or `postgres-data`, so existing data survives updates.
#
# Usage:
#   ./install.sh                 install/update the app only
#   ./install.sh --warehouse     also start the optional Postgres service
#   ./install.sh --no-cache      force a full image rebuild (ignore build cache)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WAREHOUSE=false
BUILD_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --warehouse) WAREHOUSE=true ;;
    --no-cache) BUILD_ARGS+=("--no-cache") ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--warehouse] [--no-cache]" >&2
      exit 1
      ;;
  esac
done

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m!!\033[0m %s\n' "$1"; }
die()   { printf '\033[1;31mError:\033[0m %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker and try again."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required (the 'docker compose' subcommand)."

# ── Pull latest source, if this is a git checkout with a remote ─────────────
if [ -d .git ]; then
  if git remote get-url origin >/dev/null 2>&1; then
    if [ -n "$(git status --porcelain)" ]; then
      warn "Local changes detected — skipping 'git pull' so nothing is overwritten."
    else
      info "Pulling latest changes..."
      git pull --ff-only
    fi
  fi
else
  info "Not a git checkout — using local source as-is."
fi

# ── Ensure .env exists ───────────────────────────────────────────────────────
if [ ! -f .env ]; then
  info "No .env found — creating one from .env.example."
  cp .env.example .env
  warn "Edit .env to add GEMINI_API_KEY / ANTHROPIC_API_KEY if you want AI-powered classification."
fi

# ── Build and (re)start ──────────────────────────────────────────────────────
info "Building image..."
if [ ${#BUILD_ARGS[@]} -gt 0 ]; then
  docker compose build "${BUILD_ARGS[@]}" app
else
  docker compose build app
fi

PROFILE_ARGS=()
if [ "$WAREHOUSE" = true ]; then
  PROFILE_ARGS+=(--profile warehouse)
  info "Starting app + Postgres warehouse service..."
else
  info "Starting app..."
fi

if [ ${#PROFILE_ARGS[@]} -gt 0 ]; then
  docker compose "${PROFILE_ARGS[@]}" up -d
else
  docker compose up -d
fi

# ── Wait for the app to come up ──────────────────────────────────────────────
info "Waiting for the app to respond..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/ >/dev/null 2>&1; then
    info "SecureFin Pipeline is running at http://localhost:3000"
    exit 0
  fi
  sleep 1
done

warn "App didn't respond after 30s — showing recent logs:"
docker compose logs --tail=50 app
exit 1
