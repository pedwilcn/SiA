import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
export const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
export const DB_PATH = path.join(DATA_DIR, 'acupuntura.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salt TEXT NOT NULL,
      verifier_hash TEXT NOT NULL,
      wrapped_dek TEXT NOT NULL,
      wrap_iv TEXT NOT NULL,
      wrap_tag TEXT NOT NULL,
      encrypted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tel_res TEXT,
      tel_cel TEXT,
      email TEXT,
      indicacao TEXT,
      local_atendimento TEXT,
      floral_recomendado TEXT,
      data_pedido_floral TEXT,
      data_entrega_floral TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agenda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_consulta TEXT NOT NULL,
      slot INTEGER NOT NULL,
      hora TEXT,
      paciente TEXT,
      telefone TEXT,
      UNIQUE(data_consulta, slot)
    );

    CREATE TABLE IF NOT EXISTS historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente TEXT NOT NULL,
      data_hora TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pontos_sistemicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      energia TEXT,
      beneficia TEXT,
      doencas TEXT,
      localizacao TEXT,
      polaridade TEXT,
      coordenada_coluna REAL,
      coordenada_linha REAL,
      imagem_path TEXT,
      koryo TEXT,
      auricular TEXT,
      ynsa TEXT,
      extras_json TEXT
    );

    CREATE TABLE IF NOT EXISTS pontos_auriculares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      doencas TEXT,
      pt_sist1 TEXT,
      pt_sist2 TEXT,
      freq_nogier TEXT,
      coordenada_coluna REAL,
      coordenada_linha REAL,
      imagem_path TEXT
    );

    CREATE TABLE IF NOT EXISTS pontos_cranio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      doencas TEXT,
      observacao TEXT,
      extra TEXT,
      coordenada_coluna REAL,
      coordenada_linha REAL,
      imagem_path TEXT
    );

    CREATE TABLE IF NOT EXISTS pontos_koryo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      imagem_path TEXT,
      coluna1 REAL,
      linha1 REAL,
      coluna2 REAL,
      linha2 REAL
    );

    CREATE TABLE IF NOT EXISTS ventosas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      figura TEXT,
      doencas TEXT,
      sistema_padrao TEXT,
      tempo_tto TEXT,
      qtde_pressao TEXT,
      ordem TEXT,
      observacao TEXT,
      imagem_path TEXT
    );

    CREATE TABLE IF NOT EXISTS alimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      temperatura_energetica TEXT,
      sabor TEXT,
      movimento_energetico TEXT,
      meridianos TEXT,
      doencas TEXT,
      acao_energetica TEXT,
      posologia TEXT,
      contras TEXT,
      estacao TEXT
    );

    CREATE TABLE IF NOT EXISTS florais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      doencas TEXT
    );

    CREATE TABLE IF NOT EXISTS protocolos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      pontos_json TEXT NOT NULL,
      sintomas_chave TEXT,
      imagem_path TEXT
    );

    CREATE TABLE IF NOT EXISTS estetica (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      pontos_json TEXT NOT NULL,
      imagem_path TEXT
    );

    CREATE TABLE IF NOT EXISTS iridologia_queixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      titulo TEXT,
      positivo TEXT,
      negativo TEXT
    );

    CREATE TABLE IF NOT EXISTS iridologia_jensen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area TEXT,
      equilibrio TEXT,
      desequilibrio TEXT,
      recomendacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS iridologia_padroes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      descricao TEXT,
      imagem_path TEXT
    );
  `);
}

export function normalizeLegacyImagePath(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null;
  const trimmed = String(rawPath).trim();
  if (!trimmed) return null;
  // Convert C:\Acupuntura e Iridologia\Imagens\... -> /media/imagens/...
  const normalized = trimmed.replace(/\\/g, '/');
  const idx = normalized.toLowerCase().indexOf('/imagens/');
  if (idx !== -1) {
    return '/media/imagens/' + normalized.slice(idx + '/imagens/'.length);
  }
  const idxAudio = normalized.toLowerCase().indexOf('/audio/');
  if (idxAudio !== -1) {
    return '/media/audio/' + normalized.slice(idxAudio + '/audio/'.length);
  }
  if (normalized.startsWith('/media/')) return normalized;
  return normalized;
}
