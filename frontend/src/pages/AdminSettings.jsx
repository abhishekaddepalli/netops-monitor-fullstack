import { useEffect, useState, useRef } from 'react';
import { Settings, Image as ImageIcon } from 'lucide-react';
import { apiErrorMessage, apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function AdminSettings() {
  const toast = useToast();
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
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef();
  const faviconInputRef = useRef();

  useEffect(() => {
    apiClient.get('/v1/admin/settings').then(({ data }) => {
      setSettings((s) => ({ ...s, ...data }));
    }).catch((err) => toast.error(apiErrorMessage(err)));
  }, [toast]);

  async function handleSave(e) {
    e.preventDefault();
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

      // Use POST with _method=PATCH for Laravel to parse FormData correctly
      fd.append('_method', 'PATCH');

      const { data } = await apiClient.post('/v1/admin/settings', fd);
      
      setSettings((s) => ({ ...s, ...data }));
      setLogoFile(null);
      setFaviconFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';

      toast.success('Settings updated successfully. Refresh to see changes across the app.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">Whitelabel & Global Settings</div>
      </div>

      <div className="panel" style={{ maxWidth: 800 }}>
        <div className="panel-head">
          <div className="panel-title">Brand Appearance</div>
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
            
            <div className="form-group">
              <label className="form-label">App Logo</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(settings.app_logo || logoFile) && (
                  <img 
                    src={logoFile ? URL.createObjectURL(logoFile) : settings.app_logo} 
                    alt="Logo" 
                    style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 4, background: 'var(--navy-800)' }} 
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  onChange={(e) => setLogoFile(e.target.files[0])}
                  style={{ flex: 1, color: 'var(--white-60)' }}
                />
              </div>
              {!logoFile && (
                <input
                  className="form-input"
                  style={{ marginTop: 8 }}
                  placeholder="Or paste a URL: https://example.com/logo.png"
                  value={settings.app_logo || ''}
                  onChange={(e) => setSettings({ ...settings, app_logo: e.target.value })}
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">App Favicon</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(settings.app_favicon || faviconFile) && (
                  <img 
                    src={faviconFile ? URL.createObjectURL(faviconFile) : settings.app_favicon} 
                    alt="Favicon" 
                    style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4, background: 'var(--navy-800)' }} 
                  />
                )}
                <input
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  ref={faviconInputRef}
                  onChange={(e) => setFaviconFile(e.target.files[0])}
                  style={{ flex: 1, color: 'var(--white-60)' }}
                />
              </div>
              {!faviconFile && (
                <input
                  className="form-input"
                  style={{ marginTop: 8 }}
                  placeholder="Or paste a URL: https://example.com/favicon.png"
                  value={settings.app_favicon || ''}
                  onChange={(e) => setSettings({ ...settings, app_favicon: e.target.value })}
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Primary Color (Hex)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.primary_color || '#2E4FA3'}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="#2E4FA3"
                  value={settings.primary_color || ''}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Custom CSS</label>
              <textarea
                className="form-input"
                style={{ fontFamily: 'monospace', minHeight: 120 }}
                placeholder=":root { --primary-color: #ff0000; }"
                value={settings.custom_css || ''}
                onChange={(e) => setSettings({ ...settings, custom_css: e.target.value })}
              />
              <div className="form-hint">Injects custom CSS globally for deeper whitelabeling.</div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

            <div className="panel-title" style={{ fontSize: 16, marginBottom: -4 }}>Localization & Time</div>

            <div className="form-group">
              <label className="form-label">Global Timezone</label>
              <select
                className="form-select"
                value={settings.timezone || 'UTC'}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              >
                <option value="UTC">UTC (Default)</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Time Format</label>
              <select
                className="form-select"
                value={settings.time_format || '24h'}
                onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
              >
                <option value="24h">24-hour (e.g. 14:30)</option>
                <option value="12h">12-hour (e.g. 02:30 PM)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <Settings size={16} style={{ marginRight: 6 }} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 800, marginTop: 24 }}>
        <div className="panel-head">
          <div className="panel-title">Company & Billing Info</div>
        </div>
        <div className="panel-body">
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                className="form-input"
                placeholder="Infiniforge Inc."
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Company Address</label>
              <textarea
                className="form-input"
                placeholder="123 Tech Street..."
                value={settings.company_address || ''}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">GST / Tax ID</label>
                <input
                  className="form-input"
                  placeholder="22AAAAA0000A1Z5"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <Settings size={16} style={{ marginRight: 6 }} />
                {saving ? 'Saving...' : 'Save Company Info'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 800, marginTop: 24 }}>
        <div className="panel-head">
          <div className="panel-title">Super Admin Profile</div>
          <div className="panel-sub">Change your personal admin credentials</div>
        </div>
        <div className="panel-body">
          <SuperAdminProfileForm />
        </div>
      </div>

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
    // Fetch current user from auth context or api
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
      toast.success('Profile updated successfully.');
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
        <label className="form-label">Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">New Password (optional)</label>
          <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input type="password" className="form-input" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update Profile'}
        </button>
      </div>
    </form>
  );
}
