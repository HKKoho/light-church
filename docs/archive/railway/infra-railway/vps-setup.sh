#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Grace Mission — VPS Agent Runner Setup
# ─────────────────────────────────────────────────────────────────────────────
# Run this script as root on a fresh Ubuntu 22.04 / 24.04 VPS.
# It installs Docker, configures a TLS-secured TCP daemon on port 2376,
# builds the agent image, and prints the environment variables to paste
# into Railway.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-org/grace-mission/main/infra/railway/vps-setup.sh | bash
#   -- OR --
#   scp infra/railway/vps-setup.sh root@VPS_IP:/tmp/ && ssh root@VPS_IP bash /tmp/vps-setup.sh
#
# After the script completes, copy the printed DOCKER_* vars into Railway.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
die()     { echo -e "${RED}[fail]${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root (sudo bash $0)"

VPS_IP="${VPS_IP:-$(curl -fsSL ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')}"
CERT_DIR=/etc/docker/tls
DATA_DIR=/data
AGENT_IMAGE="${AGENT_IMAGE:-clawix-agent:latest}"
REPO_URL="${REPO_URL:-}"   # optional: git repo URL to clone for image build

info "VPS public IP: $VPS_IP"
info "TLS cert dir:  $CERT_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 1. Install Docker
# ─────────────────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  apt-get update -qq
  apt-get install -y --no-install-recommends ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update -qq
  apt-get install -y docker-ce docker-ce-cli containerd.io
  success "Docker installed: $(docker --version)"
else
  success "Docker already installed: $(docker --version)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Generate TLS certificates
# ─────────────────────────────────────────────────────────────────────────────
info "Generating TLS certificates in $CERT_DIR ..."
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

# CA
if [[ ! -f ca-key.pem ]]; then
  openssl genrsa -out ca-key.pem 4096 2>/dev/null
  openssl req -new -x509 -days 1825 -key ca-key.pem \
    -sha256 -out ca.pem \
    -subj "/CN=docker-ca" 2>/dev/null
  success "CA certificate created"
fi

# Server key + cert (SAN includes VPS IP)
if [[ ! -f server-cert.pem ]]; then
  openssl genrsa -out server-key.pem 4096 2>/dev/null
  openssl req -subj "/CN=$VPS_IP" -sha256 -new \
    -key server-key.pem -out server.csr 2>/dev/null
  echo "subjectAltName = IP:$VPS_IP,IP:127.0.0.1" > extfile.cnf
  echo "extendedKeyUsage = serverAuth"              >> extfile.cnf
  openssl x509 -req -days 1825 -sha256 \
    -in server.csr -CA ca.pem -CAkey ca-key.pem \
    -CAcreateserial -out server-cert.pem \
    -extfile extfile.cnf 2>/dev/null
  success "Server certificate created"
fi

# Client key + cert
if [[ ! -f client-cert.pem ]]; then
  openssl genrsa -out client-key.pem 4096 2>/dev/null
  openssl req -subj "/CN=railway-client" -new \
    -key client-key.pem -out client.csr 2>/dev/null
  echo "extendedKeyUsage = clientAuth" > extfile-client.cnf
  openssl x509 -req -days 1825 -sha256 \
    -in client.csr -CA ca.pem -CAkey ca-key.pem \
    -CAcreateserial -out client-cert.pem \
    -extfile extfile-client.cnf 2>/dev/null
  success "Client certificate created"
fi

chmod 0400 ca-key.pem server-key.pem client-key.pem
chmod 0444 ca.pem server-cert.pem client-cert.pem

# ─────────────────────────────────────────────────────────────────────────────
# 3. Configure Docker daemon for TLS on port 2376
# ─────────────────────────────────────────────────────────────────────────────
info "Configuring Docker daemon..."
cat > /etc/docker/daemon.json <<EOF
{
  "hosts":    ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tls":      true,
  "tlscacert": "$CERT_DIR/ca.pem",
  "tlscert":   "$CERT_DIR/server-cert.pem",
  "tlskey":    "$CERT_DIR/server-key.pem",
  "tlsverify": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Override systemd ExecStart to remove -H fd:// (conflicts with daemon.json hosts)
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf <<'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
EOF

systemctl daemon-reload
systemctl restart docker
sleep 2
systemctl is-active docker || die "Docker failed to start — check: journalctl -u docker"
success "Docker daemon restarted with TLS on port 2376"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Firewall — allow only port 2376 + SSH
# ─────────────────────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  info "Configuring UFW firewall..."
  ufw --force reset >/dev/null
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw allow 22/tcp    comment "SSH" >/dev/null
  ufw allow 2376/tcp  comment "Docker TLS" >/dev/null
  ufw --force enable >/dev/null
  success "UFW configured: SSH + Docker TLS only"
else
  warn "UFW not found — configure your firewall manually to allow port 2376 and deny others"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Create workspace data directory
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p "$DATA_DIR"
chmod 777 "$DATA_DIR"
success "Workspace data dir: $DATA_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Build or pull the agent image
# ─────────────────────────────────────────────────────────────────────────────
if docker image inspect "$AGENT_IMAGE" &>/dev/null; then
  success "Agent image already present: $AGENT_IMAGE"
elif [[ -n "$REPO_URL" ]]; then
  info "Cloning repo to build agent image..."
  tmpdir=$(mktemp -d)
  git clone --depth 1 "$REPO_URL" "$tmpdir/repo"
  docker build -t "$AGENT_IMAGE" \
    -f "$tmpdir/repo/infra/docker/agent/Dockerfile" \
    "$tmpdir/repo"
  rm -rf "$tmpdir"
  success "Agent image built: $AGENT_IMAGE"
else
  warn "Agent image not found and REPO_URL not set."
  warn "Build it manually on this VPS:"
  warn "  git clone <repo> /tmp/grace && docker build -t $AGENT_IMAGE -f /tmp/grace/infra/docker/agent/Dockerfile /tmp/grace"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. Verify remote connection works
# ─────────────────────────────────────────────────────────────────────────────
info "Verifying TLS connection to Docker daemon..."
docker \
  --host "tcp://$VPS_IP:2376" \
  --tlsverify \
  --tlscacert "$CERT_DIR/ca.pem" \
  --tlscert   "$CERT_DIR/client-cert.pem" \
  --tlskey    "$CERT_DIR/client-key.pem" \
  version --format '{{.Server.Version}}' \
  && success "Remote TLS connection verified!" \
  || die "TLS connection test failed"

# ─────────────────────────────────────────────────────────────────────────────
# 8. Print Railway environment variables
# ─────────────────────────────────────────────────────────────────────────────
CA_B64=$(base64 -w0 "$CERT_DIR/ca.pem")
CERT_B64=$(base64 -w0 "$CERT_DIR/client-cert.pem")
KEY_B64=$(base64 -w0 "$CERT_DIR/client-key.pem")

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Paste these into Railway → API service → Variables${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "DOCKER_HOST=tcp://${VPS_IP}:2376"
echo "DOCKER_TLS_VERIFY=1"
echo "DOCKER_CA_CERT=${CA_B64}"
echo "DOCKER_CLIENT_CERT=${CERT_B64}"
echo "DOCKER_CLIENT_KEY=${KEY_B64}"
echo "WORKSPACE_HOST_BASE_PATH=/data"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Also set in Railway:${NC}"
echo "  DATABASE_URL      — auto-injected by Railway Postgres plugin"
echo "  REDIS_URL         — auto-injected by Railway Redis plugin"
echo "  JWT_SECRET        — openssl rand -hex 32"
echo "  PROVIDER_ENCRYPTION_KEY — openssl rand -hex 32"
echo "  CORS_ALLOWED_ORIGINS    — https://<web>.railway.app"
echo ""
echo -e "${YELLOW}VPS IP:${NC} $VPS_IP"
echo -e "${YELLOW}Certs:${NC}  $CERT_DIR"
echo ""
success "VPS setup complete."
