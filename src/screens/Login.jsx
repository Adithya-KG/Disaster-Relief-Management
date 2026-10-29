import { useState } from 'react';
import { KeyRound, LogIn, ShieldCheck, UserCheck } from 'lucide-react';
import { login } from '../api/client';
import { mockCamps } from '../data/mockData';

const DEMO_ACCOUNTS = [
  {
    label: 'Dispatcher',
    email: 'dispatcher@reliefops.org',
    password: 'admin123',
    role: 'dispatcher',
    desc: 'Regional ops & truck dispatch',
  },
  {
    label: 'East Ridge Mgr',
    email: 'maya@eastridge.org',
    password: 'camp123',
    role: 'camp_manager',
    campId: 'camp-east-ridge',
    desc: 'Camp stock & urgent requests',
  },
  {
    label: 'Riverbend Mgr',
    email: 'omar@riverbend.org',
    password: 'camp123',
    role: 'camp_manager',
    campId: 'camp-riverbend',
    desc: 'Riverbend shelter manager',
  },
];

export default function Login({ onLogin }) {
  const [role, setRole] = useState('dispatcher');
  const [campId, setCampId] = useState(mockCamps[0].id);
  const [email, setEmail] = useState('dispatcher@reliefops.org');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectDemoAccount(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
    setRole(acc.role);
    if (acc.campId) setCampId(acc.campId);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await login({ email, password, role, campId });
      onLogin(session);
    } catch (loginError) {
      setError(loginError.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-block login-brand">
          <div className="brand-mark">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div>
            <strong>ReliefOps</strong>
            <span>Disaster Relief & Resource Distribution</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={14} /> Quick Demo Accounts
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className={email === acc.email ? 'button selected' : 'button'}
                style={{
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: email === acc.email ? '1px solid var(--accent, #3b82f6)' : '1px solid var(--border)',
                  background: email === acc.email ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-2)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onClick={() => selectDemoAccount(acc)}
              >
                <strong>{acc.label}</strong>
              </button>
            ))}
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-action" disabled={isSubmitting} type="submit" style={{ marginTop: '8px' }}>
            <LogIn size={17} aria-hidden="true" />
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  );
}
