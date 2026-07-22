import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

const STATUSES = ['novo', 'aprovado', 'em_andamento', 'em_testes', 'finalizado'];

function rowToDemanda(row) {
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

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM demandas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Demanda não encontrada' });
  res.json(rowToDemanda(row));
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
