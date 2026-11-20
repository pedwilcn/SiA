import { Router } from 'express';
import { db } from '../db.js';
import { decryptText, encryptText } from '../crypto.js';
import { getDek, requireUnlocked } from '../session.js';

export const agendaRouter = Router();
agendaRouter.use(requireUnlocked);

interface AgendaRow {
  id: number;
  data_consulta: string;
  slot: number;
  hora: string | null;
  paciente: string | null;
  telefone: string | null;
}

agendaRouter.get('/', (req, res) => {
  const dek = getDek()!;
  const date = String(req.query.date ?? '').slice(0, 10);
  if (!date) {
    // Return list of dates that have appointments
    const dates = db
      .prepare('SELECT DISTINCT data_consulta FROM agenda ORDER BY data_consulta DESC')
      .all() as Array<{ data_consulta: string }>;
    res.json(dates.map((d) => d.data_consulta));
    return;
  }

  const rows = db
    .prepare('SELECT * FROM agenda WHERE data_consulta = ? ORDER BY slot ASC')
    .all(date) as unknown as AgendaRow[];

  const bySlot = new Map<number, { id?: number; slot: number; hora: string; paciente: string; telefone: string }>();
  for (const r of rows) {
    bySlot.set(r.slot, {
      id: r.id,
      slot: r.slot,
      hora: r.hora ?? '',
      paciente: decryptText(r.paciente, dek),
      telefone: decryptText(r.telefone, dek),
    });
  }

  const slots = Array.from({ length: 10 }, (_, idx) => {
    const slot = idx + 1;
    return bySlot.get(slot) ?? { slot, hora: '', paciente: '', telefone: '' };
  });
  res.json(slots);
});

agendaRouter.put('/', (req, res) => {
  const dek = getDek()!;
  const dataConsulta = String(req.body?.dataConsulta ?? '').slice(0, 10);
  const slot = Number(req.body?.slot);
  const hora = String(req.body?.hora ?? '').trim();
  const paciente = String(req.body?.paciente ?? '').trim();
  const telefone = String(req.body?.telefone ?? '').trim();

  if (!dataConsulta || !Number.isInteger(slot) || slot < 1 || slot > 10) {
    res.status(400).json({ error: 'Data ou horário inválido.' });
    return;
  }

  if (!hora && !paciente && !telefone) {
    db.prepare('DELETE FROM agenda WHERE data_consulta = ? AND slot = ?').run(dataConsulta, slot);
    res.json({ ok: true });
    return;
  }

  db.prepare(
    `INSERT INTO agenda (data_consulta, slot, hora, paciente, telefone)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(data_consulta, slot) DO UPDATE SET
       hora = excluded.hora,
       paciente = excluded.paciente,
       telefone = excluded.telefone`
  ).run(dataConsulta, slot, hora, encryptText(paciente, dek), encryptText(telefone, dek));

  res.json({ ok: true });
});
