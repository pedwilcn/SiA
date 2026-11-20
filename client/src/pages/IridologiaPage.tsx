import { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { api } from '../api';

type IridTab = 'queixas' | 'jensen' | 'rayid' | 'padroes';

export function IridologiaPage() {
  const [tab, setTab] = useState<IridTab>('queixas');
  const [busca, setBusca] = useState('');
  const [queixas, setQueixas] = useState<Array<Record<string, unknown>>>([]);
  const [jensen, setJensen] = useState<Array<Record<string, unknown>>>([]);
  const [padroes, setPadroes] = useState<Array<Record<string, unknown>>>([]);
  const [irisImages, setIrisImages] = useState<Array<{ name: string; url: string }>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  // Sobreposição interativa de mapa iridológico
  const [baseImg, setBaseImg] = useState('');
  const [overlayImg, setOverlayImg] = useState('');
  const [opacity, setOpacity] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const q = encodeURIComponent(busca);
    void Promise.all([
      api<Array<Record<string, unknown>>>(`/api/catalogos/iridologia_queixas?q=${q}`),
      api<Array<Record<string, unknown>>>(`/api/catalogos/iridologia_jensen?q=${q}`),
      api<Array<Record<string, unknown>>>(`/api/catalogos/iridologia_padroes?q=${q}`),
      api<Array<{ name: string; url: string }>>('/api/catalogos/media/imagens?folder=Iridologia'),
    ]).then(([iq, ij, ip, imgs]) => {
      setQueixas(iq);
      setJensen(ij);
      setPadroes(ip);
      setIrisImages(imgs);
      if (!baseImg && imgs.length > 0) setBaseImg(imgs[0].url);
    });
  }, [busca]);

  const activeList = tab === 'queixas' ? queixas : tab === 'jensen' ? jensen : padroes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Iridologia</h2>
        <input
          type="search"
          placeholder="Pesquisar área, padrão ou queixa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ width: 300, maxWidth: '100%' }}
        />
      </div>

      <div className="tabs">
        {([
          ['queixas', `Queixas (${queixas.length})`],
          ['jensen', `Jensen (${jensen.length})`],
          ['rayid', 'RayId / Sobreposição'],
          ['padroes', `Padrões (${padroes.length})`],
        ] as Array<[IridTab, string]>).map(([id, label]) => (
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

      {tab === 'rayid' ? (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Sobreposição Interativa de Mapa Iridológico</h3>
          <div className="grid-3" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Imagem Base (Íris)</label>
              <select value={baseImg} onChange={(e) => setBaseImg(e.target.value)}>
                {irisImages.map((img) => (
                  <option key={img.url} value={img.url}>{img.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Mapa para Sobrepor (Opcional)</label>
              <select value={overlayImg} onChange={(e) => setOverlayImg(e.target.value)}>
                <option value="">Nenhum</option>
                {irisImages.map((img) => (
                  <option key={img.url} value={img.url}>{img.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Opacidade do Mapa ({Math.round(opacity * 100)}%)</label>
              <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" className="btn" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}><ZoomIn size={14} /> Ampliar</button>
            <button type="button" className="btn" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}><ZoomOut size={14} /> Reduzir</button>
            <button type="button" className="btn" onClick={() => setOffsetY((y) => y - 10)}>↑</button>
            <button type="button" className="btn" onClick={() => setOffsetY((y) => y + 10)}>↓</button>
            <button type="button" className="btn" onClick={() => setOffsetX((x) => x - 10)}>←</button>
            <button type="button" className="btn" onClick={() => setOffsetX((x) => x + 10)}>→</button>
            <button type="button" className="btn" onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); }}>
              <RotateCcw size={14} /> Resetar
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: 680, height: 460, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 10, background: '#111' }}>
            {baseImg && (
              <img src={baseImg} alt="Íris Base" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}
            {overlayImg && (
              <img
                src={overlayImg}
                alt="Mapa Sobreposto"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity,
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="list-scroll" style={{ maxHeight: 500 }}>
              {activeList.map((item) => (
                <div
                  key={String(item.id)}
                  className={`list-item ${selected?.id === item.id ? 'selected' : ''}`}
                  onClick={() => setSelected(item)}
                >
                  <div>{String(item.titulo ?? item.area ?? item.nome ?? '')}</div>
                  {Boolean(item.codigo) && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Código: {String(item.codigo)}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            {selected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <h3 style={{ margin: 0 }}>{String(selected.titulo ?? selected.area ?? selected.nome ?? '')}</h3>
                {Boolean(selected.imagem_path) && (
                  <img
                    src={String(selected.imagem_path)}
                    alt="Padrão Iridológico"
                    style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                )}
                {Object.entries(selected)
                  .filter(([k, v]) => v !== null && v !== '' && !['id', 'imagem_path'].includes(k))
                  .map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface-alt)', padding: 10, borderRadius: 8 }}>
                      <strong style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{String(v)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                Selecione um item na lista para consultar detalhes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
