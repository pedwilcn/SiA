import { useEffect, useState } from 'react';
import { FileText, MessageCircle, Music, Plus, Save, Trash2 } from 'lucide-react';
import { api, buildWhatsAppUrl, generateAtendimentoPdf } from '../api';
import type { Cliente } from './HomePage';

interface HistoricoRecord {
  id?: number;
  paciente: string;
  dataHora: string;
  queixas?: string;
  iridologia?: string;
  lingua?: string;
  residuos?: string;
  tratamento?: string;
  procedimentos?: string;
  audioPath?: string;
  pontosSistemicos?: string[];
  pontosAuriculares?: string[];
  pontosCranio?: string[];
  pontosKoryo?: string[];
  pontosVentosa?: string[];
  ryoEsquerda?: number[];
  ryoDireita?: number[];
}

interface HistoricoPageProps {
  selectedCliente: Cliente | null;
}

const EMPTY_HIST = (paciente = ''): HistoricoRecord => ({
  paciente,
  dataHora: new Date().toISOString().slice(0, 16).replace('T', ' '),
  queixas: '',
  iridologia: '',
  lingua: '',
  residuos: '',
  tratamento: '',
  procedimentos: '',
  audioPath: '',
  pontosSistemicos: [],
  pontosAuriculares: [],
  pontosCranio: [],
  pontosKoryo: [],
  pontosVentosa: [],
});

