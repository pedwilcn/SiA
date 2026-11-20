import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';
import { ImagePointViewer } from '../components/ImagePointViewer';

type MtcTab =
  | 'sistemicos'
  | 'auriculares'
  | 'ynsa'
  | 'koryo'
  | 'ventosas'
  | 'alimentos'
  | 'ryodoraku'
  | 'estetica';

const MERIDIANOS_RYO = [
  'P (Pulmão)', 'CS (Circ. Sexo)', 'C (Coração)',
  'ID (Int. Delgado)', 'TA (Triplo Aquec.)', 'IG (Int. Grosso)',
  'BP (Baço-Pâncreas)', 'F (Fígado)', 'R (Rim)',
  'B (Bexiga)', 'VB (Vesícula Biliar)', 'E (Estômago)',
];

const ELEMENTOS_MAP = [
  { nome: 'Madeira', meridianos: [7, 10], cor: '#2d6a4f' },
  { nome: 'Fogo', meridianos: [1, 2, 3, 4], cor: '#c92a2a' },
  { nome: 'Terra', meridianos: [6, 11], cor: '#b07d4f' },
  { nome: 'Metal', meridianos: [0, 5], cor: '#6c757d' },
  { nome: 'Água', meridianos: [8, 9], cor: '#1864ab' },
];

