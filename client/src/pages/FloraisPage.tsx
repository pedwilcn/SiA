import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '../api';
import { SearchHero } from '../components/SearchHero';

interface Floral {
  id: number;
  nome: string;
  doencas: string;
}

export function FloraisPage() {
  const [busca, setBusca] = useState('');
  const [queixas, setQueixas] = useState('');
  const [florais, setFlorais] = useState<Floral[]>([]);
  const [selected, setSelected] = useState<Floral | null>(null);
  const [recomendados, setRecomendados] = useState<string[]>([]);

  useEffect(() => {
    void api<Floral[]>(`/api/catalogos/florais?q=${encodeURIComponent(busca)}`).then(setFlorais);
  }, [busca]);

  const toggleRecomendado = (nome: string) => {
    setRecomendados((prev) => (prev.includes(nome) ? prev : [...prev, nome]));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Florais</h2>
          <span className="page-subtitle">Pesquise por emoção, sintoma ou floral e dê duplo clique para recomendar</span>
        </div>
      </div>

      <SearchHero
        value={busca}
        onChange={setBusca}
        placeholder="Pesquisar floral, emoção ou indicação (ex: Ansiedade, Medo, Insônia)..."
        countLabel={`${florais.length} florais`}
      />

      {/* Layout espelhado do VB6: Esquerda = Queixas + Doenças | Direita = Lista + Recomendados */}
      <div className="grid-2" style={{ gridTemplateColumns: '1.2fr 0.8fr', alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Queixas</label>
            <textarea
              rows={2}
              value={queixas}
              onChange={(e) => setQueixas(e.target.value)}
              placeholder="Queixas emocionais e físicas do paciente..."
            />
          </div>
          <div>
            <strong style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              {selected ? `Indicações — ${selected.nome}` : 'Doenças / Indicações'}
            </strong>
            <div
              style={{
                minHeight: 380,
                maxHeight: 460,
                overflowY: 'auto',
                background: 'var(--surface-alt)',
                padding: 14,
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                fontSize: 13.5,
              }}
            >
              {selected ? selected.doencas || 'Sem indicações cadastradas.' : 'Selecione um floral na lista ao lado.'}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="list-scroll" style={{ maxHeight: 320 }} title="Clique para ver | Duplo clique para recomendar">
            {florais.map((f) => (
              <div
                key={f.id}
                className={`list-item ${selected?.id === f.id ? 'selected' : ''}`}
                onClick={() => setSelected(f)}
                onDoubleClick={() => toggleRecomendado(f.nome)}
              >
                {f.nome}
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Recomendados (duplo clique para adicionar)
              </strong>
              <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setRecomendados([])}>
                <RotateCcw size={12} /> Limpar
              </button>
            </div>
            <div className="list-scroll" style={{ minHeight: 120, maxHeight: 160, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recomendados.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum floral recomendado ainda.</span>
              ) : (
                recomendados.map((nome) => (
                  <div
                    key={nome}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 8px', background: 'var(--primary-soft)', borderRadius: 6, cursor: 'pointer' }}
                    onClick={() => setRecomendados((prev) => prev.filter((x) => x !== nome))}
                    title="Clique para remover"
                  >
                    <span>{nome}</span>
                    <span>×</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