export function HistoricoPage({ selectedCliente }: HistoricoPageProps) {
  const [registros, setRegistros] = useState<HistoricoRecord[]>([]);
  const [form, setForm] = useState<HistoricoRecord>(() => EMPTY_HIST(selectedCliente?.nome ?? ''));
  const [audios, setAudios] = useState<Array<{ name: string; url: string }>>([]);
  const [msg, setMsg] = useState('');

  const loadHistorico = async () => {
    const q = selectedCliente ? `?paciente=${encodeURIComponent(selectedCliente.nome)}` : '';
    const data = await api<HistoricoRecord[]>(`/api/historico${q}`);
    setRegistros(data);
  };

  useEffect(() => {
    void loadHistorico();
    setForm((prev) => ({ ...prev, paciente: selectedCliente?.nome ?? prev.paciente }));
  }, [selectedCliente?.id]);

  useEffect(() => {
    void api<Array<{ name: string; url: string }>>('/api/catalogos/media/audio').then(setAudios);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paciente.trim()) return;
    if (form.id) {
      const updated = await api<HistoricoRecord>(`/api/historico/${form.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setForm(updated);
      setMsg('Atendimento atualizado (criptografado LGPD).');
    } else {
      const created = await api<HistoricoRecord>('/api/historico', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(created);
      setMsg('Novo atendimento registrado (criptografado LGPD).');
    }
    await loadHistorico();
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!window.confirm('Excluir este registro de atendimento?')) return;
    await api(`/api/historico/${form.id}`, { method: 'DELETE' });
    setForm(EMPTY_HIST(selectedCliente?.nome ?? ''));
    await loadHistorico();
    setMsg('Registro excluído.');
  };

  const parseCsv = (val: string) =>
    val.split(',').map((s) => s.trim()).filter(Boolean);

  const phone = selectedCliente?.telCel || selectedCliente?.telRes || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>Histórico de Atendimento</h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedCliente ? `Filtrado por: ${selectedCliente.nome}` : 'Mostrando todos os atendimentos'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {msg && <span className="badge">{msg}</span>}
          <button type="button" className="btn" onClick={() => setForm(EMPTY_HIST(selectedCliente?.nome ?? ''))}>
            <Plus size={14} /> Novo Atendimento
          </button>
          <button type="button" className="btn" onClick={() => generateAtendimentoPdf(form)}>
            <FileText size={14} /> Gerar PDF
          </button>
          {phone && (
            <a
              href={buildWhatsAppUrl(
                phone,
                `Olá ${form.paciente}, segue o resumo das suas orientações (${form.dataHora}): ${form.procedimentos || form.tratamento || ''}`
              )}
              target="_blank"
              rel="noreferrer"
              className="btn btn-whatsapp"
              style={{ textDecoration: 'none' }}
            >
              <MessageCircle size={14} /> Enviar WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Consultas ({registros.length})</h3>
          <div className="list-scroll" style={{ maxHeight: 560 }}>
            {registros.map((r) => (
              <div
                key={r.id}
                className={`list-item ${form.id === r.id ? 'selected' : ''}`}
                onClick={() => setForm(r)}
              >
                <div>{r.paciente}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.dataHora}</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="grid-2">
            <div className="field">
              <label>Paciente</label>
              <input value={form.paciente} onChange={(e) => setForm({ ...form, paciente: e.target.value })} required />
            </div>
            <div className="field">
              <label>Data e Hora</label>
              <input value={form.dataHora} onChange={(e) => setForm({ ...form, dataHora: e.target.value })} />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Queixas Principais</label>
              <textarea rows={3} value={form.queixas ?? ''} onChange={(e) => setForm({ ...form, queixas: e.target.value })} />
            </div>
            <div className="field">
              <label>Iridologia</label>
              <textarea rows={3} value={form.iridologia ?? ''} onChange={(e) => setForm({ ...form, iridologia: e.target.value })} />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Avaliação de Língua</label>
              <textarea rows={2} value={form.lingua ?? ''} onChange={(e) => setForm({ ...form, lingua: e.target.value })} />
            </div>
            <div className="field">
              <label>Resíduos / Observações</label>
              <textarea rows={2} value={form.residuos ?? ''} onChange={(e) => setForm({ ...form, residuos: e.target.value })} />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Pontos Sistêmicos (separados por vírgula)</label>
              <input
                value={(form.pontosSistemicos ?? []).join(', ')}
                onChange={(e) => setForm({ ...form, pontosSistemicos: parseCsv(e.target.value) })}
                placeholder="Ex: IG04, E36, F03"
              />
            </div>
            <div className="field">
              <label>Pontos Auriculares</label>
              <input
                value={(form.pontosAuriculares ?? []).join(', ')}
                onChange={(e) => setForm({ ...form, pontosAuriculares: parseCsv(e.target.value) })}
                placeholder="Ex: Shenmen, Rim, Ansiedade 1"
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="field">
              <label>Pontos YNSA (Crânio)</label>
              <input
                value={(form.pontosCranio ?? []).join(', ')}
                onChange={(e) => setForm({ ...form, pontosCranio: parseCsv(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Pontos Koryo</label>
              <input
                value={(form.pontosKoryo ?? []).join(', ')}
                onChange={(e) => setForm({ ...form, pontosKoryo: parseCsv(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Ventosas</label>
              <input
                value={(form.pontosVentosa ?? []).join(', ')}
                onChange={(e) => setForm({ ...form, pontosVentosa: parseCsv(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Tratamento Aplicado</label>
              <textarea rows={3} value={form.tratamento ?? ''} onChange={(e) => setForm({ ...form, tratamento: e.target.value })} />
            </div>
            <div className="field">
              <label>Procedimentos / Orientações ao Paciente</label>
              <textarea rows={3} value={form.procedimentos ?? ''} onChange={(e) => setForm({ ...form, procedimentos: e.target.value })} />
            </div>
          </div>

          {/* Player de Áudio Terapêutico (substitui wmp.dll) */}
          <div style={{ background: 'var(--surface-alt)', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
              <Music size={15} /> Áudio Terapêutico (Audio/)
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={form.audioPath ?? ''}
                onChange={(e) => setForm({ ...form, audioPath: e.target.value })}
                style={{ flex: 1, minWidth: 220 }}
              >
                <option value="">Selecione uma música...</option>
                {audios.map((a) => (
                  <option key={a.url} value={a.url}>{a.name}</option>
                ))}
              </select>
              {form.audioPath && <audio controls src={form.audioPath} style={{ height: 36 }} />}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="submit" className="btn btn-primary">
              <Save size={14} /> {form.id ? 'Salvar Alterações' : 'Gravar Atendimento'}
            </button>
            {form.id && (
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
