import { useEffect, useState } from 'react';
import { Flower2 } from 'lucide-react';
import { api } from '../api';

interface Floral {
  id: number;
  nome: string;
  doencas: string;
}

export function FloraisPage() {
  const [busca, setBusca] = useState('');
  const [florais, setFlorais] = useState<Floral[]>([]);
  const [selected, setSelected] = useState<Floral | null>(null);

  useEffect(() => {
    void api<Floral[]>(`/api/catalogos/florais?q=${encodeURIComponent(busca)}`).then(setFlorais);
  }, [busca]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flower2 size={22} color="var(--primary)" /> Florais ({florais.length})
        </h2>
        <input
          type="search"
          placeholder="Pesquisar floral ou indicação..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="list-scroll" style={{ maxHeight: 520 }}>
            {florais.map((f) => (
              <div
                key={f.id}
                className={`list-item ${selected?.id === f.id ? 'selected' : ''}`}
                onClick={() => setSelected(f)}
              >
                <div>{f.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.doencas}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {selected ? (
            <div>
              <h3 style={{ marginTop: 0 }}>{selected.nome}</h3>
              <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 14 }}>
                {selected.doencas || 'Sem indicações cadastradas.'}
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Selecione um floral para ver suas indicações emocionais e físicas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
