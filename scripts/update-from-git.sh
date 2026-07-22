#!/usr/bin/env bash
# Atualiza o sistema via git (sem tocar no banco).
# Uso: bash scripts/update-from-git.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Pasta do app: $ROOT"
echo "→ git pull..."
git fetch --all --prune
git pull --ff-only origin main || git pull --ff-only

echo "→ npm install (root + client)..."
npm install
npm install --prefix client

echo "→ build..."
npm run build

echo "→ reinstalar/reiniciar serviço (garante WorkingDirectory correto)..."
if [[ -f scripts/install-service.sh ]]; then
  sudo bash scripts/install-service.sh
else
  sudo systemctl restart gerenciador-demandas
fi

sleep 1
echo "→ health check:"
curl -sS "http://127.0.0.1:3030/api/health" || true
echo ""
sudo systemctl is-active gerenciador-demandas

echo ""
echo "Atualizado. Se health.features.anexos != true, o serviço ainda aponta pasta errada."
echo "Banco: ~/.local/share/gerenciador-demandas/"
