import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/api';

export default function LoginPage({ onLoginSuccess, onShowSignup, toast }) {
  const { login } = useAuth();
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const user = await login(form);

      // Check if user role matches selected role
      if (role === 'admin' && user.role !== 'ADMIN') {
        setError('This account is not an admin account. Please log in as a regular user.');
        setBusy(false);
        return;
      }

      if (role === 'user' && user.role === 'ADMIN') {
        setError('This is an admin account. Please select "Admin Login" to continue.');
        setBusy(false);
        return;
      }

      toast(`Welcome back, ${user.name || 'user'}!`);
      onLoginSuccess();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>🚀 Shiplist</h1>
          <p className="auth-tagline">
            {role === 'admin' ? 'Admin Console' : 'Feature Request Portal'}
          </p>
        </div>

        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === 'user' ? 'active' : ''}`}
            onClick={() => {
              setRole('user');
              setError('');
            }}
          >
            👤 Regular User
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setRole('admin');
              setError('');
            }}
          >
            👨‍💼 Admin Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              disabled={busy}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button type="button" onClick={onShowSignup} className="link-btn">
              Create one
            </button>
          </p>
          <p className="demo-info">
            Demo credentials:
            <br />
            User: alice@example.com / Alice1234!
            <br />
            Admin: admin@shiplist.dev / Admin1234!
          </p>
        </div>
      </div>
    </div>
  );
}