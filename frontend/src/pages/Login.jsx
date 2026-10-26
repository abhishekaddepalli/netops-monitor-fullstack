import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Shield, Key, ArrowLeft } from 'lucide-react';

export default function Login() {
  const { login, verify2Fa } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 2FA Challenge State
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);

  // System Settings (Google OAuth)
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    // Check if error passed via query string (e.g. from Google OAuth callback)
    const queryError = searchParams.get('error');
    if (queryError) {
      setError(decodeURIComponent(queryError));
    }

    // Check if 2fa challenge token passed via query string
    const query2fa = searchParams.get('2fa');
    const queryToken = searchParams.get('token');
    if (query2fa && queryToken) {
      setTwoFactorToken(queryToken);
      setTwoFactorChallenge(true);
    }

    // Fetch public settings for Google OAuth toggle
    apiClient.get('/global-settings')
      .then(({ data }) => {
        if (data && data.google_oauth_enabled) {
          setGoogleEnabled(true);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.twoFactorRequired) {
      setTwoFactorToken(result.twoFactorToken);
      setTwoFactorChallenge(true);
      return;
    }

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  }

  async function handleVerify2Fa(e) {
    e.preventDefault();
    setError('');
    if (!twoFactorCode.trim()) {
      setError(isRecoveryCode ? 'Please enter a recovery code.' : 'Please enter the 6-digit verification code.');
      return;
    }
    setSubmitting(true);
    const result = await verify2Fa(twoFactorToken, twoFactorCode.trim());
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Invalid verification code.');
    }
  }

  function handleGoogleLogin() {
    // Redirect directly to backend Google OAuth redirect endpoint
    window.location.href = '/api/v1/auth/google/redirect';
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <span style={{ fontWeight: 800, fontSize: 18 }}>NetOps Monitor</span>
        </div>

        {twoFactorChallenge ? (
          /* ──────────────── 2FA Challenge View ──────────────── */
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary-400)', marginBottom: 12 }}>
                <Shield size={32} />
              </div>
              <div className="auth-title" style={{ fontSize: 20 }}>Two-Factor Authentication</div>
              <div className="auth-sub" style={{ marginTop: 4 }}>
                {isRecoveryCode 
                  ? 'Enter one of your emergency recovery codes (e.g. xxxx-xxxx).' 
                  : 'Enter the 6-digit code from your authenticator app.'}
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleVerify2Fa}>
              <div className="form-group">
                <label className="form-label">
                  {isRecoveryCode ? 'Recovery Code' : '6-Digit Security Code'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  autoFocus
                  maxLength={isRecoveryCode ? 16 : 8}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(isRecoveryCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
                  placeholder={isRecoveryCode ? 'xxxx-xxxx' : '000000'}
                  style={{
                    fontSize: isRecoveryCode ? 16 : 22,
                    fontWeight: 700,
                    letterSpacing: isRecoveryCode ? 2 : 6,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    padding: '12px',
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !twoFactorCode.trim()}>
                {submitting ? 'Verifying…' : 'Verify & Continue'}
              </button>
            </form>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ fontSize: 13, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setTwoFactorChallenge(false);
                  setTwoFactorCode('');
                  setError('');
                }}
              >
                <ArrowLeft size={14} /> Back to login
              </button>
              
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '6px 10px', color: 'var(--primary-400)' }}
                onClick={() => {
                  setIsRecoveryCode(!isRecoveryCode);
                  setTwoFactorCode('');
                  setError('');
                }}
              >
                {isRecoveryCode ? 'Use Authenticator Code' : 'Use Recovery Code'}
              </button>
            </div>
          </div>
        ) : (
          /* ──────────────── Standard Password Login View ──────────────── */
          <div>
            <div className="auth-title">Welcome back</div>
            <div className="auth-sub">Log in to your monitoring dashboard</div>

            {error && <div className="auth-error">{error}</div>}

            {googleEnabled && (
              <>
                <button
                  type="button"
                  className="btn btn-block"
                  onClick={handleGoogleLogin}
                  style={{
                    background: '#ffffff',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    fontWeight: 600,
                    fontSize: 14,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: 16,
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign in with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: 'var(--white-40)', fontSize: 12 }}>
                  <span style={{ flex: 1, height: 1, background: 'var(--navy-600)' }} />
                  <span style={{ padding: '0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>or email</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--navy-600)' }} />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account? <Link to="/register" style={{ color: 'var(--chakra-400)', fontWeight: 600 }}>Sign up</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
