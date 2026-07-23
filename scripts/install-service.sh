#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="gerenciador-demandas"

if [[ $EUID -ne 0 ]]; then
  echo "Execute com sudo: sudo bash scripts/install-service.sh"
  exit 1
fi

USER_NAME="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"
USER_HOME="$(getent passwd "$USER_NAME" | cut -d: -f6)"

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
DATA_DIR="${USER_HOME}/.local/share/gerenciador-demandas"
mkdir -p "$DATA_DIR"
chown -R "${USER_NAME}:${USER_NAME}" "$DATA_DIR" 2>/dev/null || true

# systemd não lida bem com espaços em WorkingDirectory — usa symlink sem espaços
APP_LINK="${USER_HOME}/gerenciador-demandas"
ln -sfn "$ROOT" "$APP_LINK"
chown -h "${USER_NAME}:${USER_NAME}" "$APP_LINK" 2>/dev/null || true

echo "Usando Node $NODE_VER em $NODE_BIN (serviço como $USER_NAME)"
echo "Pasta real: $ROOT"
echo "Link:       $APP_LINK"

UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

cat > "$UNIT_PATH" <<EOF
[Unit]
Description=Gerenciador de Demandas
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${APP_LINK}
Environment=PORT=3030
Environment=NODE_ENV=production
Environment=DATA_DIR=${DATA_DIR}
ExecStart=${NODE_BIN} ${APP_LINK}/server/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl restart "${SERVICE_NAME}.service"
sleep 1
systemctl --no-pager --full status "${SERVICE_NAME}.service" || true

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo ""
if systemctl is-active --quiet "${SERVICE_NAME}"; then
  echo "OK — serviço ativo."
  curl -sS "http://127.0.0.1:3030/api/health" || true
  echo ""
else
  echo "FALHOU — veja: journalctl -u ${SERVICE_NAME} -n 40 --no-pager"
fi
echo "Na VM:     http://localhost:3030"
if [[ -n "$IP" ]]; then
  echo "No Chrome: http://${IP}:3030"
fi
