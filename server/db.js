import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDataDir = path.join(__dirname, '..', 'data');

/** Em produção, dados ficam FORA da pasta do projeto (não sobrescreve no deploy). */
const dataDir =
  process.env.DATA_DIR ||
  (process.env.NODE_ENV === 'production'
    ? path.join(os.homedir(), '.local', 'share', 'gerenciador-demandas')
    : projectDataDir);

const dbPath = path.join(dataDir, 'demandas.db');
const legacyDbPath = path.join(projectDataDir, 'demandas.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Migra banco antigo da pasta do projeto (se existir e o novo ainda não)
if (
  process.env.NODE_ENV === 'production' &&
  !fs.existsSync(dbPath) &&
  fs.existsSync(legacyDbPath)
) {
  fs.copyFileSync(legacyDbPath, dbPath);
  for (const suffix of ['-wal', '-shm']) {
    const src = legacyDbPath + suffix;
    if (fs.existsSync(src)) fs.copyFileSync(src, dbPath + suffix);
  }
  console.log(`Banco migrado de ${legacyDbPath} → ${dbPath}`);
}

console.log(`SQLite: ${dbPath}`);

const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS demandas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'novo',
    horas_trabalhadas REAL NOT NULL DEFAULT 0,
    data_referencia TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_demandas_status ON demandas(status);
  CREATE INDEX IF NOT EXISTS idx_demandas_ordem ON demandas(status, ordem);
`);

export default db;
