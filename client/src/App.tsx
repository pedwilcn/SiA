import { useEffect, useState } from 'react';
import {
  Activity,
  ClipboardList,
  Database,
  Download,
  Eye,
  Flower2,
  Home,
  Lock,
} from 'lucide-react';
import { api } from './api';
import { LoginPage } from './pages/LoginPage';
import { HomePage, type Cliente } from './pages/HomePage';
import { MtcPage } from './pages/MtcPage';
import { IridologiaPage } from './pages/IridologiaPage';
import { HistoricoPage } from './pages/HistoricoPage';
import { FloraisPage } from './pages/FloraisPage';
import { CadastrosPage } from './pages/CadastrosPage';

type Page = 'home' | 'mtc' | 'iridologia' | 'historico' | 'florais' | 'cadastros';

export function App() {
  const [authStatus, setAuthStatus] = useState<{ configured: boolean; unlocked: boolean } | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const checkAuth = async () => {
    const status = await api<{ configured: boolean; unlocked: boolean }>('/api/auth/status');
    setAuthStatus(status);
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  if (!authStatus) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;
  }

  if (!authStatus.unlocked) {
    return <LoginPage configured={authStatus.configured} onUnlocked={() => void checkAuth()} />;
  }

  const handleLock = async () => {
    await api('/api/auth/lock', { method: 'POST' });
    await checkAuth();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Acupuntura & Iridologia</h1>
          <span>Prontuário Clínico LGPD</span>
        </div>

        <button type="button" className={`nav-btn ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>
          <Home size={17} /> Home & Agenda
        </button>
        <button type="button" className={`nav-btn ${page === 'mtc' ? 'active' : ''}`} onClick={() => setPage('mtc')}>
          <Activity size={17} /> MTC & Técnicas
        </button>
        <button type="button" className={`nav-btn ${page === 'iridologia' ? 'active' : ''}`} onClick={() => setPage('iridologia')}>
          <Eye size={17} /> Iridologia
        </button>
        <button type="button" className={`nav-btn ${page === 'historico' ? 'active' : ''}`} onClick={() => setPage('historico')}>
          <ClipboardList size={17} /> Histórico
        </button>
        <button type="button" className={`nav-btn ${page === 'florais' ? 'active' : ''}`} onClick={() => setPage('florais')}>
          <Flower2 size={17} /> Florais
        </button>
        <button type="button" className={`nav-btn ${page === 'cadastros' ? 'active' : ''}`} onClick={() => setPage('cadastros')}>
          <Database size={17} /> Cadastros
        </button>

        <div className="sidebar-footer">
          <a href="/api/backup/export" className="nav-btn" style={{ textDecoration: 'none' }}>
            <Download size={16} /> Exportar Backup (.db)
          </a>
          <button type="button" className="nav-btn" onClick={() => void handleLock()}>
            <Lock size={16} /> Bloquear Sessão
          </button>
        </div>
      </aside>

      <main className="main-content">
        {page === 'home' && (
          <HomePage
            selectedCliente={selectedCliente}
            onSelectCliente={setSelectedCliente}
            onNavigate={(target) => setPage(target)}
            onStartAtendimento={(c) => {
              setSelectedCliente(c);
              setPage('historico');
            }}
          />
        )}
        {page === 'mtc' && <MtcPage />}
        {page === 'iridologia' && <IridologiaPage />}
        {page === 'historico' && <HistoricoPage selectedCliente={selectedCliente} />}
        {page === 'florais' && <FloraisPage />}
        {page === 'cadastros' && <CadastrosPage />}
      </main>
    </div>
  );
}
