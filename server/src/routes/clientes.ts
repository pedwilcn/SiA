import { Router } from 'express';
import { db } from '../db.js';
import { decryptText, encryptText } from '../crypto.js';
import { getDek, requireUnlocked } from '../session.js';

export const clientesRouter = Router();
clientesRouter.use(requireUnlocked);

interface ClienteDbRow {
  id: number;
  nome: string;
  tel_res: string | null;
  tel_cel: string | null;
  email: string | null;
  indicacao: string | null;
  local_atendimento: string | null;
  floral_recomendado: string | null;
  data_pedido_floral: string | null;
  data_entrega_floral: string | null;
}

function decryptCliente(row: ClienteDbRow, dek: Buffer) {
  return {
    id: row.id,
    nome: decryptText(row.nome, dek),
    telRes: decryptText(row.tel_res, dek),
    telCel: decryptText(row.tel_cel, dek),
    email: decryptText(row.email, dek),
    indicacao: decryptText(row.indicacao, dek),
    localAtendimento: decryptText(row.local_atendimento, dek),
    floralRecomendado: row.floral_recomendado ?? '',
    dataPedidoFloral: row.data_pedido_floral ?? '',
    dataEntregaFloral: row.data_entrega_floral ?? '',
  };
}

clientesRouter.get('/', (req, res) => {
  const dek = getDek()!;
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const rows = db.prepare('SELECT * FROM clientes').all() as unknown as ClienteDbRow[];
  const list = rows
    .map((r) => decryptCliente(r, dek))
    .filter((c) => !q || c.nome.toLowerCase().includes(q) || c.telCel.includes(q) || c.telRes.includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(list);
});

clientesRouter.post('/', (req, res) => {
  const dek = getDek()!;
  const b = req.body ?? {};
  const nome = String(b.nome ?? '').trim();
  if (!nome) {
    res.status(400).json({ error: 'Nome é obrigatório.' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO clientes (nome, tel_res, tel_cel, email, indicacao, local_atendimento, floral_recomendado, data_pedido_floral, data_entrega_floral)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      encryptText(nome, dek),
      encryptText(b.telRes, dek),
      encryptText(b.telCel, dek),
      encryptText(b.email, dek),
      encryptText(b.indicacao, dek),
      encryptText(b.localAtendimento, dek),
      b.floralRecomendado ?? '',
      b.dataPedidoFloral ?? '',
      b.dataEntregaFloral ?? ''
    );
  const created = db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid) as unknown as ClienteDbRow;
  res.status(201).json(decryptCliente(created, dek));
});

clientesRouter.put('/:id', (req, res) => {
  const dek = getDek()!;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const nome = String(b.nome ?? '').trim();
  if (!nome) {
    res.status(400).json({ error: 'Nome é obrigatório.' });
    return;
  }
  db.prepare(
    `UPDATE clientes
     SET nome = ?, tel_res = ?, tel_cel = ?, email = ?, indicacao = ?, local_atendimento = ?,
         floral_recomendado = ?, data_pedido_floral = ?, data_entrega_floral = ?
     WHERE id = ?`
  ).run(
    encryptText(nome, dek),
    encryptText(b.telRes, dek),
    encryptText(b.telCel, dek),
    encryptText(b.email, dek),
    encryptText(b.indicacao, dek),
    encryptText(b.localAtendimento, dek),
    b.floralRecomendado ?? '',
    b.dataPedidoFloral ?? '',
    b.dataEntregaFloral ?? '',
    id
  );
  const updated = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id) as unknown as ClienteDbRow | undefined;
  if (!updated) {
    res.status(404).json({ error: 'Paciente não encontrado.' });
    return;
  }
  res.json(decryptCliente(updated, dek));
});

clientesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clientes WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
