import { useEffect, useState, useRef } from 'react';
import { Settings, Image as ImageIcon, Shield, Key, Copy, Check, Eye, EyeOff, Globe, CreditCard, Lock, HelpCircle, ExternalLink, Smartphone, Sparkles, Upload, SmartphoneNfc } from 'lucide-react';
import { apiErrorMessage, apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function AdminSettings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('brand'); // 'brand', 'google', 'payments', 'security', 'pwa', 'profile'
  
  const [settings, setSettings] = useState({
    app_name: '',
    app_logo: '',
    app_favicon: '',
    primary_color: '',
    custom_css: '',
    timezone: 'UTC',
    time_format: '24h',
    company_name: '',
    company_address: '',
    company_gst: '',
    invoice_prefix: 'INV-',
    // Google OAuth
    google_oauth_enabled: false,
    google_client_id: '',
    google_client_secret: '',
    google_redirect_uri: '',
    default_google_redirect_uri: '',
    // Payment Gateways
    razorpay_key: '',
    razorpay_secret: '',
    stripe_key: '',
    stripe_secret: '',
    upi_id: '',
    upi_qr_url: '',
    // Security
    enforce_2fa: false,
    log_retention_days: 90,
    // PWA & Mobile App
    pwa_name: '',
    pwa_short_name: '',
    pwa_description: '',
    pwa_theme_color: '#2E4FA3',
    pwa_background_color: '#0F172A',
    pwa_display: 'standalone',
    pwa_orientation: 'any',
    pwa_install_prompt_enabled: true,
    pwa_icon_192: '',
    pwa_icon_512: '',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [icon192File, setIcon192File] = useState(null);
  const [icon512File, setIcon512File] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  const logoInputRef = useRef();
  const faviconInputRef = useRef();
  const icon192InputRef = useRef();
  const icon512InputRef = useRef();

  useEffect(() => {
    apiClient.get('/v1/admin/settings')
      .then(({ data }) => {
        setSettings((s) => ({ ...s, ...data }));
      })
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, [toast]);

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('app_name', settings.app_name || '');
      fd.append('primary_color', settings.primary_color || '');
      fd.append('custom_css', settings.custom_css || '');
      fd.append('timezone', settings.timezone || 'UTC');
      fd.append('time_format', settings.time_format || '24h');
      fd.append('company_name', settings.company_name || '');
      fd.append('company_address', settings.company_address || '');
      fd.append('company_gst', settings.company_gst || '');
      fd.append('invoice_prefix', settings.invoice_prefix || 'INV-');
      
      // Google OAuth
      fd.append('google_oauth_enabled', settings.google_oauth_enabled ? '1' : '0');
      fd.append('google_client_id', settings.google_client_id || '');
      fd.append('google_client_secret', settings.google_client_secret || '');
      if (settings.google_redirect_uri) {
        fd.append('google_redirect_uri', settings.google_redirect_uri);
      }

      // Payments
      fd.append('razorpay_key', settings.razorpay_key || '');
      fd.append('razorpay_secret', settings.razorpay_secret || '');
      fd.append('stripe_key', settings.stripe_key || '');
      fd.append('stripe_secret', settings.stripe_secret || '');
      fd.append('upi_id', settings.upi_id || '');
      fd.append('upi_qr_url', settings.upi_qr_url || '');

      // Security & Policies
      fd.append('enforce_2fa', settings.enforce_2fa ? '1' : '0');
      fd.append('log_retention_days', settings.log_retention_days || '90');

      if (logoFile) {
        fd.append('app_logo', logoFile);
      } else {
        fd.append('app_logo_url', settings.app_logo || '');
      }

      if (faviconFile) {
        fd.append('app_favicon', faviconFile);
      } else {
        fd.append('app_favicon_url', settings.app_favicon || '');
      }

      // PWA & Mobile App
      fd.append('pwa_name', settings.pwa_name || settings.app_name || '');
      fd.append('pwa_short_name', settings.pwa_short_name || '');
      fd.append('pwa_description', settings.pwa_description || '');
      fd.append('pwa_theme_color', settings.pwa_theme_color || settings.primary_color || '#2E4FA3');
      fd.append('pwa_background_color', settings.pwa_background_color || '#0F172A');
      fd.append('pwa_display', settings.pwa_display || 'standalone');
      fd.append('pwa_orientation', settings.pwa_orientation || 'any');
      fd.append('pwa_install_prompt_enabled', settings.pwa_install_prompt_enabled ? '1' : '0');

      if (icon192File) {
        fd.append('pwa_icon_192', icon192File);
      } else if (settings.pwa_icon_192) {
        fd.append('pwa_icon_192_url', settings.pwa_icon_192);
      }

      if (icon512File) {
        fd.append('pwa_icon_512', icon512File);
      } else if (settings.pwa_icon_512) {
        fd.append('pwa_icon_512_url', settings.pwa_icon_512);
      }

      fd.append('_method', 'PATCH');

      const { data } = await apiClient.post('/v1/admin/settings', fd);
      
      setSettings((s) => ({ ...s, ...data }));
      setLogoFile(null);
      setFaviconFile(null);
      setIcon192File(null);
      setIcon512File(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';
      if (icon192InputRef.current) icon192InputRef.current.value = '';
      if (icon512InputRef.current) icon512InputRef.current.value = '';

      toast.success('Platform settings updated successfully.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  }

  const effectiveRedirectUri = settings.google_redirect_uri || settings.default_google_redirect_uri || `${window.location.origin}/api/v1/auth/google/callback`;

  function copyRedirectUri() {
    navigator.clipboard.writeText(effectiveRedirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
    toast.success('Authorized Redirect URI copied to clipboard.');
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Super Admin Platform Settings</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Configure system appearance, Google Social sign-in, payment gateways, and security policies.</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Settings size={16} /> {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--navy-border)', paddingBottom: 12, overflowX: 'auto' }} className="hide-scrollbar">
        <button 
          className={`btn btn-sm ${activeTab === 'brand' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('brand')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <ImageIcon size={15} /> Brand & Whitelabel
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'google' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('google')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Globe size={15} /> Google Social Login
          {settings.google_oauth_enabled && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
          )}
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'payments' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('payments')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <CreditCard size={15} /> Payment Gateways & Invoicing
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('security')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Shield size={15} /> Security & 2FA Policies
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'pwa' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('pwa')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Smartphone size={15} /> PWA & Mobile App
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Lock size={15} /> Admin Credentials
        </button>
      </div>

      {/* ──────────────── TAB 1: Brand & Whitelabel ──────────────── */}
      {activeTab === 'brand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Brand Appearance & Customization</div>
                <div className="panel-sub">Customize the look, name, and styling of your monitoring platform</div>
              </div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Application Name</label>
                  <input
                    className="form-input"
                    placeholder="NetOps Monitor"
                    value={settings.app_name || ''}
                    onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">App Logo (PNG/SVG/WebP)</label>
                    <input
                      type="file"
                      ref={logoInputRef}
                      className="form-input"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files[0])}
                    />
                    {settings.app_logo && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={settings.app_logo} alt="Logo preview" style={{ height: 28, borderRadius: 4, background: '#1e293b', padding: 2 }} />
                        <span style={{ fontSize: 12, color: 'var(--white-60)' }}>Current Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">App Favicon (.ico / .png / .svg)</label>
                    <input
                      type="file"
                      ref={faviconInputRef}
                      className="form-input"
                      accept="image/*"
                      onChange={(e) => setFaviconFile(e.target.files[0])}
                    />
                    {settings.app_favicon && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={settings.app_favicon} alt="Favicon preview" style={{ height: 20, width: 20 }} />
                        <span style={{ fontSize: 12, color: 'var(--white-60)' }}>Current Favicon</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Primary Brand Accent Color</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={settings.primary_color || '#2E4FA3'}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                        style={{ width: 44, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        className="form-input"
                        placeholder="#2E4FA3"
                        value={settings.primary_color || ''}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Default Timezone</label>
                    <select
                      className="form-select"
                      value={settings.timezone || 'UTC'}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    >
                      <option value="UTC">UTC (Default)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Europe/Paris">Europe/Paris (CET)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom CSS Overrides (optional)</label>
                  <textarea
                    className="form-input"
                    placeholder="/* Custom CSS variables or rules */"
                    rows={4}
                    value={settings.custom_css || ''}
                    onChange={(e) => setSettings({ ...settings, custom_css: e.target.value })}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: Google Social Login ──────────────── */}
      {activeTab === 'google' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
          <div className="panel" style={{ borderLeft: '4px solid #4285F4' }}>
            <div className="panel-head">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Google Social Login Integration
                  </div>
                  <div className="panel-sub">Allow users and administrators to sign in and register with their Google Workspace or Gmail account</div>
                </div>
                <div>
                  <span className={`pill ${settings.google_oauth_enabled ? 'pill-up' : 'pill-paused'}`}>
                    {settings.google_oauth_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Toggle Enable */}
                <div style={{ background: 'var(--navy-900)', border: '1px solid var(--navy-border)', padding: 16, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Enable "Sign in with Google"</div>
                    <div style={{ color: 'var(--white-60)', fontSize: 13, marginTop: 4 }}>
                      Displays the one-click Google Sign-in button on Login and Sign-up pages.
                    </div>
                  </div>
                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 26 }}>
                    <input 
                      type="checkbox" 
                      checked={!!settings.google_oauth_enabled}
                      onChange={(e) => setSettings({ ...settings, google_oauth_enabled: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span 
                      style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: settings.google_oauth_enabled ? '#3b82f6' : 'var(--navy-600)',
                        borderRadius: 34, transition: '.3s',
                      }}
                    >
                      <span 
                        style={{
                          position: 'absolute', content: '""', height: 20, width: 20, left: settings.google_oauth_enabled ? 24 : 3, bottom: 3,
                          backgroundColor: 'white', borderRadius: '50%', transition: '.3s',
                        }} 
                      />
                    </span>
                  </label>
                </div>

                {/* Client ID */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Google Client ID <span style={{ color: '#f87171' }}>*</span></span>
                    <span style={{ fontSize: 12, color: 'var(--white-40)' }}>Ends with .apps.googleusercontent.com</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com"
                    value={settings.google_client_id || ''}
                    onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>

                {/* Client Secret */}
                <div className="form-group">
                  <label className="form-label">
                    Google Client Secret <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      className="form-input"
                      placeholder="GOCSPX-..."
                      value={settings.google_client_secret || ''}
                      onChange={(e) => setSettings({ ...settings, google_client_secret: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: 13, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none' }}
                      title={showSecret ? 'Hide Secret' : 'Show Secret'}
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Authorized Redirect URI */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Authorized Redirect URI (Copy to Google Cloud Console)</span>
                    <span style={{ fontSize: 12, color: '#38bdf8' }}>Exact Match Required</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      readOnly
                      className="form-input"
                      value={effectiveRedirectUri}
                      style={{ background: 'var(--navy-900)', fontFamily: 'monospace', fontSize: 13, color: '#38bdf8' }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={copyRedirectUri}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {copiedUri ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      {copiedUri ? 'Copied' : 'Copy URI'}
                    </button>
                  </div>
                </div>

                {/* Instructions Box */}
                <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: 18, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                    <HelpCircle size={16} /> How to configure Google Cloud OAuth Credentials
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--white-80)', fontSize: 13, lineHeight: 1.7 }}>
                    <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>Google Cloud Console &rarr; Credentials <ExternalLink size={12} style={{ display: 'inline' }} /></a>.</li>
                    <li>Click <strong>Create Credentials &rarr; OAuth client ID</strong>.</li>
                    <li>Select Application type: <strong>Web application</strong>.</li>
                    <li>In <strong>Authorized JavaScript origins</strong>, add: <code style={{ color: '#38bdf8', background: 'var(--navy-900)', padding: '2px 6px', borderRadius: 4 }}>{window.location.origin}</code></li>
                    <li>In <strong>Authorized redirect URIs</strong>, paste the exact URI above: <code style={{ color: '#38bdf8', background: 'var(--navy-900)', padding: '2px 6px', borderRadius: 4 }}>{effectiveRedirectUri}</code></li>
                    <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields above and click <strong>Save Settings</strong>.</li>
                  </ol>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: Payment Gateways & Invoicing ──────────────── */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
          {/* Razorpay Gateway */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Razorpay Payment Gateway</div>
              <div className="panel-sub">Indian UPI, NetBanking, Credit/Debit cards auto-capture for subscriptions</div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Razorpay Key ID</label>
                  <input
                    className="form-input"
                    placeholder="rzp_live_... or rzp_test_..."
                    value={settings.razorpay_key || ''}
                    onChange={(e) => setSettings({ ...settings, razorpay_key: e.target.value })}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Razorpay Key Secret</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRzpSecret ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter secret..."
                      value={settings.razorpay_secret || ''}
                      onChange={(e) => setSettings({ ...settings, razorpay_secret: e.target.value })}
                      style={{ fontFamily: 'monospace', paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setShowRzpSecret(!showRzpSecret)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none' }}
                    >
                      {showRzpSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Stripe Gateway */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Stripe Payment Gateway</div>
              <div className="panel-sub">International credit card processing for SaaS tenants</div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Stripe Publishable Key</label>
                  <input
                    className="form-input"
                    placeholder="pk_live_... or pk_test_..."
                    value={settings.stripe_key || ''}
                    onChange={(e) => setSettings({ ...settings, stripe_key: e.target.value })}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stripe Secret Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="sk_live_... or sk_test_..."
                    value={settings.stripe_secret || ''}
                    onChange={(e) => setSettings({ ...settings, stripe_secret: e.target.value })}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Manual UPI & QR */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Manual UPI & Direct QR Transfer</div>
              <div className="panel-sub">Allow Indian clients to pay directly via UPI app and submit UTR transaction receipt</div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Business UPI VPA / ID</label>
                  <input
                    className="form-input"
                    placeholder="merchant@icici or billing@upi"
                    value={settings.upi_id || ''}
                    onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI QR Code Image URL</label>
                  <input
                    className="form-input"
                    placeholder="https://yourdomain.com/storage/qr.png"
                    value={settings.upi_qr_url || ''}
                    onChange={(e) => setSettings({ ...settings, upi_qr_url: e.target.value })}
                  />
                  {settings.upi_qr_url && (
                    <div style={{ marginTop: 10 }}>
                      <img src={settings.upi_qr_url} alt="UPI QR" style={{ width: 120, height: 120, borderRadius: 8, background: '#fff', padding: 6 }} />
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Invoicing & Company Details */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Legal Entity & Invoice Details</div>
              <div className="panel-sub">Printed on generated PDF invoices and subscriber receipts</div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Legal Company Name</label>
                  <input
                    className="form-input"
                    placeholder="Infiniforge Technologies Pvt Ltd"
                    value={settings.company_name || ''}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registered Office Address</label>
                  <textarea
                    className="form-input"
                    placeholder="Tower B, Tech Park, Bangalore..."
                    rows={2}
                    value={settings.company_address || ''}
                    onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">GST / Tax Identification Number</label>
                    <input
                      className="form-input"
                      placeholder="29AAAAA0000A1Z5"
                      value={settings.company_gst || ''}
                      onChange={(e) => setSettings({ ...settings, company_gst: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Prefix</label>
                    <input
                      className="form-input"
                      placeholder="INV-"
                      value={settings.invoice_prefix || 'INV-'}
                      onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 4: Security & Policies ──────────────── */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Platform Security & Authentication Policies</div>
              <div className="panel-sub">Control authentication strictness and retention periods</div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 2FA Policy */}
                <div style={{ background: 'var(--navy-900)', border: '1px solid var(--navy-border)', padding: 16, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Enforce 2FA for Super Administrators</div>
                    <div style={{ color: 'var(--white-60)', fontSize: 13, marginTop: 4 }}>
                      Requires all super admins to have Two-Factor Authentication active to access the administrative dashboard.
                    </div>
                  </div>
                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 26 }}>
                    <input 
                      type="checkbox" 
                      checked={!!settings.enforce_2fa}
                      onChange={(e) => setSettings({ ...settings, enforce_2fa: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span 
                      style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: settings.enforce_2fa ? '#3b82f6' : 'var(--navy-600)',
                        borderRadius: 34, transition: '.3s',
                      }}
                    >
                      <span 
                        style={{
                          position: 'absolute', content: '""', height: 20, width: 20, left: settings.enforce_2fa ? 24 : 3, bottom: 3,
                          backgroundColor: 'white', borderRadius: '50%', transition: '.3s',
                        }} 
                      />
                    </span>
                  </label>
                </div>

                {/* Audit Log Retention */}
                <div className="form-group">
                  <label className="form-label">Audit & Incident Log Retention Period</label>
                  <select
                    className="form-select"
                    value={settings.log_retention_days || 90}
                    onChange={(e) => setSettings({ ...settings, log_retention_days: parseInt(e.target.value) })}
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days (Recommended)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB: PWA & Mobile App ──────────────── */}
      {activeTab === 'pwa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Smartphone color="#38bdf8" /> Progressive Web App (PWA) Customization
                </div>
                <div className="panel-sub">
                  Configure installable mobile & desktop app branding, launcher icons, splash screen, and display behavior
                </div>
              </div>
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)', gap: 32, alignItems: 'start' }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Enable Install Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--white-90)' }}>Enable PWA Installation</div>
                      <div style={{ fontSize: 12, color: 'var(--white-60)' }}>
                        Allows mobile browsers (Chrome, Safari, Edge) to show the "Install App" prompt.
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                      checked={settings.pwa_install_prompt_enabled}
                      onChange={(e) => setSettings({ ...settings, pwa_install_prompt_enabled: e.target.checked })}
                    />
                  </div>

                  {/* App Full & Short Name */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Application Full Name</label>
                      <input 
                        className="form-input" 
                        value={settings.pwa_name || settings.app_name || ''} 
                        onChange={(e) => setSettings({ ...settings, pwa_name: e.target.value })}
                        placeholder="e.g. NetOps Monitor" 
                      />
                      <span style={{ fontSize: 11, color: 'var(--white-50)' }}>Shown on app launch & splash screen</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Short Name (Home Screen Label)</label>
                      <input 
                        className="form-input" 
                        value={settings.pwa_short_name || ''} 
                        onChange={(e) => setSettings({ ...settings, pwa_short_name: e.target.value })}
                        placeholder="e.g. NetOps" 
                      />
                      <span style={{ fontSize: 11, color: 'var(--white-50)' }}>Max 12 chars for launcher icon label</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">Application Description</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      value={settings.pwa_description || ''} 
                      onChange={(e) => setSettings({ ...settings, pwa_description: e.target.value })}
                      placeholder="High-performance network operations and real-time uptime monitoring platform." 
                    />
                  </div>

                  {/* Colors */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Theme Color (Status Bar)</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input 
                          type="color" 
                          value={settings.pwa_theme_color || '#2E4FA3'} 
                          onChange={(e) => setSettings({ ...settings, pwa_theme_color: e.target.value })}
                          style={{ width: 38, height: 38, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input 
                          className="form-input" 
                          value={settings.pwa_theme_color || '#2E4FA3'} 
                          onChange={(e) => setSettings({ ...settings, pwa_theme_color: e.target.value })}
                          placeholder="#2E4FA3" 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Splash Background Color</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input 
                          type="color" 
                          value={settings.pwa_background_color || '#0F172A'} 
                          onChange={(e) => setSettings({ ...settings, pwa_background_color: e.target.value })}
                          style={{ width: 38, height: 38, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input 
                          className="form-input" 
                          value={settings.pwa_background_color || '#0F172A'} 
                          onChange={(e) => setSettings({ ...settings, pwa_background_color: e.target.value })}
                          placeholder="#0F172A" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Display & Orientation */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Display Mode</label>
                      <select 
                        className="form-select"
                        value={settings.pwa_display || 'standalone'}
                        onChange={(e) => setSettings({ ...settings, pwa_display: e.target.value })}
                      >
                        <option value="standalone">Standalone (Native App Feel - Recommended)</option>
                        <option value="fullscreen">Fullscreen (Immersive Game/Kiosk)</option>
                        <option value="minimal-ui">Minimal UI (Simplified Controls)</option>
                        <option value="browser">Browser (Standard Tab)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Orientation</label>
                      <select 
                        className="form-select"
                        value={settings.pwa_orientation || 'any'}
                        onChange={(e) => setSettings({ ...settings, pwa_orientation: e.target.value })}
                      >
                        <option value="any">Any (Auto-rotate)</option>
                        <option value="portrait">Portrait Only</option>
                        <option value="landscape">Landscape Only</option>
                      </select>
                    </div>
                  </div>

                  {/* App Icons */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">PWA Icon (192x192 PNG)</label>
                      <input 
                        type="file" 
                        ref={icon192InputRef} 
                        className="form-input" 
                        accept="image/png,image/webp" 
                        onChange={(e) => setIcon192File(e.target.files[0])} 
                      />
                      {settings.pwa_icon_192 && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={settings.pwa_icon_192} alt="192 icon" style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--navy-700)' }} />
                          <span style={{ fontSize: 11, color: 'var(--white-60)' }}>Current 192px icon</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">PWA Splash Icon (512x512 PNG)</label>
                      <input 
                        type="file" 
                        ref={icon512InputRef} 
                        className="form-input" 
                        accept="image/png,image/webp" 
                        onChange={(e) => setIcon512File(e.target.files[0])} 
                      />
                      {settings.pwa_icon_512 && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={settings.pwa_icon_512} alt="512 icon" style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--navy-700)' }} />
                          <span style={{ fontSize: 11, color: 'var(--white-60)' }}>Current 512px icon</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <a 
                      href="/manifest.webmanifest" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <ExternalLink size={14} /> View Dynamic Web Manifest
                    </a>
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                      <Settings size={15} /> {saving ? 'Saving...' : 'Save PWA Settings'}
                    </button>
                  </div>
                </form>

                {/* ── Mobile Phone Live Mockup Preview ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--white-70)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SmartphoneNfc size={14} color="#38bdf8" /> Live Mobile Phone Mockup
                  </div>
                  <div style={{ 
                    width: 270, 
                    height: 520, 
                    borderRadius: 36, 
                    border: '8px solid #1e293b', 
                    background: settings.pwa_background_color || '#0F172A', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Speaker notch */}
                    <div style={{ 
                      width: 90, 
                      height: 18, 
                      background: '#1e293b', 
                      borderRadius: '0 0 12px 12px', 
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}>
                      <div style={{ width: 36, height: 3, borderRadius: 2, background: '#334155' }} />
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} />
                    </div>

                    {/* Status bar */}
                    <div style={{ 
                      padding: '4px 16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: 11, 
                      color: '#ffffff',
                      background: settings.pwa_theme_color || '#2E4FA3'
                    }}>
                      <span>09:41</span>
                      <span>5G 100%</span>
                    </div>

                    {/* App Bar */}
                    <div style={{ 
                      padding: '10px 14px', 
                      background: settings.pwa_theme_color || '#2E4FA3',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ width: 22, height: 22, borderRadius: 4, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {(settings.pwa_icon_192 || settings.app_favicon || settings.app_logo) ? (
                          <img src={settings.pwa_icon_192 || settings.app_favicon || settings.app_logo} alt="App" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 'bold', color: '#2E4FA3' }}>N</span>
                        )}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {settings.pwa_name || settings.app_name || 'NetOps Monitor'}
                      </span>
                    </div>

                    {/* Mockup screen content */}
                    <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#090e17' }}>
                      <div style={{ background: '#111827', borderRadius: 8, padding: 10, border: '1px solid #1f2937' }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>System Health</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981', marginTop: 2 }}>99.98% All Systems Up</div>
                      </div>

                      <div style={{ background: '#111827', borderRadius: 8, padding: 10, border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#e5e7eb' }}>
                          <span>Core Router #1</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>12ms</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#e5e7eb' }}>
                          <span>BGP Gateway</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>18ms</span>
                        </div>
                      </div>

                      {/* Home Screen Icon Card preview */}
                      <div style={{ marginTop: 'auto', background: 'rgba(56, 189, 248, 0.08)', borderRadius: 10, border: '1px dashed rgba(56, 189, 248, 0.3)', padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#38bdf8', marginBottom: 6 }}>Home Screen Launcher Icon</div>
                        <div style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: 10, 
                          background: settings.pwa_theme_color || '#2E4FA3', 
                          margin: '0 auto 4px auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                          overflow: 'hidden'
                        }}>
                          {(settings.pwa_icon_192 || settings.app_favicon || settings.app_logo) ? (
                            <img src={settings.pwa_icon_192 || settings.app_favicon || settings.app_logo} alt="PWA Icon" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          ) : (
                            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 18 }}>N</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#f3f4f6' }}>
                          {settings.pwa_short_name || 'NetOps'}
                        </div>
                      </div>
                    </div>

                    {/* Bottom home bar */}
                    <div style={{ padding: '6px 0', background: '#090e17', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 70, height: 4, borderRadius: 2, background: '#475569' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 5: Admin Profile ──────────────── */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Super Admin Profile Credentials</div>
              <div className="panel-sub">Change your personal super admin account email and password</div>
            </div>
            <div className="panel-body">
              <SuperAdminProfileForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SuperAdminProfileForm() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get('/v1/auth/me').then(({ data }) => {
      setName(data.user?.name || '');
      setEmail(data.user?.email || '');
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password && password !== passwordConfirm) {
      return toast.error("Passwords do not match");
    }
    setSubmitting(true);
    try {
      const payload = { name, email };
      if (password) {
        payload.password = password;
        payload.password_confirmation = passwordConfirm;
      }
      await apiClient.patch('/v1/auth/profile', payload);
      toast.success('Admin profile updated successfully.');
      setPassword('');
      setPasswordConfirm('');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Admin Full Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Admin Email Address</label>
        <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">New Password (leave blank to keep current)</label>
          <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input type="password" className="form-input" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="••••••••" />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Updating Profile...' : 'Save Profile Changes'}
        </button>
      </div>
    </form>
  );
}
