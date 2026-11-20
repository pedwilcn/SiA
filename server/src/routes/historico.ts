import { Router } from 'express';
import { db } from '../db.js';
import { decryptText, encryptText } from '../crypto.js';
import { getDek, requireUnlocked } from '../session.js';

export const historicoRouter = Router();
historicoRouter.use(requireUnlocked);

interface HistoricoRow {
  id: number;
  paciente: string;
  data_hora: string;
  payload_json: string;
}

function parseRow(r: HistoricoRow, dek: Buffer) {
  const paciente = decryptText(r.paciente, dek);
  const rawJson = decryptText(r.payload_json, dek);
  let payload: Record<string, unknown> = {};
  try {
    payload = rawJson ? JSON.parse(rawJson) : {};
  } catch {
    payload = {};
  }
  return {
    id: r.id,
    paciente,
    dataHora: r.data_hora,
    ...payload,
  };
}

historicoRouter.get('/', (req, res) => {
  const dek = getDek()!;
  const pacienteFilter = String(req.query.paciente ?? '').trim().toLowerCase();
  const rows = db.prepare('SELECT id, paciente, data_hora, payload_json FROM historico ORDER BY data_hora DESC, id DESC').all() as unknown as HistoricoRow[];
  const list = rows
    .map((r) => parseRow(r, dek))
    .filter((item) => !pacienteFilter || item.paciente.toLowerCase().includes(pacienteFilter));
  res.json(list);
});

historicoRouter.post('/', (req, res) => {
  const dek = getDek()!;
  const { paciente, dataHora, ...rest } = req.body ?? {};
  const nome = String(paciente ?? '').trim();
  const dt = String(dataHora ?? new Date().toISOString().slice(0, 19)).trim();
  if (!nome) {
    res.status(400).json({ error: 'Paciente é obrigatório.' });
    return;
  }
  const info = db
    .prepare('INSERT INTO historico (paciente, data_hora, payload_json) VALUES (?, ?, ?)')
    .run(encryptText(nome, dek), dt, encryptText(JSON.stringify(rest), dek));
  const created = db.prepare('SELECT id, paciente, data_hora, payload_json FROM historico WHERE id = ?').get(info.lastInsertRowid) as unknown as HistoricoRow;
  res.status(201).json(parseRow(created, dek));
});

historicoRouter.put('/:id', (req, res) => {
  const dek = getDek()!;
  const id = Number(req.params.id);
  const { paciente, dataHora, ...rest } = req.body ?? {};
  const nome = String(paciente ?? '').trim();
  const dt = String(dataHora ?? '').trim();
  if (!nome) {
    res.status(400).json({ error: 'Paciente é obrigatório.' });
    return;
  }
  db.prepare('UPDATE historico SET paciente = ?, data_hora = ?, payload_json = ? WHERE id = ?').run(
    encryptText(nome, dek),
    dt,
    encryptText(JSON.stringify(rest), dek),
    id
  );
  const updated = db.prepare('SELECT id, paciente, data_hora, payload_json FROM historico WHERE id = ?').get(id) as unknown as HistoricoRow | undefined;
  if (!updated) {
    res.status(404).json({ error: 'Histórico não encontrado.' });
    return;
  }
  res.json(parseRow(updated, dek));
});

historicoRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM historico WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
