import { Router } from 'express';
import { db } from '../db.js';
import {
  deriveKey,
  decryptBuffer,
  encryptBuffer,
  encryptText,
  generateDek,
  generateSalt,
  hashVerifier,
  verifyPin,
} from '../crypto.js';
import { getDek, requireUnlocked, setDek } from '../session.js';

export const authRouter = Router();

interface AuthRow {
  salt: string;
  verifier_hash: string;
  wrapped_dek: string;
  wrap_iv: string;
  wrap_tag: string;
}

authRouter.get('/status', (_req, res) => {
  const row = db.prepare('SELECT id FROM auth_config WHERE id = 1').get();
  res.json({
    configured: Boolean(row),
    unlocked: Boolean(getDek()),
  });
});

authRouter.post('/setup', (req, res) => {
  const existing = db.prepare('SELECT id FROM auth_config WHERE id = 1').get();
  if (existing) {
    res.status(400).json({ error: 'PIN já configurado. Use a tela de login.' });
    return;
  }

  const pin = String(req.body?.pin ?? '').trim();
  if (pin.length < 4) {
    res.status(400).json({ error: 'O PIN deve ter pelo menos 4 caracteres.' });
    return;
  }

  const salt = generateSalt();
  const verifierHash = hashVerifier(pin, salt);
  const kek = deriveKey(pin, salt);
  const dek = generateDek();
  const wrapped = encryptBuffer(dek, kek);
  kek.fill(0);

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(
      `INSERT INTO auth_config (id, salt, verifier_hash, wrapped_dek, wrap_iv, wrap_tag, encrypted_at)
       VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(salt, verifierHash, wrapped.cipherHex, wrapped.ivHex, wrapped.tagHex);

    // Encrypt all existing LGPD-sensitive records in place
    const clientes = db.prepare('SELECT id, nome, tel_res, tel_cel, email, indicacao, local_atendimento FROM clientes').all() as Array<Record<string, string | null>>;
    const updCliente = db.prepare(
      'UPDATE clientes SET nome = ?, tel_res = ?, tel_cel = ?, email = ?, indicacao = ?, local_atendimento = ? WHERE id = ?'
    );
    for (const c of clientes) {
      updCliente.run(
        encryptText(c.nome, dek) ?? '',
        encryptText(c.tel_res, dek),
        encryptText(c.tel_cel, dek),
        encryptText(c.email, dek),
        encryptText(c.indicacao, dek),
        encryptText(c.local_atendimento, dek),
        c.id
      );
    }

    const agenda = db.prepare('SELECT id, paciente, telefone FROM agenda').all() as Array<Record<string, string | null>>;
    const updAgenda = db.prepare('UPDATE agenda SET paciente = ?, telefone = ? WHERE id = ?');
    for (const a of agenda) {
      updAgenda.run(encryptText(a.paciente, dek), encryptText(a.telefone, dek), a.id);
    }

    const historico = db.prepare('SELECT id, paciente, payload_json FROM historico').all() as Array<Record<string, string | null>>;
    const updHist = db.prepare('UPDATE historico SET paciente = ?, payload_json = ? WHERE id = ?');
    for (const h of historico) {
      updHist.run(encryptText(h.paciente, dek) ?? '', encryptText(h.payload_json, dek) ?? '', h.id);
    }

    db.exec('COMMIT;');
    setDek(dek);
    res.json({ ok: true, encryptedClientes: clientes.length, encryptedAgenda: agenda.length, encryptedHistorico: historico.length });
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
});

authRouter.post('/login', (req, res) => {
  const row = db.prepare('SELECT salt, verifier_hash, wrapped_dek, wrap_iv, wrap_tag FROM auth_config WHERE id = 1').get() as AuthRow | undefined;
  if (!row) {
    res.status(400).json({ error: 'PIN ainda não configurado.' });
    return;
  }

  const pin = String(req.body?.pin ?? '').trim();
  if (!verifyPin(pin, row.salt, row.verifier_hash)) {
    res.status(401).json({ error: 'PIN incorreto.' });
    return;
  }

  const kek = deriveKey(pin, row.salt);
  const dek = decryptBuffer(row.wrapped_dek, row.wrap_iv, row.wrap_tag, kek);
  kek.fill(0);
  setDek(dek);
  res.json({ ok: true });
});

authRouter.post('/lock', (_req, res) => {
  setDek(null);
  res.json({ ok: true });
});

authRouter.post('/change-pin', requireUnlocked, (req, res) => {
  const row = db.prepare('SELECT salt, verifier_hash FROM auth_config WHERE id = 1').get() as AuthRow | undefined;
  if (!row) {
    res.status(400).json({ error: 'Configuração não encontrada.' });
    return;
  }
  const currentPin = String(req.body?.currentPin ?? '').trim();
  const newPin = String(req.body?.newPin ?? '').trim();
  if (!verifyPin(currentPin, row.salt, row.verifier_hash)) {
    res.status(401).json({ error: 'PIN atual incorreto.' });
    return;
  }
  if (newPin.length < 4) {
    res.status(400).json({ error: 'O novo PIN deve ter pelo menos 4 caracteres.' });
    return;
  }
  const dek = getDek()!;
  const newSalt = generateSalt();
  const newVerifier = hashVerifier(newPin, newSalt);
  const newKek = deriveKey(newPin, newSalt);
  const wrapped = encryptBuffer(dek, newKek);
  newKek.fill(0);

  db.prepare(
    'UPDATE auth_config SET salt = ?, verifier_hash = ?, wrapped_dek = ?, wrap_iv = ?, wrap_tag = ? WHERE id = 1'
  ).run(newSalt, newVerifier, wrapped.cipherHex, wrapped.ivHex, wrapped.tagHex);

  res.json({ ok: true });
});
