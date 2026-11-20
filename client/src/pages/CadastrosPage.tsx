import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../api';
import { ImagePointViewer } from '../components/ImagePointViewer';

const CATALOGOS = [
  { id: 'pontos_sistemicos', label: 'Pt. Sistêmicos', titleKey: 'codigo' },
  { id: 'pontos_auriculares', label: 'Pt. Auriculares', titleKey: 'nome' },
  { id: 'pontos_cranio', label: 'Pt. YNSA (Crânio)', titleKey: 'nome' },
  { id: 'pontos_koryo', label: 'Pt. Koryo', titleKey: 'codigo' },
  { id: 'ventosas', label: 'Ventosas', titleKey: 'figura' },
  { id: 'alimentos', label: 'Alimentos', titleKey: 'nome' },
  { id: 'florais', label: 'Florais', titleKey: 'nome' },
  { id: 'protocolos', label: 'Protocolos', titleKey: 'nome' },
  { id: 'estetica', label: 'Estética', titleKey: 'nome' },
  { id: 'iridologia_queixas', label: 'Iridologia Queixas', titleKey: 'titulo' },
  { id: 'iridologia_jensen', label: 'Iridologia Jensen', titleKey: 'area' },
  { id: 'iridologia_padroes', label: 'Iridologia Padrões', titleKey: 'nome' },
] as const;

export function CadastrosPage() {
  const [tipo, setTipo] = useState<string>('pontos_sistemicos');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState('');

  const spec = CATALOGOS.find((c) => c.id === tipo)!;

  const load = async () => {
    const data = await api<Array<Record<string, unknown>>>(`/api/catalogos/${tipo}?q=${encodeURIComponent(busca)}`);
    setItems(data);
    if (data.length > 0 && !form.id) {
      setForm(data[0]);
    }
  };

  useEffect(() => {
    setForm({});
    void load();
  }, [tipo]);

  useEffect(() => {
    void load();
  }, [busca]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.id) {
      const updated = await api<Record<string, unknown>>(`/api/catalogos/${tipo}/${form.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setForm(updated);
      setMsg('Registro atualizado.');
    } else {
      const created = await api<Record<string, unknown>>(`/api/catalogos/${tipo}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(created);
      setMsg('Novo registro criado.');
    }
    await load();
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!window.confirm('Excluir este registro do catálogo?')) return;
    await api(`/api/catalogos/${tipo}/${form.id}`, { method: 'DELETE' });
    setForm({});
    await load();
    setMsg('Registro excluído.');
  };

  const editableKeys = Object.keys(items[0] ?? form).filter((k) => k !== 'id');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Cadastros & Manutenção</h2>
        {msg && <span className="badge">{msg}</span>}
      </div>

      <div className="tabs">
        {CATALOGOS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`tab-btn ${tipo === c.id ? 'active' : ''}`}
            onClick={() => setTipo(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              type="search"
              placeholder="Filtrar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                const blank: Record<string, unknown> = {};
                editableKeys.forEach((k) => { blank[k] = ''; });
                setForm(blank);
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="list-scroll" style={{ maxHeight: 540 }}>
            {items.map((item) => (
              <div
                key={String(item.id)}
                className={`list-item ${form.id === item.id ? 'selected' : ''}`}
                onClick={() => setForm(item)}
              >
                {String(item[spec.titleKey] ?? item.id)}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {typeof form.imagem_path === 'string' && form.imagem_path && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Clique na imagem para capturar as coordenadas (Coluna / Linha):
              </div>
              <ImagePointViewer
                src={form.imagem_path}
                alt="Editor de coordenadas"
                markers={[
                  {
                    x: Number(form.coordenada_coluna ?? form.coluna1 ?? 0) || null,
                    y: Number(form.coordenada_linha ?? form.linha1 ?? 0) || null,
                  },
                ]}
                onPickCoordinate={(x, y) => {
                  if ('coordenada_coluna' in form) {
                    setForm({ ...form, coordenada_coluna: x, coordenada_linha: y });
                  } else if ('coluna1' in form) {
                    setForm({ ...form, coluna1: x, linha1: y });
                  }
                }}
              />
            </div>
          )}

          <div className="grid-2">
            {editableKeys.map((k) => {
              const val = String(form[k] ?? '');
              const isLong = val.length > 60 || ['doencas', 'energia', 'localizacao', 'observacao', 'acao_energetica', 'positivo', 'negativo', 'recomendacoes', 'sintomas_chave', 'pontos_json'].includes(k);
              return (
                <div key={k} className="field" style={{ gridColumn: isLong ? '1 / -1' : undefined }}>
                  <label>{k.replace(/_/g, ' ')}</label>
                  {isLong ? (
                    <textarea rows={2} value={val} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  ) : (
                    <input value={val} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              <Save size={14} /> {form.id ? 'Salvar Alterações' : 'Criar Registro'}
            </button>
            {Boolean(form.id) && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={14} /> Excluir
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
