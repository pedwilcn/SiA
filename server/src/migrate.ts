import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema, normalizeLegacyImagePath } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.resolve(__dirname, '..', '..', 'scripts', 'exported_json');

function readJson<T = Record<string, unknown>>(filename: string): T[] {
  const full = path.join(JSON_DIR, filename);
  const raw = fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function runMigration() {
  initSchema();

  db.exec('BEGIN TRANSACTION;');
  try {
    // Clear catalog & legacy tables before re-importing
    const tables = [
      'agenda', 'clientes', 'historico',
      'pontos_sistemicos', 'pontos_auriculares', 'pontos_cranio', 'pontos_koryo',
      'ventosas', 'alimentos', 'florais', 'protocolos', 'estetica',
      'iridologia_queixas', 'iridologia_jensen', 'iridologia_padroes',
    ];
    for (const t of tables) {
      db.exec(`DELETE FROM ${t};`);
    }

    // 1. Agenda (tbagenda -> normalized slots 1..10)
    const agendaRows = readJson('agenda_tbagenda.json');
    const insAgenda = db.prepare(
      'INSERT INTO agenda (data_consulta, slot, hora, paciente, telefone) VALUES (?, ?, ?, ?, ?)'
    );
    let agendaSlots = 0;
    for (const r of agendaRows) {
      const dateStr = str(r['DataConsulta']).slice(0, 10);
      if (!dateStr) continue;
      for (let i = 1; i <= 10; i++) {
        const hora = str(r[`Hora${i}`]);
        const pac = str(r[`Paciente${i}`]);
        const tel = str(r[`Telefone${i}`]);
        if (hora || pac || tel) {
          insAgenda.run(dateStr, i, hora, pac, tel);
          agendaSlots++;
        }
      }
    }

    // 2. Clientes (tbClientes)
    const clientes = readJson('mtc_tbClientes.json');
    const insCliente = db.prepare(
      'INSERT INTO clientes (nome, tel_res, tel_cel, email, indicacao) VALUES (?, ?, ?, ?, ?)'
    );
    for (const r of clientes) {
      const nome = str(r['Text01']);
      if (!nome) continue;
      insCliente.run(nome, str(r['Text02']), str(r['Text03']), str(r['Text04']), '');
    }

    // 3. Historico (tbHistorico)
    const historicos = readJson('mtc_tbHistorico.json');
    const insHist = db.prepare(
      'INSERT INTO historico (paciente, data_hora, payload_json) VALUES (?, ?, ?)'
    );
    for (const r of historicos) {
      const paciente = str(r['Paciente']);
      const dataHora = str(r['Data_Hora']);
      const payload = {
        queixas: str(r['Queixas']),
        iridologia: str(r['Iridologia']),
        irisDir: normalizeLegacyImagePath(str(r['Iris_Dir'])),
        irisEsq: normalizeLegacyImagePath(str(r['Iris_Esq'])),
        tratamento: str(r['Tratamento']),
        lingua: str(r['Língua']),
        residuos: str(r['Resíduos']),
        procedimentos: str(r['Procedimentos']),
        audioPath: normalizeLegacyImagePath(str(r['Path'])),
        pontosSistemicos: Array.from({ length: 20 }, (_, i) => str(r[`PontoSistêmico${String(i + 1).padStart(2, '0')}`])).filter(Boolean),
        pontosAuriculares: Array.from({ length: 16 }, (_, i) => str(r[`PontoAuricular${String(i + 1).padStart(2, '0')}`])).filter(Boolean),
        pontosVentosa: Array.from({ length: 5 }, (_, i) => str(r[`PontoVentosa${String(i).padStart(2, '0')}`])).filter(Boolean),
        pontosKoryo: Array.from({ length: 20 }, (_, i) => str(r[`PontoKoryo${String(i + 1).padStart(2, '0')}`])).filter(Boolean),
        pontosCranio: Array.from({ length: 16 }, (_, i) => str(r[`PontoCranio${String(i + 1).padStart(2, '0')}`])).filter(Boolean),
        pontosRyo: Array.from({ length: 20 }, (_, i) => str(r[`PontoRyo${String(i + 1).padStart(2, '0')}`])).filter(Boolean),
        ryoEsquerda: Array.from({ length: 12 }, (_, i) => num(r[`Ryo${String(i + 1).padStart(2, '0')}e`]) ?? 0),
        ryoDireita: Array.from({ length: 12 }, (_, i) => num(r[`Ryo${String(i + 1).padStart(2, '0')}d`]) ?? 0),
        extras: Object.fromEntries(
          Object.entries(r).filter(([k, v]) => k.startsWith('Hist') && v !== null && v !== '')
        ),
      };
      insHist.run(paciente || 'Sem Nome', dataHora, JSON.stringify(payload));
    }

    // 4. Pontos Sistêmicos (tbPontos)
    const pontos = readJson('mtc_tbPontos.json');
    const insPonto = db.prepare(`
      INSERT INTO pontos_sistemicos
      (codigo, energia, beneficia, doencas, localizacao, polaridade, coordenada_coluna, coordenada_linha, imagem_path, koryo, auricular, ynsa, extras_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of pontos) {
      insPonto.run(
        str(r['Text01']),
        str(r['Energia']),
        str(r['Beneficia']),
        str(r['Doenças']),
        str(r['Text05']),
        str(r['Text10']),
        num(r['CoordenadaColuna']),
        num(r['CoordenadaLinha']),
        normalizeLegacyImagePath(str(r['Path'])),
        str(r['Koryo']),
        str(r['Auricular']),
        str(r['YNSA']),
        JSON.stringify({
          text06: str(r['Text06']),
          text08: str(r['Text08']),
          text09: str(r['Text09']),
          text11: str(r['Text11']),
          text12: str(r['Text12']),
          text13: str(r['Text13']),
          text14: str(r['Text14']),
          text15: str(r['Text15']),
        })
      );
    }

    // 5. Pontos Auriculares (tbAuriculo)
    const aur = readJson('mtc_tbAuriculo.json');
    const insAur = db.prepare(`
      INSERT INTO pontos_auriculares (nome, doencas, pt_sist1, pt_sist2, freq_nogier, coordenada_coluna, coordenada_linha, imagem_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of aur) {
      insAur.run(
        str(r['PontoAuricular']),
        str(r['Doenças']),
        str(r['Pt_Sist1']),
        str(r['Pt_Sist2']),
        str(r['Freq_Nogier']),
        num(r['CoordenadaColuna']),
        num(r['CoordenadaLinha']),
        normalizeLegacyImagePath(str(r['Path']))
      );
    }

    // 6. Pontos Crânio / YNSA (tbCranio)
    const cranio = readJson('mtc_tbCranio.json');
    const insCranio = db.prepare(`
      INSERT INTO pontos_cranio (nome, doencas, observacao, extra, coordenada_coluna, coordenada_linha, imagem_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of cranio) {
      insCranio.run(
        str(r['Text01']),
        str(r['Doenças']),
        str(r['Text03']),
        str(r['Text04']),
        num(r['CoordenadaColuna']),
        num(r['CoordenadaLinha']),
        normalizeLegacyImagePath(str(r['Imagem']))
      );
    }

    // 7. Pontos Koryo (tbKoryo)
    const koryo = readJson('mtc_tbKoryo.json');
    const insKoryo = db.prepare(`
      INSERT INTO pontos_koryo (codigo, imagem_path, coluna1, linha1, coluna2, linha2)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of koryo) {
      insKoryo.run(
        str(r['PontoKoryo']),
        normalizeLegacyImagePath(str(r['Path'])),
        num(r['CoordenadaColuna1']),
        num(r['CoordenadaLinha1']),
        num(r['CoordenadaColuna2']),
        num(r['CoordenadaLinha2'])
      );
    }

    // 8. Ventosas (tbVentosa)
    const ventosas = readJson('mtc_tbVentosa.json');
    const insVentosa = db.prepare(`
      INSERT INTO ventosas (figura, doencas, sistema_padrao, tempo_tto, qtde_pressao, ordem, observacao, imagem_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of ventosas) {
      insVentosa.run(
        str(r['Figura']),
        str(r['Doenças']),
        str(r['Sistema_Padrão']),
        str(r['Tempo_Tto']),
        str(r['Qtde_Pressão']),
        str(r['Ordem']),
        str(r['Observação']),
        normalizeLegacyImagePath(str(r['PathImagem']))
      );
    }

    // 9. Alimentos (tbAlimentos)
    const alimentos = readJson('mtc_tbAlimentos.json');
    const insAlim = db.prepare(`
      INSERT INTO alimentos (nome, temperatura_energetica, sabor, movimento_energetico, meridianos, doencas, acao_energetica, posologia, contras, estacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of alimentos) {
      insAlim.run(
        str(r['Alimentos']),
        str(r['Temperatura_Energética']),
        str(r['Sabor']),
        str(r['Movimento_Energético']),
        str(r['Meridianos']),
        str(r['Doenças']),
        str(r['Ação_Energética']),
        str(r['Posologia']),
        str(r['Contras']),
        str(r['Estação'])
      );
    }

    // 10. Florais (tbFlorais)
    const florais = readJson('mtc_tbFlorais.json');
    const insFloral = db.prepare('INSERT INTO florais (nome, doencas) VALUES (?, ?)');
    for (const r of florais) {
      insFloral.run(str(r['Text01']), str(r['Doenças']));
    }

    // 11. Protocolos (tbProtocolos)
    const protocolos = readJson('mtc_tbProtocolos.json');
    const insProt = db.prepare(
      'INSERT INTO protocolos (nome, pontos_json, sintomas_chave, imagem_path) VALUES (?, ?, ?, ?)'
    );
    for (const r of protocolos) {
      const pts = Array.from({ length: 20 }, (_, i) => str(r[`ProtSis${String(i + 1).padStart(2, '0')}`])).filter(Boolean);
      insProt.run(
        str(r['Text01']),
        JSON.stringify(pts),
        str(r['ProtSisSintomasChave']),
        normalizeLegacyImagePath(str(r['PathImgProtocolo']))
      );
    }

    // 12. Estética (tbEstetica)
    const estetica = readJson('mtc_tbEstetica.json');
    const insEst = db.prepare('INSERT INTO estetica (nome, pontos_json, imagem_path) VALUES (?, ?, ?)');
    for (const r of estetica) {
      const pts = Array.from({ length: 29 }, (_, i) => str(r[`ProtEst${String(i + 1).padStart(2, '0')}`])).filter(Boolean);
      insEst.run(str(r['ProtEst00']), JSON.stringify(pts), normalizeLegacyImagePath(str(r['PathImagem'])));
    }

    // 13. Iridologia Queixas, Jensen, Padrões
    const iridQ = readJson('mtc_tbIridologia.json');
    const insIridQ = db.prepare('INSERT INTO iridologia_queixas (codigo, titulo, positivo, negativo) VALUES (?, ?, ?, ?)');
    for (const r of iridQ) {
      insIridQ.run(str(r['Text1']), str(r['Text2']), str(r['Text3']), str(r['Text4']));
    }

    const iridJ = readJson('mtc_tbIridologia_Jensen.json');
    const insIridJ = db.prepare('INSERT INTO iridologia_jensen (area, equilibrio, desequilibrio, recomendacoes) VALUES (?, ?, ?, ?)');
    for (const r of iridJ) {
      insIridJ.run(str(r['Text01']), str(r['Text02']), str(r['Text03']), str(r['Text04']));
    }

    const iridP = readJson('mtc_tbIridologia_Padroes.json');
    const insIridP = db.prepare('INSERT INTO iridologia_padroes (nome, descricao, imagem_path) VALUES (?, ?, ?)');
    for (const r of iridP) {
      insIridP.run(str(r['IrisPadrao01']), str(r['IrisPadrao02']), normalizeLegacyImagePath(str(r['IrisPadrao03'])));
    }

    db.exec('COMMIT;');

    console.log('=== Migração SQLite concluída ===');
    console.log({
      agendaDatasOriginal: agendaRows.length,
      agendaHorariosNormalizados: agendaSlots,
      clientes: clientes.length,
      historico: historicos.length,
      pontosSistemicos: pontos.length,
      pontosAuriculares: aur.length,
      pontosCranio: cranio.length,
      pontosKoryo: koryo.length,
      ventosas: ventosas.length,
      alimentos: alimentos.length,
      florais: florais.length,
      protocolos: protocolos.length,
      estetica: estetica.length,
      iridologiaQueixas: iridQ.length,
      iridologiaJensen: iridJ.length,
      iridologiaPadroes: iridP.length,
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

runMigration();
