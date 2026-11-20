import { useState } from 'react';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { api } from '../api';

interface LoginPageProps {
  configured: boolean;
  onUnlocked: () => void;
}

export function LoginPage({ configured, onUnlocked }: LoginPageProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.trim().length < 4) {
      setError('O PIN deve ter pelo menos 4 caracteres.');
      return;
    }
    if (!configured && pin !== confirmPin) {
      setError('Os PINs digitados não coincidem.');
      return;
    }
    setLoading(true);
    try {
      if (configured) {
        await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin }) });
      } else {
        await api('/api/auth/setup', { method: 'POST', body: JSON.stringify({ pin }) });
      }
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: 10, borderRadius: 10 }}>
            {configured ? <Lock size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Acupuntura & Iridologia</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {configured ? 'Acesso protegido (LGPD)' : 'Configuração inicial de segurança (LGPD)'}
            </span>
          </div>
        </div>

        {!configured && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--surface-alt)', padding: 10, borderRadius: 8, marginTop: 0 }}>
            Crie seu PIN ou senha de acesso. Todos os dados pessoais e clínicos dos pacientes serão criptografados em disco com AES-256-GCM.
          </p>
        )}

        <div className="field">
          <label>{configured ? 'Digite seu PIN / Senha' : 'Novo PIN / Senha (mín. 4 caracteres)'}</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            autoFocus
          />
        </div>

        {!configured && (
          <div className="field">
            <label>Confirme o PIN / Senha</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="••••"
            />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', background: 'var(--danger-soft)', padding: '8px 10px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }} disabled={loading}>
          <KeyRound size={16} />
          {loading ? 'Processando...' : configured ? 'Entrar no Sistema' : 'Criptografar Banco e Entrar'}
        </button>
      </form>
    </div>
  );
}
