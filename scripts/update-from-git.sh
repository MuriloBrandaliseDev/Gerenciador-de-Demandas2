#!/usr/bin/env bash
# Na VM: atualiza o sistema via git (sem tocar no banco).
# Uso: bash scripts/update-from-git.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ git pull..."
git pull --ff-only

echo "→ npm install..."
npm install

echo "→ build..."
npm run build

if systemctl is-enabled gerenciador-demandas >/dev/null 2>&1; then
  echo "→ restart serviço..."
  sudo systemctl restart gerenciador-demandas
  sudo systemctl is-active gerenciador-demandas
else
  echo "Serviço systemd ainda não instalado. Rode: sudo bash scripts/install-service.sh"
fi

echo ""
echo "Atualizado. Banco permanece em ~/.local/share/gerenciador-demandas/"
