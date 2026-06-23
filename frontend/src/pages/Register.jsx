import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organization_name: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <span style={{ fontWeight: 800, fontSize: 18 }}>NetOps Monitor</span>
        </div>
        <div className="auth-title">Create your account</div>
        <div className="auth-sub">Start monitoring in minutes — free for up to 10 monitors</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="organization_name">Organization name</label>
            <input
              id="organization_name"
              className="form-input"
              value={form.organization_name}
              onChange={(e) => update('organization_name', e.target.value)}
              placeholder="Acme Pvt Ltd"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Your name</label>
            <input
              id="name"
              className="form-input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="At least 10 characters"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password_confirmation">Confirm password</label>
              <input
                id="password_confirmation"
                type="password"
                className="form-input"
                value={form.password_confirmation}
                onChange={(e) => update('password_confirmation', e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" style={{ color: 'var(--chakra-400)', fontWeight: 600 }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
