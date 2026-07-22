import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import db, { uploadsDir } from '../db.js';

const router = Router();

const STATUSES = ['novo', 'aprovado', 'em_andamento', 'em_testes', 'finalizado'];

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || mimeToExt(file.mimetype);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Use imagem (JPG, PNG, GIF, WEBP) ou PDF.'));
  },
});

function mimeToExt(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return map[mime] || '';
}

function rowToDemanda(row) {
  const countRow = db
    .prepare('SELECT COUNT(*) AS c FROM anexos WHERE demanda_id = ?')
    .get(row.id);
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status: row.status,
    horasTrabalhadas: row.horas_trabalhadas,
    dataReferencia: row.data_referencia,
    ordem: row.ordem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    anexosCount: Number(countRow?.c || 0),
  };
}

function rowToAnexo(row) {
  return {
    id: row.id,
    demandaId: row.demanda_id,
    nomeOriginal: row.nome_original,
    mimeType: row.mime_type,
    tamanho: row.tamanho,
    createdAt: row.created_at,
    url: `/api/demandas/anexos/${row.id}/arquivo`,
  };
}

function withTransaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function deleteAnexoFiles(demandaId) {
  const rows = db.prepare('SELECT nome_arquivo FROM anexos WHERE demanda_id = ?').all(demandaId);
  for (const row of rows) {
    const full = path.join(uploadsDir, row.nome_arquivo);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
}

router.get('/', (req, res) => {
  const { q, status, dataDe, dataAte, horasMin, horasMax } = req.query;

  let sql = 'SELECT * FROM demandas WHERE 1=1';
  const params = [];

  if (q && String(q).trim()) {
    sql += ' AND (titulo LIKE ? OR descricao LIKE ?)';
    const like = `%${String(q).trim()}%`;
    params.push(like, like);
  }

  if (status && String(status).trim()) {
    const list = String(status)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => STATUSES.includes(s));
    if (list.length) {
      sql += ` AND status IN (${list.map(() => '?').join(',')})`;
      params.push(...list);
    }
  }

  if (dataDe) {
    sql += ' AND data_referencia >= ?';
    params.push(String(dataDe));
  }

  if (dataAte) {
    sql += ' AND data_referencia <= ?';
    params.push(String(dataAte));
  }

  if (horasMin !== undefined && horasMin !== '') {
    sql += ' AND horas_trabalhadas >= ?';
    params.push(Number(horasMin));
  }

  if (horasMax !== undefined && horasMax !== '') {
    sql += ' AND horas_trabalhadas <= ?';
    params.push(Number(horasMax));
  }

  sql += ' ORDER BY status, ordem ASC, created_at ASC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToDemanda));
});

/** Serve arquivo — antes das rotas :id para não conflitar */
router.get('/anexos/:anexoId/arquivo', (req, res) => {
  const row = db.prepare('SELECT * FROM anexos WHERE id = ?').get(req.params.anexoId);
  if (!row) return res.status(404).json({ error: 'Anexo não encontrado' });

  const full = path.join(uploadsDir, row.nome_arquivo);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  res.setHeader('Content-Type', row.mime_type);
  res.setHeader(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(row.nome_original)}`
  );
  res.sendFile(full);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Demanda não encontrada' });
  res.json(rowToDemanda(row));
});

router.get('/:id/anexos', (req, res) => {
  const existing = db.prepare('SELECT id FROM demandas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Demanda não encontrada' });

  const rows = db
    .prepare('SELECT * FROM anexos WHERE demanda_id = ? ORDER BY created_at ASC')
    .all(req.params.id);
  res.json(rows.map(rowToAnexo));
});

router.post('/:id/anexos', (req, res) => {
  const existing = db.prepare('SELECT id FROM demandas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Demanda não encontrada' });

  upload.array('arquivos', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Falha no upload' });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const now = new Date().toISOString();
    const created = [];

    try {
      withTransaction(() => {
        const insert = db.prepare(`
          INSERT INTO anexos (id, demanda_id, nome_original, nome_arquivo, mime_type, tamanho, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const file of files) {
          const id = uuidv4();
          insert.run(
            id,
            req.params.id,
            file.originalname || file.filename,
            file.filename,
            file.mimetype,
            file.size || 0,
            now
          );
          created.push(
            rowToAnexo({
              id,
              demanda_id: req.params.id,
              nome_original: file.originalname || file.filename,
              nome_arquivo: file.filename,
              mime_type: file.mimetype,
              tamanho: file.size || 0,
              created_at: now,
            })
          );
        }
        db.prepare('UPDATE demandas SET updated_at = ? WHERE id = ?').run(now, req.params.id);
      });
    } catch (e) {
      for (const file of files) {
        const full = path.join(uploadsDir, file.filename);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      }
      console.error(e);
      return res.status(500).json({ error: 'Erro ao salvar anexos' });
    }

    res.status(201).json(created);
  });
});

