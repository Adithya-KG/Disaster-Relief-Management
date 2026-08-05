import { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { login } from '../api/client';
import { mockCamps } from '../data/mockData';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('dispatcher');
  const [campId, setCampId] = useState(mockCamps[0].id);
  const [email, setEmail] = useState('ops@example.org');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await login({ email, role, campId });
      onLogin(session);
    } catch (loginError) {
      setError(loginError.message || 'Login failed');
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

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div>
            <span className="field-label">Role</span>
            <div className="segmented-control">
              <button
                className={role === 'dispatcher' ? 'selected' : ''}
                onClick={() => setRole('dispatcher')}
                type="button"
              >
                Dispatcher
              </button>
              <button
                className={role === 'camp_manager' ? 'selected' : ''}
                onClick={() => setRole('camp_manager')}
                type="button"
              >
                Camp Manager
              </button>
            </div>
          </div>

          {role === 'camp_manager' ? (
            <label>
              Camp
              <select value={campId} onChange={(event) => setCampId(event.target.value)}>
                {mockCamps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-action" disabled={isSubmitting} type="submit">
            <LogIn size={17} aria-hidden="true" />
            {isSubmitting ? 'Signing in' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
