#!/usr/bin/env bash
# Atualiza o código na VM SEM apagar o banco de dados.
# Uso (no Windows com Git Bash / WSL, ou na própria máquina):
#   bash scripts/deploy-to-vm.sh murilodev@192.168.65.128
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Uso: bash scripts/deploy-to-vm.sh usuario@IP-DA-VM"
  echo "Ex.:  bash scripts/deploy-to-vm.sh murilodev@192.168.65.128"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR='~/Gerenciador\ de\ Demandas'

echo "→ Enviando código (excluindo data/, node_modules, .git)..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'client/node_modules' \
  --exclude 'data/*.db' \
  --exclude 'data/*.db-*' \
  --exclude '.git' \
  --exclude '*.log' \
  "$ROOT/" "${TARGET}:Gerenciador de Demandas/"

echo "→ Build + restart na VM..."
ssh "$TARGET" "cd ~/Gerenciador\ de\ Demandas && npm install && npm run build && sudo systemctl restart gerenciador-demandas && sudo systemctl is-active gerenciador-demandas"

echo ""
echo "Deploy ok. Dados permanecem em ~/.local/share/gerenciador-demandas/"
echo "Acesse: http://IP-DA-VM:3030"
