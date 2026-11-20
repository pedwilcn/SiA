import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  ClipboardList,
  DollarSign,
  Eye,
  FileText,
  Flower2,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
} from 'lucide-react';
import { api, buildWhatsAppUrl, generateAtendimentoPdf } from '../api';
import { CurrencyInput, formatBrl } from '../components/CurrencyInput';
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
  onNavigate: (page: 'home' | 'mtc' | 'iridologia' | 'historico' | 'florais' | 'cadastros') => void;
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

export function HomePage({ selectedCliente, onSelectCliente, onStartAtendimento, onNavigate }: HomePageProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState<Omit<Cliente, 'id'>>(EMPTY_CLIENTE);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPacienteForm, setShowPacienteForm] = useState(false);

  const [dataAgenda, setDataAgenda] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [histDatas, setHistDatas] = useState<Array<{ id: number; dataHora: string; queixas?: string }>>([]);
  const [msg, setMsg] = useState('');
  const pacientesRef = useRef<HTMLDivElement>(null);

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
    setShowPacienteForm(true);
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
    setShowPacienteForm(false);
    await loadClientes();
  };

  const handleDeleteCliente = async () => {
    if (!editingId) return;
    if (!window.confirm(`Excluir o paciente "${form.nome}"?`)) return;
    await api(`/api/clientes/${editingId}`, { method: 'DELETE' });
    onSelectCliente(null);
    setEditingId(null);
    setForm(EMPTY_CLIENTE);
    setShowPacienteForm(false);
    await loadClientes();
    setMsg('Paciente excluído.');
  };

  const handleSaveSlot = async (slotItem: AgendaSlot) => {
    await api('/api/agenda', {
      method: 'PUT',
      body: JSON.stringify({ dataConsulta: dataAgenda, ...slotItem }),
    });
    setMsg(`Horário ${slotItem.slot} salvo para ${dataAgenda.split('-').reverse().join('/')}.`);
  };

  const phoneForWhatsApp = form.telCel || form.telRes;

  const dockItems = [
    {
      label: 'Pacientes',
      icon: User,
      onClick: () => pacientesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    { label: 'Atendimentos', icon: ClipboardList, onClick: () => onNavigate('historico') },
    { label: 'MTC', icon: Activity, onClick: () => onNavigate('mtc') },
    { label: 'Iridologia', icon: Eye, onClick: () => onNavigate('iridologia') },
    { label: 'Florais', icon: Flower2, onClick: () => onNavigate('florais') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Home — Painel Clínico</h2>
          <span className="page-subtitle">
            {selectedCliente ? `Paciente ativo: ${selectedCliente.nome}` : 'Selecione um paciente ou acesse um módulo pelo dock abaixo'}
          </span>
        </div>
        {msg && <span className="badge">{msg}</span>}
      </div>

      {/* Dock de Atalhos Rápidos */}
      <div
        className="card"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {dockItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className="btn"
              onClick={item.onClick}
              style={{
                flex: '1 1 130px',
                height: 44,
                justifyContent: 'center',
                gap: 8,
                fontWeight: 600,
                background: 'var(--surface-alt)',
                borderColor: 'var(--border)',
              }}
            >
              <Icon size={17} color="var(--primary)" />
              {item.label}
            </button>
          );
        })}
      </div>

      <SearchHero
        value={busca}
        onChange={setBusca}
        placeholder="Buscar paciente por nome ou telefone..."
        countLabel={`${clientes.length} pacientes`}
      />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Lista e Ficha de Pacientes */}
        <div className="card" ref={pacientesRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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

          <div className="list-scroll" style={{ maxHeight: 230, marginBottom: 12 }}>
            {clientes.map((c) => (
              <div
                key={c.id}
                className={`list-item ${selectedCliente?.id === c.id ? 'selected' : ''}`}
                onClick={() => handlePickCliente(c)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span>{c.nome}</span>
                  {(c.telCel || c.telRes) && (
                    <span className="tabular" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.telCel || c.telRes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedCliente && !showPacienteForm && (
            <div style={{ background: 'var(--surface-alt)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13 }}>
                <strong>{selectedCliente.nome}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {[selectedCliente.telCel || selectedCliente.telRes, selectedCliente.localAtendimento, selectedCliente.floralRecomendado]
                    .filter(Boolean)
                    .join(' • ') || 'Sem observações adicionais'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn" onClick={() => setShowPacienteForm(true)}>
                  <Pencil size={14} /> Editar
                </button>
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
            </div>
          )}

          {showPacienteForm && (
            <form onSubmit={handleSaveCliente} style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
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
                <button type="button" className="btn" onClick={() => setShowPacienteForm(false)}>
                  Cancelar
                </button>
                {editingId && (
                  <button type="button" className="btn btn-danger" onClick={handleDeleteCliente}>
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
              </div>
            </form>
          )}
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

      {/* Financeiro da Sessão + Histórico de Atendimento */}
      <div className="grid-2" style={{ gridTemplateColumns: '1.4fr 0.6fr', alignItems: 'start' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Qtd. Acupuntura</label>
              <input
                type="text"
                inputMode="numeric"
                className="tabular"
                value={String(qtdAcup)}
                onChange={(e) => setQtdAcup(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Valor Acupuntura</label>
              <CurrencyInput value={valAcup} onChange={setValAcup} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Qtd. Estética</label>
              <input
                type="text"
                inputMode="numeric"
                className="tabular"
                value={String(qtdEst)}
                onChange={(e) => setQtdEst(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Valor Estética</label>
              <CurrencyInput value={valEst} onChange={setValEst} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Florais</label>
              <CurrencyInput value={valFlorais} onChange={setValFlorais} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Frete</label>
              <CurrencyInput value={frete} onChange={setFrete} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Multa</label>
              <CurrencyInput value={multa} onChange={setMulta} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Pagamento Recebido</label>
              <CurrencyInput value={pagamento} onChange={setPagamento} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Saldo Anterior (use -/+)</label>
              <CurrencyInput value={saldoAnterior} onChange={setSaldoAnterior} allowNegative />
            </div>
          </div>

          <div
            className="tabular"
            style={{
              background: 'var(--surface-alt)',
              padding: '12px 16px',
              borderRadius: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              fontSize: 13.5,
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block' }}>Investimento Total</span>
              <strong>R$ {formatBrl(investimento)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block' }}>Saldo do Dia</span>
              <strong style={{ color: saldoDia < 0 ? 'var(--danger)' : 'var(--text)' }}>R$ {formatBrl(saldoDia)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block' }}>Saldo Geral</span>
              <strong style={{ color: saldoGeral < 0 ? 'var(--danger)' : 'var(--primary)' }}>R$ {formatBrl(saldoGeral)}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Histórico de Atendimento</h3>
          <div className="list-scroll" style={{ maxHeight: 240 }}>
            {histDatas.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
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
                  <div className="tabular">{h.dataHora}</div>
                  {h.queixas && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