export function MtcPage() {
  const [tab, setTab] = useState<MtcTab>('sistemicos');
  const [busca, setBusca] = useState('');

  const [sistemicos, setSistemicos] = useState<Array<Record<string, unknown>>>([]);
  const [protocolos, setProtocolos] = useState<Array<Record<string, unknown>>>([]);
  const [auriculares, setAuriculares] = useState<Array<Record<string, unknown>>>([]);
  const [cranio, setCranio] = useState<Array<Record<string, unknown>>>([]);
  const [koryo, setKoryo] = useState<Array<Record<string, unknown>>>([]);
  const [ventosas, setVentosas] = useState<Array<Record<string, unknown>>>([]);
  const [alimentos, setAlimentos] = useState<Array<Record<string, unknown>>>([]);
  const [estetica, setEstetica] = useState<Array<Record<string, unknown>>>([]);

  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [ryoEsq, setRyoEsq] = useState<number[]>(Array(12).fill(50));
  const [ryoDir, setRyoDir] = useState<number[]>(Array(12).fill(50));

  useEffect(() => {
    const q = encodeURIComponent(busca);
    const load = async () => {
      const [s, p, a, c, k, v, al, e] = await Promise.all([
        api<Array<Record<string, unknown>>>(`/api/catalogos/pontos_sistemicos?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/protocolos?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/pontos_auriculares?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/pontos_cranio?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/pontos_koryo?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/ventosas?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/alimentos?q=${q}`),
        api<Array<Record<string, unknown>>>(`/api/catalogos/estetica?q=${q}`),
      ]);
      setSistemicos(s);
      setProtocolos(p);
      setAuriculares(a);
      setCranio(c);
      setKoryo(k);
      setVentosas(v);
      setAlimentos(al);
      setEstetica(e);
    };
    void load();
  }, [busca]);

  const activeList = (() => {
    switch (tab) {
      case 'sistemicos': return sistemicos;
      case 'auriculares': return auriculares;
      case 'ynsa': return cranio;
      case 'koryo': return koryo;
      case 'ventosas': return ventosas;
      case 'alimentos': return alimentos;
      case 'estetica': return estetica;
      default: return [];
    }
  })();

  const ryoMedia =
    ([...ryoEsq, ...ryoDir].reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0)) / 24;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>MTC & Técnicas Terapêuticas</h2>
        <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="search"
            placeholder="Pesquisar sintoma, doença ou ponto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>
      </div>

      <div className="tabs">
        {([
          ['sistemicos', `Pt. Sistêmicos (${sistemicos.length})`],
          ['auriculares', `Pt. Auriculares (${auriculares.length})`],
          ['ynsa', `Pt. YNSA (${cranio.length})`],
          ['koryo', `Pt. Koryo (${koryo.length})`],
          ['ventosas', `Ventosas (${ventosas.length})`],
          ['alimentos', `Alimentos (${alimentos.length})`],
          ['ryodoraku', 'Ryodoraku (5 Elementos)'],
          ['estetica', `Estética (${estetica.length})`],
        ] as Array<[MtcTab, string]>).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => {
              setTab(id);
              setSelected(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ryodoraku' ? (
        <div className="grid-2">
          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Medições Ryodoraku (Esquerda / Direita)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MERIDIANOS_RYO.map((m, idx) => (
                <div key={m} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span>{m}</span>
                  <input
                    type="number"
                    value={ryoEsq[idx]}
                    onChange={(e) => {
                      const c = [...ryoEsq];
                      c[idx] = Number(e.target.value);
                      setRyoEsq(c);
                    }}
                  />
                  <input
                    type="number"
                    value={ryoDir[idx]}
                    onChange={(e) => {
                      const c = [...ryoDir];
                      c[idx] = Number(e.target.value);
                      setRyoDir(c);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Análise dos 5 Elementos (Média: {ryoMedia.toFixed(1)})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ELEMENTOS_MAP.map((el) => {
                const avg =
                  el.meridianos.reduce((acc, idx) => acc + (ryoEsq[idx] + ryoDir[idx]) / 2, 0) /
                  el.meridianos.length;
                const diff = avg - ryoMedia;
                const status = diff > 7 ? 'Excesso (Yang)' : diff < -7 ? 'Deficiência (Yin)' : 'Equilíbrio';
                return (
                  <div key={el.nome} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: el.cor }}>{el.nome}</span>
                      <span>{avg.toFixed(1)} — {status}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface-alt)', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.max(5, avg))}%`, height: '100%', background: el.cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="list-scroll" style={{ maxHeight: 500 }}>
              {activeList.map((item) => {
                const title = String(
                  item.codigo ?? item.nome ?? item.figura ?? item.id
                );
                const subtitle = String(item.doencas ?? item.beneficia ?? item.sabor ?? '');
                return (
                  <div
                    key={String(item.id)}
                    className={`list-item ${selected?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setSelected(item)}
                  >
                    <div>{title}</div>
                    {subtitle && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subtitle}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {tab === 'sistemicos' && protocolos.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Protocolos Relacionados ({protocolos.length})</h4>
                <div className="list-scroll" style={{ maxHeight: 150 }}>
                  {protocolos.map((pr) => (
                    <div key={String(pr.id)} className="list-item" onClick={() => setSelected(pr)}>
                      <strong>{String(pr.nome)}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{String(pr.sintomas_chave ?? '')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            {selected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0 }}>{String(selected.codigo ?? selected.nome ?? selected.figura ?? '')}</h3>
                {Boolean(selected.imagem_path) && (
                  <ImagePointViewer
                    src={String(selected.imagem_path)}
                    alt="Mapa do ponto"
                    markers={[
                      {
                        x: selected.coordenada_coluna as number | undefined ?? selected.coluna1 as number | undefined,
                        y: selected.coordenada_linha as number | undefined ?? selected.linha1 as number | undefined,
                      },
                      {
                        x: selected.coluna2 as number | undefined,
                        y: selected.linha2 as number | undefined,
                        color: 'rgba(37, 99, 235, 0.85)',
                      },
                    ]}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {Object.entries(selected)
                    .filter(([k, v]) => v !== null && v !== '' && !['id', 'imagem_path', 'extras_json', 'coordenada_coluna', 'coordenada_linha', 'coluna1', 'linha1', 'coluna2', 'linha2'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--surface-alt)', padding: 8, borderRadius: 8 }}>
                        <strong style={{ textTransform: 'capitalize', fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{k.replace(/_/g, ' ')}</strong>
                        <span style={{ whiteSpace: 'pre-wrap' }}>{String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                Selecione um item na lista ao lado para ver detalhes, indicações e mapa anatômico.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
