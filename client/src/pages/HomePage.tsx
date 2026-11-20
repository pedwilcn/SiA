import { useEffect, useState } from 'react';
import { Calendar, MessageCircle, Plus, Save, Trash2, User, DollarSign, FileText } from 'lucide-react';
import { api, buildWhatsAppUrl, generateAtendimentoPdf } from '../api';

export interface Cliente {
  id: number;
  nome: string;
  telRes: string;
  telCel: string;
  email: string;
  indicacao: string;
  localAtendimento: string;
  floralRecomendado: string;
  dataPedidoFloral: string;
  dataEntregaFloral: string;
}

interface AgendaSlot {
  slot: number;
  hora: string;
  paciente: string;
  telefone: string;
}

interface HomePageProps {
  selectedCliente: Cliente | null;
  onSelectCliente: (c: Cliente | null) => void;
  onStartAtendimento: (c: Cliente) => void;
}

const EMPTY_CLIENTE: Omit<Cliente, 'id'> = {
  nome: '',
  telRes: '',
  telCel: '',
  email: '',
  indicacao: '',
  localAtendimento: '',
  floralRecomendado: '',
  dataPedidoFloral: '',
  dataEntregaFloral: '',
};

export function HomePage({ selectedCliente, onSelectCliente, onStartAtendimento }: HomePageProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState<Omit<Cliente, 'id'>>(EMPTY_CLIENTE);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [dataAgenda, setDataAgenda] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [histDatas, setHistDatas] = useState<Array<{ id: number; dataHora: string; queixas?: string }>>([]);
  const [msg, setMsg] = useState('');

  // Calculadora Financeira (equivalente ao Calc() de frm_início.frm)
  const [qtdAcup, setQtdAcup] = useState(1);
  const [valAcup, setValAcup] = useState(0);
  const [qtdEst, setQtdEst] = useState(0);
  const [valEst, setValEst] = useState(0);
  const [valFlorais, setValFlorais] = useState(0);
  const [frete, setFrete] = useState(0);
  const [multa, setMulta] = useState(0);
  const [pagamento, setPagamento] = useState(0);
  const [saldoAnterior, setSaldoAnterior] = useState(0);

  const totalAcup = qtdAcup * valAcup;
  const totalEst = qtdEst * valEst;
  const investimento = totalAcup + totalEst + valFlorais + frete + multa;
  const saldoDia = investimento === 0 && pagamento === 0 ? 0 : pagamento - investimento;
  const saldoGeral = saldoDia + saldoAnterior;

  const loadClientes = async () => {
    const data = await api<Cliente[]>(`/api/clientes?q=${encodeURIComponent(busca)}`);
    setClientes(data);
  };

  const loadAgenda = async (date: string) => {
    const data = await api<AgendaSlot[]>(`/api/agenda?date=${encodeURIComponent(date)}`);
    setSlots(data);
  };

  useEffect(() => {
    void loadClientes();
  }, [busca]);

  useEffect(() => {
    void loadAgenda(dataAgenda);
  }, [dataAgenda]);

  useEffect(() => {
    if (!selectedCliente) {
      setHistDatas([]);
      return;
    }
    void api<Array<{ id: number; dataHora: string; queixas?: string }>>(
      `/api/historico?paciente=${encodeURIComponent(selectedCliente.nome)}`
    ).then(setHistDatas);
  }, [selectedCliente?.id]);

  const handlePickCliente = (c: Cliente) => {
    onSelectCliente(c);
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      telRes: c.telRes,
      telCel: c.telCel,
      email: c.email,
      indicacao: c.indicacao,
      localAtendimento: c.localAtendimento,
      floralRecomendado: c.floralRecomendado,
      dataPedidoFloral: c.dataPedidoFloral,
      dataEntregaFloral: c.dataEntregaFloral,
    });
  };

  const handleNovoCliente = () => {
    onSelectCliente(null);
    setEditingId(null);
    setForm(EMPTY_CLIENTE);
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    if (editingId) {
      const updated = await api<Cliente>(`/api/clientes/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      onSelectCliente(updated);
      setMsg('Cadastro atualizado.');
    } else {
      const created = await api<Cliente>('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onSelectCliente(created);
      setEditingId(created.id);
      setMsg('Paciente cadastrado com criptografia LGPD.');
    }
    await loadClientes();
  };

  const handleDeleteCliente = async () => {
    if (!editingId) return;
    if (!window.confirm(`Excluir o paciente "${form.nome}"?`)) return;
    await api(`/api/clientes/${editingId}`, { method: 'DELETE' });
    handleNovoCliente();
    await loadClientes();
    setMsg('Paciente excluído.');
  };

  const handleSaveSlot = async (slotItem: AgendaSlot) => {
    await api('/api/agenda', {
      method: 'PUT',
      body: JSON.stringify({ dataConsulta: dataAgenda, ...slotItem }),
    });
    setMsg(`Horário ${slotItem.slot} salvo para ${dataAgenda}.`);
  };

  const phoneForWhatsApp = form.telCel || form.telRes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>Home — Agenda, Pacientes & Financeiro</h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedCliente ? `Paciente selecionado: ${selectedCliente.nome}` : 'Selecione ou cadastre um paciente'}
          </span>
        </div>
        {msg && <span className="badge">{msg}</span>}
      </div>

      <div className="grid-2">
        {/* Lista e Cadastro de Pacientes */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <User size={17} /> Pacientes ({clientes.length})
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn" onClick={handleNovoCliente}>
                <Plus size={14} /> Novo
              </button>
              {selectedCliente && (
                <button type="button" className="btn btn-primary" onClick={() => onStartAtendimento(selectedCliente)}>
                  Nova Consulta
                </button>
              )}
            </div>
          </div>

          <input
            type="search"
            placeholder="Buscar paciente por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', marginBottom: 10 }}
          />

          <div className="list-scroll" style={{ maxHeight: 200, marginBottom: 14 }}>
            {clientes.map((c) => (
              <div
                key={c.id}
                className={`list-item ${selectedCliente?.id === c.id ? 'selected' : ''}`}
                onClick={() => handlePickCliente(c)}
              >
                <div>{c.nome}</div>
                {(c.telCel || c.telRes) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.telCel || c.telRes}</div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSaveCliente}>
            <div className="field">
              <label>Nome Completo</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Celular (WhatsApp)</label>
                <input value={form.telCel} onChange={(e) => setForm({ ...form, telCel: e.target.value })} placeholder="11999998888" />
              </div>
              <div className="field">
                <label>Tel. Residencial / Comercial</label>
                <input value={form.telRes} onChange={(e) => setForm({ ...form, telRes: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Indicação</label>
                <input value={form.indicacao} onChange={(e) => setForm({ ...form, indicacao: e.target.value })} />
              </div>
              <div className="field">
                <label>Local de Atendimento</label>
                <input value={form.localAtendimento} onChange={(e) => setForm({ ...form, localAtendimento: e.target.value })} />
              </div>
            </div>
            <div className="grid-3">
              <div className="field">
                <label>Floral Recomendado</label>
                <input value={form.floralRecomendado} onChange={(e) => setForm({ ...form, floralRecomendado: e.target.value })} />
              </div>
              <div className="field">
                <label>Pedido Floral</label>
                <input type="date" value={form.dataPedidoFloral} onChange={(e) => setForm({ ...form, dataPedidoFloral: e.target.value })} />
              </div>
              <div className="field">
                <label>Entrega Floral</label>
                <input type="date" value={form.dataEntregaFloral} onChange={(e) => setForm({ ...form, dataEntregaFloral: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <button type="submit" className="btn btn-primary">
                <Save size={14} /> {editingId ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-danger" onClick={handleDeleteCliente}>
                  <Trash2 size={14} /> Excluir
                </button>
              )}
              {phoneForWhatsApp && (
                <a
                  href={buildWhatsAppUrl(phoneForWhatsApp, `Olá ${form.nome}, tudo bem?`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-whatsapp"
                  style={{ textDecoration: 'none' }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </div>
          </form>
        </div>

        {/* Agenda Diária */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Calendar size={17} /> Agenda do Dia
            </h3>
            <input type="date" value={dataAgenda} onChange={(e) => setDataAgenda(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map((s, idx) => (
              <div key={s.slot} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 125px auto auto', gap: 6, alignItems: 'center' }}>
                <input
                  placeholder="08:00"
                  value={s.hora}
                  onChange={(e) => {
                    const copy = [...slots];
                    copy[idx] = { ...s, hora: e.target.value };
                    setSlots(copy);
                  }}
                />
                <input
                  placeholder={`Paciente ${s.slot}`}
                  value={s.paciente}
                  onChange={(e) => {
                    const copy = [...slots];
                    copy[idx] = { ...s, paciente: e.target.value };
                    setSlots(copy);
                  }}
                />
                <input
                  placeholder="Telefone"
                  value={s.telefone}
                  onChange={(e) => {
                    const copy = [...slots];
                    copy[idx] = { ...s, telefone: e.target.value };
                    setSlots(copy);
                  }}
                />
                <button type="button" className="btn" title="Salvar horário" onClick={() => handleSaveSlot(slots[idx])}>
                  <Save size={14} />
                </button>
                {s.telefone ? (
                  <a
                    href={buildWhatsAppUrl(
                      s.telefone,
                      `Olá ${s.paciente || ''}, confirmando seu atendimento em ${dataAgenda.split('-').reverse().join('/')} às ${s.hora || 'horário combinado'}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp"
                    title="Confirmar via WhatsApp"
                    style={{ textDecoration: 'none', padding: '8px 10px' }}
                  >
                    <MessageCircle size={14} />
                  </a>
                ) : (
                  <span style={{ width: 34 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financeiro da Sessão + Histórico de Atendimento do Paciente */}
      <div className="grid-2" style={{ gridTemplateColumns: '1.35fr 0.65fr', alignItems: 'start' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <DollarSign size={17} /> Controle Financeiro da Sessão
            </h3>
            {selectedCliente && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  generateAtendimentoPdf({
                    paciente: selectedCliente.nome,
                    dataHora: dataAgenda,
                    financeiro: { investimento, pagamento, saldoDia, saldoGeral },
                  })
                }
              >
                <FileText size={14} /> Gerar Recibo PDF
              </button>
            )}
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Qtd. Sessões Acupuntura × Valor (R$)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" min={0} value={qtdAcup} onChange={(e) => setQtdAcup(Number(e.target.value))} style={{ width: 70 }} />
                <input type="number" min={0} step="0.01" value={valAcup} onChange={(e) => setValAcup(Number(e.target.value))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="field">
              <label>Qtd. Estética × Valor (R$)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" min={0} value={qtdEst} onChange={(e) => setQtdEst(Number(e.target.value))} style={{ width: 70 }} />
                <input type="number" min={0} step="0.01" value={valEst} onChange={(e) => setValEst(Number(e.target.value))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="field">
              <label>Florais + Frete + Multa (R$)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" min={0} step="0.01" value={valFlorais} onChange={(e) => setValFlorais(Number(e.target.value))} placeholder="Florais" />
                <input type="number" min={0} step="0.01" value={frete} onChange={(e) => setFrete(Number(e.target.value))} placeholder="Frete" />
                <input type="number" min={0} step="0.01" value={multa} onChange={(e) => setMulta(Number(e.target.value))} placeholder="Multa" />
              </div>
            </div>
            <div className="field">
              <label>Pagamento Recebido (R$)</label>
              <input type="number" min={0} step="0.01" value={pagamento} onChange={(e) => setPagamento(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Saldo Anterior (R$)</label>
              <input type="number" step="0.01" value={saldoAnterior} onChange={(e) => setSaldoAnterior(Number(e.target.value))} />
            </div>
            <div style={{ background: 'var(--surface-alt)', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 13 }}>
              <div>Investimento Total: <strong>R$ {investimento.toFixed(2)}</strong></div>
              <div>Saldo do Dia: <strong>R$ {saldoDia.toFixed(2)}</strong></div>
              <div>Saldo Geral: <strong style={{ color: saldoGeral < 0 ? 'var(--danger)' : 'var(--primary)' }}>R$ {saldoGeral.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Histórico de Atendimento</h3>
          <div className="list-scroll" style={{ maxHeight: 190 }}>
            {histDatas.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedCliente ? 'Sem atendimentos registrados.' : 'Selecione um paciente para ver as datas.'}
              </div>
            ) : (
              histDatas.map((h) => (
                <div
                  key={h.id}
                  className="list-item"
                  onClick={() => selectedCliente && onStartAtendimento(selectedCliente)}
                  title="Clique para abrir o prontuário"
                >
                  <div>{h.dataHora}</div>
                  {h.queixas && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.queixas}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
