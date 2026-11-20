import { useEffect, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
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

  // Campos de sessão no topo (como no VB6)
  const [queixas, setQueixas] = useState('');
  const [lingua, setLingua] = useState('');
  const [residuos, setResiduos] = useState('');

  // Filtros rápidos da aba Sistêmicos
  const [filtroYin, setFiltroYin] = useState(true);
  const [filtroYang, setFiltroYang] = useState(true);
  const [apenasProtocolos, setApenasProtocolos] = useState(false);

  const [sistemicos, setSistemicos] = useState<Array<Record<string, unknown>>>([]);
  const [protocolos, setProtocolos] = useState<Array<Record<string, unknown>>>([]);
  const [auriculares, setAuriculares] = useState<Array<Record<string, unknown>>>([]);
  const [cranio, setCranio] = useState<Array<Record<string, unknown>>>([]);
  const [koryo, setKoryo] = useState<Array<Record<string, unknown>>>([]);
  const [ventosas, setVentosas] = useState<Array<Record<string, unknown>>>([]);
  const [alimentos, setAlimentos] = useState<Array<Record<string, unknown>>>([]);
  const [estetica, setEstetica] = useState<Array<Record<string, unknown>>>([]);

  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [escolhidos, setEscolhidos] = useState<Record<string, string[]>>({
    sistemicos: [],
    auriculares: [],
    ynsa: [],
    koryo: [],
    ventosas: [],
    alimentos: [],
    estetica: [],
  });

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

  const filteredSistemicos = sistemicos.filter((item) => {
    const pol = String(item.polaridade ?? '').toLowerCase();
    if (!filtroYin && pol.includes('yin')) return false;
    if (!filtroYang && pol.includes('yang')) return false;
    return true;
  });

  const activeList = (() => {
    switch (tab) {
      case 'sistemicos': return apenasProtocolos ? protocolos : filteredSistemicos;
      case 'auriculares': return auriculares;
      case 'ynsa': return cranio;
      case 'koryo': return koryo;
      case 'ventosas': return ventosas;
      case 'alimentos': return alimentos;
      case 'estetica': return estetica;
      default: return [];
    }
  })();

  const getItemTitle = (item: Record<string, unknown>) =>
    String(item.codigo ?? item.nome ?? item.figura ?? item.id);

  const handleToggleEscolhido = (label: string) => {
    if (tab === 'ryodoraku') return;
    setEscolhidos((prev) => {
      const curr = prev[tab] ?? [];
      if (curr.includes(label)) return prev;
      return { ...prev, [tab]: [...curr, label] };
    });
  };

  const handleResetEscolhidos = () => {
    if (tab === 'ryodoraku') return;
    setEscolhidos((prev) => ({ ...prev, [tab]: [] }));
  };

  const ryoMedia =
    ([...ryoEsq, ...ryoDir].reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0)) / 24;

  const currentPicked = tab !== 'ryodoraku' ? (escolhidos[tab] ?? []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Topo Clínico: Queixas, Língua, Resíduos e Pesquisa (como no VB6) */}
      <div className="card" style={{ padding: 14 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Queixas</label>
          <input value={queixas} onChange={(e) => setQueixas(e.target.value)} placeholder="Descreva as queixas principais do paciente..." />
        </div>
        <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Língua</label>
            <input value={lingua} onChange={(e) => setLingua(e.target.value)} placeholder="Aspecto, saburra, cor..." />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Resíduos e Fluidos</label>
            <input value={residuos} onChange={(e) => setResiduos(e.target.value)} placeholder="Urina, fezes, suor, mucos..." />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <Search size={16} color="var(--primary)" />
          <input
            type="search"
            placeholder="Pesquisa (ex: ansiedade, dor ombro, cefaleia)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: 380,
              maxWidth: '100%',
              textAlign: 'center',
              fontWeight: 700,
              color: '#b42318',
              fontSize: 15,
            }}
          />
        </div>
      </div>

      {/* Abas */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {([
          ['sistemicos', `Pt. Sistêmicos (${filteredSistemicos.length})`],
          ['auriculares', `Pt. Auriculares (${auriculares.length})`],
          ['ynsa', `Pt. YNSA (${cranio.length})`],
          ['koryo', `Pt. Koryo (${koryo.length})`],
          ['ventosas', `Ventosas (${ventosas.length})`],
          ['alimentos', `Alimentos (${alimentos.length})`],
          ['ryodoraku', 'Ryodoraku'],
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
        <div className="grid-2" style={{ gridTemplateColumns: '1.15fr 0.85fr', alignItems: 'start' }}>
          {/* Painel Esquerdo: Grade multi-coluna + Pontos Escolhidos + Particularidades + Doenças */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tab === 'sistemicos' && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={apenasProtocolos} onChange={(e) => { setApenasProtocolos(e.target.checked); setSelected(null); }} />
                  Protocolos
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={filtroYin} onChange={(e) => setFiltroYin(e.target.checked)} />
                  Yin
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={filtroYang} onChange={(e) => setFiltroYang(e.target.checked)} />
                  Yang
                </label>
              </div>
            )}

            {/* Grade multi-colunas de pontos (duplo clique seleciona!) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 4,
                maxHeight: 170,
                overflowY: 'auto',
                padding: 6,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-alt)',
              }}
              title="Clique para visualizar | Duplo clique para adicionar aos pontos escolhidos"
            >
              {activeList.map((item) => {
                const title = getItemTitle(item);
                const isSel = selected?.id === item.id;
                return (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => setSelected(item)}
                    onDoubleClick={() => handleToggleEscolhido(title)}
                    style={{
                      textAlign: 'left',
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid transparent',
                      fontSize: 12,
                      fontWeight: isSel ? 700 : 500,
                      background: isSel ? 'var(--primary)' : 'var(--surface)',
                      color: isSel ? '#fff' : 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {title}
                  </button>
                );
              })}
            </div>

            {/* Pontos Escolhidos + Reset */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Pontos escolhidos (duplo clique na lista para adicionar)
                </span>
                <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={handleResetEscolhidos}>
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
              <div
                style={{
                  minHeight: 42,
                  padding: 8,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  background: '#fff',
                }}
              >
                {currentPicked.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum ponto selecionado nesta aba.</span>
                ) : (
                  currentPicked.map((pt) => (
                    <span
                      key={pt}
                      className="badge"
                      style={{ cursor: 'pointer' }}
                      title="Clique para remover"
                      onClick={() =>
                        setEscolhidos((prev) => ({
                          ...prev,
                          [tab]: prev[tab].filter((x) => x !== pt),
                        }))
                      }
                    >
                      {pt} ×
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Particularidades / Localização + Doenças + Cruzamentos */}
            {selected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                {Boolean(selected.energia || selected.localizacao || selected.observacao || selected.acao_energetica) && (
                  <div style={{ background: 'var(--surface-alt)', padding: 10, borderRadius: 8 }}>
                    <strong style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                      Particularidades / Localização
                    </strong>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {[selected.localizacao, selected.energia, selected.observacao, selected.acao_energetica]
                        .filter(Boolean)
                        .join('\n')}
                    </div>
                  </div>
                )}

                <div style={{ background: 'var(--surface-alt)', padding: 10, borderRadius: 8 }}>
                  <strong style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                    Doenças / Indicações
                  </strong>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {String(selected.doencas ?? selected.sintomas_chave ?? selected.pontos_json ?? '—')}
                  </div>
                </div>

                {/* Rodapé de cruzamento (Beneficia / Koryo / Auricular / YNSA) */}
                {Boolean(selected.beneficia || selected.koryo || selected.auricular || selected.ynsa || selected.pt_sist1) && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                    {Boolean(selected.beneficia) && <span className="badge">Beneficia: {String(selected.beneficia)}</span>}
                    {Boolean(selected.koryo) && <span className="badge">Koryo: {String(selected.koryo)}</span>}
                    {Boolean(selected.auricular) && <span className="badge">Auricular: {String(selected.auricular)}</span>}
                    {Boolean(selected.ynsa) && <span className="badge">YNSA: {String(selected.ynsa)}</span>}
                    {Boolean(selected.pt_sist1) && <span className="badge">Sistêmico 1: {String(selected.pt_sist1)}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Clique em um ponto da grade acima para ver suas particularidades, doenças e localização no mapa.
              </div>
            )}
          </div>

          {/* Painel Direito: Mapa Anatômico com Mira em Cruz */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selected ? getItemTitle(selected) : 'Imagem Anatômica'}
              </strong>
              {selected && Boolean(selected.polaridade) && (
                <span className="badge">{String(selected.polaridade)}</span>
              )}
            </div>
            <ImagePointViewer
              src={selected?.imagem_path ? String(selected.imagem_path) : null}
              alt="Mapa do ponto"
              showCrosshair={tab !== 'koryo'}
              connectLine={tab === 'koryo'}
              badgeText={selected ? getItemTitle(selected) : undefined}
              markers={[
                {
                  x: (selected?.coordenada_coluna as number | undefined) ?? (selected?.coluna1 as number | undefined),
                  y: (selected?.coordenada_linha as number | undefined) ?? (selected?.linha1 as number | undefined),
                },
                {
                  x: selected?.coluna2 as number | undefined,
                  y: selected?.linha2 as number | undefined,
                },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
