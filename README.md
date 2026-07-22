# Gerenciador de Demandas

Kanban local para gerenciar demandas — sem login, dados em SQLite, pronto para VM (VMware Workstation).

## Requisitos

- **Node.js 22.5+** (usa SQLite nativo do Node)
- npm

## Instalação

```bash
npm install
npm run build
npm start
```

Acesse: [http://localhost:3030](http://localhost:3030)

### Desenvolvimento

```bash
npm run dev
```

- Frontend: `http://localhost:5173` (proxy `/api` → `3030`)
- Backend: `http://localhost:3030`

## Funcionalidades

- Criar / editar / excluir demandas
- Editor rico (negrito, itálico, títulos, listas, alinhamento)
- Kanban: **Novo → Aprovado → Em andamento → Em testes → Finalizado**
- Arrastar cards entre colunas
- Horas trabalhadas e data
- Filtros discretos (botão no topo)
- Menu lateral + layout responsivo
- Tema preto / azul / branco

## Dados (importante)

O banco **não some** só de reiniciar a VM.

Em produção o SQLite fica em:

```text
~/.local/share/gerenciador-demandas/demandas.db
```

Assim um `scp` da pasta do projeto **não apaga** suas demandas.

Backup:

```bash
cp ~/.local/share/gerenciador-demandas/demandas.db ~/backup-demandas-$(date +%F).db
```

### Enviar alterações com Git (recomendado)

O banco **não** vai no Git. Deploy = `git pull` + build + restart.

#### 1) No PC (Windows) — uma vez

```powershell
cd "C:\Users\muril\OneDrive\Documentos\Projetos MuriloDEV\Gerenciador de Demandas"
git init
git add .
git commit -m "Initial commit: gerenciador de demandas"
```

Crie um repositório no GitHub (privado) e:

```powershell
git remote add origin https://github.com/SEU-USUARIO/gerenciador-demandas.git
git branch -M main
git push -u origin main
```

#### 2) Na VM — uma vez (clone)

```bash
cd ~
# se a pasta antiga for só cópia sem git, renomeie ou apague (NÃO apague ~/.local/share/gerenciador-demandas)
mv "Gerenciador de Demandas" "Gerenciador de Demandas.bak" 2>/dev/null || true

git clone https://github.com/SEU-USUARIO/gerenciador-demandas.git "Gerenciador de Demandas"
cd ~/Gerenciador\ de\ Demandas
npm install
npm run build
sudo bash scripts/install-service.sh
```

#### 3) Depois, a cada alteração

**No Windows:**

```powershell
git add .
git commit -m "Descreva a mudança"
git push
```

**Na VM:**

```bash
cd ~/Gerenciador\ de\ Demandas
bash scripts/update-from-git.sh
```

Isso faz `git pull` → `npm install` → `npm run build` → `systemctl restart` **sem apagar demandas**.

## Deploy na VMware Workstation Pro (Linux)

Sua VM Linux **não** usa o script `.ps1` (isso é Windows). Use os passos abaixo.

### 1) Rede da VM (VMware no Windows)

1. Desligue a VM (ou edite com ela ligada se permitido)
2. **VM → Settings → Network Adapter**
3. Marque **Bridged** (recomendado) — a VM ganha IP na mesma rede do PC
4. Ligue a VM

### 2) Copiar o projeto para a VM

No **Windows** (PowerShell), exemplo com `scp` (ajuste o IP):

```powershell
scp -r "C:\Users\muril\OneDrive\Documentos\Projetos MuriloDEV\Gerenciador de Demandas" murilodev@IP-DA-VM:~/
```

Ou copie a pasta por pasta compartilhada / WinSCP / pendrive.

### 3) Na VM (SSH ou terminal)

```bash
# Node 22+ (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

cd ~/Gerenciador\ de\ Demandas   # ou o nome da pasta que você copiou
npm install
npm run build

# Teste rápido
npm start
# Abra no navegador do Windows: http://IP-DA-VM:3030
# Ctrl+C para parar o teste
```

Descobrir o IP da VM:

```bash
hostname -I
```

### 4) Ligar automaticamente no boot

```bash
cd ~/Gerenciador\ de\ Demandas
sudo bash scripts/install-service.sh
```

Firewall (se precisar):

```bash
sudo ufw allow 3030/tcp
sudo ufw reload
```

### 5) Acessar no Google Chrome

No PC Windows (ou celular na mesma Wi‑Fi):

```
http://IP-DA-VM:3030
```

Exemplo: `http://192.168.1.50:3030`

**Não use** `./scripts\install-autostart.ps1` no Linux.

### Start automático — Windows guest (se a VM for Windows)

Abra PowerShell **como Administrador**:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-autostart.ps1
```

Depois disso, ao ligar a VM o serviço sobe sozinho. Acesse `http://IP-DA-VM:3030` do host ou do celular na mesma rede.

### Start manual

- Linux: `bash scripts/start.sh`
- Windows: `powershell -File scripts\start.ps1`
- Qualquer SO: `npm start`

Porta padrão: `3030` (altere com `PORT=3030`).

## Scripts npm

| Comando | Uso |
|---------|-----|
| `npm run dev` | Dev (API + Vite) |
| `npm run build` | Build do frontend |
| `npm start` | Produção (Express serve API + `client/dist`) |
