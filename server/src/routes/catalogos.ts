import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db, ROOT_DIR } from '../db.js';
import { requireUnlocked } from '../session.js';

export const catalogosRouter = Router();
catalogosRouter.use(requireUnlocked);

interface TableSpec {
  table: string;
  orderBy: string;
  columns: string[];
}

const TABLES: Record<string, TableSpec> = {
  pontos_sistemicos: {
    table: 'pontos_sistemicos',
    orderBy: 'codigo ASC',
    columns: ['codigo', 'energia', 'beneficia', 'doencas', 'localizacao', 'polaridade', 'coordenada_coluna', 'coordenada_linha', 'imagem_path', 'koryo', 'auricular', 'ynsa', 'extras_json'],
  },
  pontos_auriculares: {
    table: 'pontos_auriculares',
    orderBy: 'nome ASC',
    columns: ['nome', 'doencas', 'pt_sist1', 'pt_sist2', 'freq_nogier', 'coordenada_coluna', 'coordenada_linha', 'imagem_path'],
  },
  pontos_cranio: {
    table: 'pontos_cranio',
    orderBy: 'nome ASC',
    columns: ['nome', 'doencas', 'observacao', 'extra', 'coordenada_coluna', 'coordenada_linha', 'imagem_path'],
  },
  pontos_koryo: {
    table: 'pontos_koryo',
    orderBy: 'codigo ASC',
    columns: ['codigo', 'imagem_path', 'coluna1', 'linha1', 'coluna2', 'linha2'],
  },
  ventosas: {
    table: 'ventosas',
    orderBy: 'figura ASC',
    columns: ['figura', 'doencas', 'sistema_padrao', 'tempo_tto', 'qtde_pressao', 'ordem', 'observacao', 'imagem_path'],
  },
  alimentos: {
    table: 'alimentos',
    orderBy: 'nome ASC',
    columns: ['nome', 'temperatura_energetica', 'sabor', 'movimento_energetico', 'meridianos', 'doencas', 'acao_energetica', 'posologia', 'contras', 'estacao'],
  },
  florais: {
    table: 'florais',
    orderBy: 'nome ASC',
    columns: ['nome', 'doencas'],
  },
  protocolos: {
    table: 'protocolos',
    orderBy: 'nome ASC',
    columns: ['nome', 'pontos_json', 'sintomas_chave', 'imagem_path'],
  },
  estetica: {
    table: 'estetica',
    orderBy: 'nome ASC',
    columns: ['nome', 'pontos_json', 'imagem_path'],
  },
  iridologia_queixas: {
    table: 'iridologia_queixas',
    orderBy: 'codigo ASC',
    columns: ['codigo', 'titulo', 'positivo', 'negativo'],
  },
  iridologia_jensen: {
    table: 'iridologia_jensen',
    orderBy: 'area ASC',
    columns: ['area', 'equilibrio', 'desequilibrio', 'recomendacoes'],
  },
  iridologia_padroes: {
    table: 'iridologia_padroes',
    orderBy: 'nome ASC',
    columns: ['nome', 'descricao', 'imagem_path'],
  },
};

catalogosRouter.get('/media/audio', (_req, res) => {
  const audioDir = path.join(ROOT_DIR, 'Audio');
  if (!fs.existsSync(audioDir)) {
    res.json([]);
    return;
  }
  const files = fs
    .readdirSync(audioDir)
    .filter((f) => f.toLowerCase().endsWith('.mp3'))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((name) => ({ name, url: `/media/audio/${encodeURIComponent(name)}` }));
  res.json(files);
});

catalogosRouter.get('/media/imagens', (req, res) => {
  const folder = String(req.query.folder ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  const baseDir = path.join(ROOT_DIR, 'Imagens');
  const targetDir = folder ? path.join(baseDir, folder) : baseDir;
  if (!fs.existsSync(targetDir)) {
    res.json([]);
    return;
  }
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const files: Array<{ name: string; url: string }> = [];
  for (const e of entries) {
    if (e.isFile() && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(e.name)) {
      const rel = folder ? `${folder}/${e.name}` : e.name;
      files.push({ name: e.name, url: `/media/imagens/${rel.split('/').map(encodeURIComponent).join('/')}` });
    }
  }
  res.json(files.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
});

catalogosRouter.get('/:tipo', (req, res) => {
  const spec = TABLES[req.params.tipo];
  if (!spec) {
    res.status(404).json({ error: 'Catálogo desconhecido.' });
    return;
  }
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const rows = db.prepare(`SELECT * FROM ${spec.table} ORDER BY ${spec.orderBy}`).all() as Array<Record<string, unknown>>;
  if (!q) {
    res.json(rows);
    return;
  }
  const filtered = rows.filter((row) =>
    Object.values(row).some((val) => val !== null && String(val).toLowerCase().includes(q))
  );
  res.json(filtered);
});

catalogosRouter.post('/:tipo', (req, res) => {
  const spec = TABLES[req.params.tipo];
  if (!spec) {
    res.status(404).json({ error: 'Catálogo desconhecido.' });
    return;
  }
  const body = req.body ?? {};
  const cols = spec.columns;
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => body[c] ?? null) as Array<string | number | null>;
  const info = db.prepare(`INSERT INTO ${spec.table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
  const created = db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json(created);
});

catalogosRouter.put('/:tipo/:id', (req, res) => {
  const spec = TABLES[req.params.tipo];
  if (!spec) {
    res.status(404).json({ error: 'Catálogo desconhecido.' });
    return;
  }
  const id = Number(req.params.id);
  const body = req.body ?? {};
  const cols = spec.columns;
  const sets = cols.map((c) => `${c} = ?`).join(', ');
  const values = [...cols.map((c) => body[c] ?? null), id] as Array<string | number | null>;
  db.prepare(`UPDATE ${spec.table} SET ${sets} WHERE id = ?`).run(...values);
  const updated = db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id);
  if (!updated) {
    res.status(404).json({ error: 'Registro não encontrado.' });
    return;
  }
  res.json(updated);
});

catalogosRouter.delete('/:tipo/:id', (req, res) => {
  const spec = TABLES[req.params.tipo];
  if (!spec) {
    res.status(404).json({ error: 'Catálogo desconhecido.' });
    return;
  }
  db.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});
