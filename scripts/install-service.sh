#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="gerenciador-demandas"

if [[ $EUID -ne 0 ]]; then
  echo "Execute com sudo: sudo bash scripts/install-service.sh"
  exit 1
fi

# Com sudo, whoami vira root — usar o usuário real
USER_NAME="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"
USER_HOME="$(getent passwd "$USER_NAME" | cut -d: -f6)"

# Node do usuário (nvm/fnm) ou do sistema
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" && -x "$USER_HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "$USER_HOME/.nvm/nvm.sh"
  NODE_BIN="$(command -v node)"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js não encontrado. Instale Node 22+ e tente de novo."
  exit 1
fi

NODE_VER="$("$NODE_BIN" -v | sed 's/v//')"
echo "Usando Node $NODE_VER em $NODE_BIN (serviço como $USER_NAME)"

UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

cat > "$UNIT_PATH" <<EOF
[Unit]
Description=Gerenciador de Demandas
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${ROOT}
Environment=PORT=3030
Environment=NODE_ENV=production
Environment=DATA_DIR=${USER_HOME}/.local/share/gerenciador-demandas
ExecStart=${NODE_BIN} ${ROOT}/server/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl restart "${SERVICE_NAME}.service"
systemctl status "${SERVICE_NAME}.service" --no-pager || true

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo ""
echo "Serviço instalado."
echo "Na VM:     http://localhost:3030"
if [[ -n "$IP" ]]; then
  echo "No Google: http://${IP}:3030"
fi
echo ""
echo "Comandos úteis:"
echo "  sudo systemctl status ${SERVICE_NAME}"
echo "  sudo systemctl restart ${SERVICE_NAME}"
echo "  sudo systemctl stop ${SERVICE_NAME}"
