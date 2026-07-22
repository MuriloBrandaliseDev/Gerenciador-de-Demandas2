# Deploy seguro para a VM (PowerShell)
# Uso:
#   .\scripts\deploy-to-vm.ps1 -Target murilodev@192.168.65.128
param(
  [Parameter(Mandatory = $true)]
  [string]$Target
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Remote = "Gerenciador de Demandas"

Write-Host "→ Enviando arquivos (sem data/*.db e sem node_modules)..."

# Lista o que enviar (evita apagar o banco na VM)
$exclude = @(
  "node_modules",
  "client\node_modules",
  "data\*.db",
  "data\*.db-*",
  ".git"
)

# scp pasta a pasta (mais simples no Windows sem rsync)
scp -r `
  "$Root\server" `
  "$Root\client\src" `
  "$Root\client\public" `
  "$Root\client\index.html" `
  "$Root\client\package.json" `
  "$Root\client\package-lock.json" `
  "$Root\client\vite.config.ts" `
  "$Root\client\tsconfig.json" `
  "$Root\client\tsconfig.app.json" `
  "$Root\client\tsconfig.node.json" `
  "$Root\scripts" `
  "$Root\package.json" `
  "$Root\package-lock.json" `
  "${Target}:${Remote}/"

# client configs extras se existirem
foreach ($f in @("eslint.config.js", "oxlintrc.json")) {
  $p = Join-Path "$Root\client" $f
  if (Test-Path $p) {
    scp $p "${Target}:${Remote}/client/"
  }
}

Write-Host "→ Build + restart na VM..."
ssh $Target "cd ~/Gerenciador\ de\ Demandas && npm install && npm run build && sudo systemctl restart gerenciador-demandas && sudo systemctl is-active gerenciador-demandas"

Write-Host ""
Write-Host "Deploy ok. Banco fica em ~/.local/share/gerenciador-demandas/ (nao sobrescreve no deploy)."
Write-Host "Acesse: http://IP-DA-VM:3030"
