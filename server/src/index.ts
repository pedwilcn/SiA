import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { DB_PATH, initSchema, ROOT_DIR } from './db.js';
import { authRouter } from './routes/auth.js';
import { clientesRouter } from './routes/clientes.js';
import { agendaRouter } from './routes/agenda.js';
import { historicoRouter } from './routes/historico.js';
import { catalogosRouter } from './routes/catalogos.js';
import { requireUnlocked } from './session.js';

initSchema();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static media serving for legacy Imagens/ and Audio/
app.use('/media/imagens', express.static(path.join(ROOT_DIR, 'Imagens')));
app.use('/media/audio', express.static(path.join(ROOT_DIR, 'Audio')));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/historico', historicoRouter);
app.use('/api/catalogos', catalogosRouter);

app.get('/api/backup/export', requireUnlocked, (_req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    res.status(404).json({ error: 'Banco de dados não encontrado.' });
    return;
  }
  const stamp = new Date().toISOString().slice(0, 10);
  res.download(DB_PATH, `acupuntura-backup-${stamp}.db`);
});

// Serve built frontend in production / Tauri mode
const clientDist = path.resolve(ROOT_DIR, 'modern', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor Acupuntura & Iridologia ativo em http://localhost:${PORT}`);
});
