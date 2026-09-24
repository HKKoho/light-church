#!/usr/bin/env bash
# Builds and (re)deploys the three containers this project splits into:
#   app          — dashboard + pipeline/warehouse API (server.ts)
#   ai-assistant — Layer 4, the "Agentic AI" chat/action service
#   rpa-worker   — Layer 1, the RPA extraction job (built here, but not
#                  started — it's an on-demand job, see run_rpa() below)
#
# Usage:
#   scripts/docker-build.sh install   # first-time build + bring app & ai-assistant up
#   scripts/docker-build.sh install --with-warehouse   # ...and also bring up postgres
#   scripts/docker-build.sh update    # rebuild images with latest code/deps, recreate containers
#   scripts/docker-build.sh update --with-warehouse    # ...and also (re)start postgres
#   scripts/docker-build.sh build     # build all images only, don't touch running containers
#   scripts/docker-build.sh start     # start app + ai-assistant + postgres from whatever's already built, no rebuild
#   scripts/docker-build.sh warehouse # bring up postgres (Layer 5's optional warehouse target) on its own
#   scripts/docker-build.sh run-rpa -- --bank BNU --from 2026-01-01 --to 2026-03-31
#                                      # build (if needed) and run one RPA extraction job
#
# Data (finance.db, staging, reports, exports, and postgres's own data)
# lives in named volumes, so none of these commands ever touch it — only
# image + container state.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE="docker compose"
SERVICES_UP="app ai-assistant"   # persistent services; rpa-worker is excluded on purpose

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
die() { printf '\033[1;31mError: %s\033[0m\n' "$1" >&2; exit 1; }

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed or not on PATH"
  docker info >/dev/null 2>&1 || die "Docker daemon is not running"
}

build_images() {
  log "Building app image"
  $COMPOSE build app

  log "Building ai-assistant image"
  $COMPOSE build ai-assistant

  log "Building rpa-worker image (job container — not started)"
  $COMPOSE --profile rpa build rpa-worker
}

deploy() {
  log "Recreating containers: $SERVICES_UP"
  # shellcheck disable=SC2086
  $COMPOSE up -d $SERVICES_UP

  log "Waiting for app to answer on :3000"
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://localhost:3000/api/bots" 2>/dev/null; then
      echo "app is up."
      break
    fi
    sleep 1
  done

  log "Waiting for ai-assistant to answer on :4001"
  for _ in $(seq 1 30); do
    if docker compose exec -T ai-assistant node -e \
        "fetch('http://localhost:4001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
        >/dev/null 2>&1; then
      echo "ai-assistant is up."
      break
    fi
    sleep 1
  done

  log "Status"
  # shellcheck disable=SC2086
  $COMPOSE ps $SERVICES_UP
}

run_rpa() {
  log "Building rpa-worker image"
  $COMPOSE --profile rpa build rpa-worker

  log "Running extraction job"
  $COMPOSE --profile rpa run --rm rpa-worker "$@"
}

deploy_warehouse() {
  log "Starting postgres (--profile warehouse)"
  $COMPOSE --profile warehouse up -d postgres

  log "Waiting for postgres to accept connections"
  for _ in $(seq 1 30); do
    if $COMPOSE --profile warehouse exec -T postgres pg_isready -U finpipeline >/dev/null 2>&1; then
      echo "postgres is up."
      break
    fi
    sleep 1
  done

  log "Status"
  $COMPOSE --profile warehouse ps postgres

  cat <<'EOF'

To actually route Layer 5 warehouse exports here, set in .env:
  WAREHOUSE_POSTGRES_URL=postgresql://finpipeline:finpipeline@postgres:5432/finpipeline
then re-run: scripts/docker-build.sh update
EOF
}

require_docker

WITH_WAREHOUSE=false
for arg in "$@"; do
  [ "$arg" = "--with-warehouse" ] && WITH_WAREHOUSE=true
done

case "${1:-}" in
  install)
    log "Install: building all images and starting app + ai-assistant"
    build_images
    deploy
    $WITH_WAREHOUSE && deploy_warehouse
    ;;
  update)
    log "Update: rebuilding images with latest code/deps and recreating containers"
    build_images
    deploy
    $WITH_WAREHOUSE && deploy_warehouse
    ;;
  build)
    build_images
    ;;
  start)
    log "Start: bringing up app + ai-assistant + postgres from existing images (no rebuild)"
    deploy
    deploy_warehouse
    ;;
  warehouse)
    deploy_warehouse
    ;;
  run-rpa)
    shift
    [ "${1:-}" = "--" ] && shift
    run_rpa "$@"
    ;;
  *)
    echo "Usage: $0 {install|update|build|start|warehouse|run-rpa -- <extraction args>} [--with-warehouse]"
    exit 1
    ;;
esac
