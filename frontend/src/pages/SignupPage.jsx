import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/api';

export default function SignupPage({ onSignupSuccess, onShowLogin, toast }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' or 'verify'
  const [token, setToken] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setBusy(false);
      return;
    }

    try {
      const result = await signup({ name: form.name, email: form.email, password: form.password });
      // After signup, server returns verificationToken
      setToken(result.verificationToken || '');
      setStep('verify');
      toast('Account created! Check your email for the verification token.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1>🚀 Shiplist</h1>
            <p className="auth-tagline">Verify Your Email</p>
          </div>

          <div className="verify-message">
            <p>A verification token has been generated for you.</p>
            {token && (
              <div className="token-display">
                <p className="token-label">Your verification token:</p>
                <code>{token}</code>
                <p className="token-instruction">
                  Use this token to verify your email. You can now log in.
                </p>
              </div>
            )}
            <button
              onClick={onShowLogin}
              className="btn btn-primary"
            >
              Continue to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>🚀 Shiplist</h1>
          <p className="auth-tagline">Create Your Account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
              disabled={busy}
            />
          </div>

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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              disabled={busy}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button type="button" onClick={onShowLogin} className="link-btn">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