router.delete('/:id/anexos/:anexoId', (req, res) => {
  const row = db
    .prepare('SELECT * FROM anexos WHERE id = ? AND demanda_id = ?')
    .get(req.params.anexoId, req.params.id);
  if (!row) return res.status(404).json({ error: 'Anexo não encontrado' });

  const full = path.join(uploadsDir, row.nome_arquivo);
  db.prepare('DELETE FROM anexos WHERE id = ?').run(row.id);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  db.prepare('UPDATE demandas SET updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    req.params.id
  );

  res.status(204).end();
});

router.post('/', (req, res) => {
  const {
    titulo,
    descricao = '',
    status = 'novo',
    horasTrabalhadas = 0,
    dataReferencia,
  } = req.body || {};

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const finalStatus = STATUSES.includes(status) ? status : 'novo';
  const now = new Date().toISOString();
  const data = dataReferencia || now.slice(0, 10);

  const maxOrdem = db
    .prepare('SELECT COALESCE(MAX(ordem), -1) AS max FROM demandas WHERE status = ?')
    .get(finalStatus).max;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO demandas (id, titulo, descricao, status, horas_trabalhadas, data_referencia, ordem, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(titulo).trim(),
    String(descricao || ''),
    finalStatus,
    Number(horasTrabalhadas) || 0,
    data,
    maxOrdem + 1,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM demandas WHERE id = ?').get(id);
  res.status(201).json(rowToDemanda(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Demanda não encontrada' });

  const {
    titulo = existing.titulo,
    descricao = existing.descricao,
    status = existing.status,
    horasTrabalhadas = existing.horas_trabalhadas,
    dataReferencia = existing.data_referencia,
  } = req.body || {};

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const finalStatus = STATUSES.includes(status) ? status : existing.status;
  const now = new Date().toISOString();

  let ordem = existing.ordem;
  if (finalStatus !== existing.status) {
    const maxOrdem = db
      .prepare('SELECT COALESCE(MAX(ordem), -1) AS max FROM demandas WHERE status = ?')
      .get(finalStatus).max;
    ordem = maxOrdem + 1;
  }

  db.prepare(`
    UPDATE demandas
    SET titulo = ?, descricao = ?, status = ?, horas_trabalhadas = ?, data_referencia = ?, ordem = ?, updated_at = ?
    WHERE id = ?
  `).run(
    String(titulo).trim(),
    String(descricao || ''),
    finalStatus,
    Number(horasTrabalhadas) || 0,
    dataReferencia,
    ordem,
    now,
    req.params.id
  );

  const row = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  res.json(rowToDemanda(row));
});

router.patch('/:id/move', (req, res) => {
  const existing = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Demanda não encontrada' });

  const { status, ordem } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  if (typeof ordem !== 'number' || ordem < 0) {
    return res.status(400).json({ error: 'Ordem inválida' });
  }

  const now = new Date().toISOString();

  try {
    withTransaction(() => {
      const oldStatus = existing.status;
      const oldOrdem = existing.ordem;

      if (oldStatus === status) {
        if (ordem > oldOrdem) {
          db.prepare(`
            UPDATE demandas SET ordem = ordem - 1, updated_at = ?
            WHERE status = ? AND ordem > ? AND ordem <= ? AND id != ?
          `).run(now, status, oldOrdem, ordem, req.params.id);
        } else if (ordem < oldOrdem) {
          db.prepare(`
            UPDATE demandas SET ordem = ordem + 1, updated_at = ?
            WHERE status = ? AND ordem >= ? AND ordem < ? AND id != ?
          `).run(now, status, ordem, oldOrdem, req.params.id);
        }
      } else {
        db.prepare(`
          UPDATE demandas SET ordem = ordem - 1, updated_at = ?
          WHERE status = ? AND ordem > ?
        `).run(now, oldStatus, oldOrdem);

        db.prepare(`
          UPDATE demandas SET ordem = ordem + 1, updated_at = ?
          WHERE status = ? AND ordem >= ?
        `).run(now, status, ordem);
      }

      db.prepare(`
        UPDATE demandas SET status = ?, ordem = ?, updated_at = ? WHERE id = ?
      `).run(status, ordem, now, req.params.id);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao mover demanda' });
  }

  const row = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  res.json(rowToDemanda(row));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Demanda não encontrada' });

  const now = new Date().toISOString();
  try {
    withTransaction(() => {
      deleteAnexoFiles(req.params.id);
      db.prepare('DELETE FROM anexos WHERE demanda_id = ?').run(req.params.id);
      db.prepare('DELETE FROM demandas WHERE id = ?').run(req.params.id);
      db.prepare(`
        UPDATE demandas SET ordem = ordem - 1, updated_at = ?
        WHERE status = ? AND ordem > ?
      `).run(now, existing.status, existing.ordem);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir demanda' });
  }

  res.status(204).end();
});

export default router;
