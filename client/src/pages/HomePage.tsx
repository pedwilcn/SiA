import { useEffect, useState } from 'react';
import { Calendar, MessageCircle, Plus, Save, Trash2, User, DollarSign, FileText } from 'lucide-react';
import { api, buildWhatsAppUrl, generateAtendimentoPdf } from '../api';
import { SearchHero } from '../components/SearchHero';

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
      <div className="page-header">
        <div>
          <h2 className="page-title">Home — Agenda, Pacientes & Financeiro</h2>
          <span className="page-subtitle">
            {selectedCliente ? `Paciente selecionado: ${selectedCliente.nome}` : 'Selecione ou cadastre um paciente para iniciar'}
          </span>
        </div>
        {msg && <span className="badge">{msg}</span>}
      </div>

      <SearchHero
        value={busca}
        onChange={setBusca}
        placeholder="Buscar paciente por nome ou telefone..."
        countLabel={`${clientes.length} pacientes`}
      />

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
              <div key={s.slot} style={{ display: 'grid', gridTemplateColumns: '82px 1fr 132px 38px 38px', gap: 6, alignItems: 'center' }}>
                <input
                  placeholder="08:00"
                  value={s.hora}
                  className="tabular"
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
                  className="tabular"
                  onChange={(e) => {
                    const copy = [...slots];
                    copy[idx] = { ...s, telefone: e.target.value };
                    setSlots(copy);
                  }}
                />
                <button type="button" className="btn" style={{ width: 38, padding: 0 }} title="Salvar horário" onClick={() => handleSaveSlot(slots[idx])}>
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
                    style={{ textDecoration: 'none', width: 38, padding: 0 }}
                  >
                    <MessageCircle size={14} />
                  </a>
                ) : (
                  <span style={{ width: 38 }} />
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
          <div className="grid-3" style={{ alignItems: 'end' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 8 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Qtd. Acup.</label>
                <input type="number" min={0} className="tabular" value={qtdAcup} onChange={(e) => setQtdAcup(Number(e.target.value))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Valor Sessão (R$)</label>
                <input type="number" min={0} step="0.01" className="tabular" value={valAcup} onChange={(e) => setValAcup(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 8 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Qtd. Estét.</label>
                <input type="number" min={0} className="tabular" value={qtdEst} onChange={(e) => setQtdEst(Number(e.target.value))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Valor Estét. (R$)</label>
                <input type="number" min={0} step="0.01" className="tabular" value={valEst} onChange={(e) => setValEst(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Florais (R$)</label>
                <input type="number" min={0} step="0.01" className="tabular" value={valFlorais} onChange={(e) => setValFlorais(Number(e.target.value))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Frete (R$)</label>
                <input type="number" min={0} step="0.01" className="tabular" value={frete} onChange={(e) => setFrete(Number(e.target.value))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Multa (R$)</label>
                <input type="number" min={0} step="0.01" className="tabular" value={multa} onChange={(e) => setMulta(Number(e.target.value))} />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Pagamento Recebido (R$)</label>
              <input type="number" min={0} step="0.01" className="tabular" value={pagamento} onChange={(e) => setPagamento(Number(e.target.value))} />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Saldo Anterior (R$)</label>
              <input type="number" step="0.01" className="tabular" value={saldoAnterior} onChange={(e) => setSaldoAnterior(Number(e.target.value))} />
            </div>

            <div className="tabular" style={{ background: 'var(--surface-alt)', padding: '10px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 13, gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Investimento:</span> <strong>R$ {investimento.toFixed(2)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Saldo do Dia:</span> <strong>R$ {saldoDia.toFixed(2)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Saldo Geral:</span> <strong style={{ color: saldoGeral < 0 ? 'var(--danger)' : 'var(--primary)' }}>R$ {saldoGeral.toFixed(2)}</strong></div>
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
