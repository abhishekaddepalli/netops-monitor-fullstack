import { useEffect, useState, useCallback } from 'react';
import { Save, Plug } from 'lucide-react';
import { apiClient, apiErrorMessage } from '../api/client';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export default function AdminAlertIntegrations() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/admin/integrations');
      setSettings(data || {});
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load integrations.'));
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleTestConnection(provider) {
    try {
      toast.info(`Testing ${provider} connection...`);
      await apiClient.post(`/v1/admin/integrations/test/${provider}`, settings);
      toast.success(`${provider} connection tested successfully! Alert sent.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, `Failed to test ${provider} connection.`));
    }
  }

  const handleChange = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/v1/admin/integrations', settings);
      toast.success('Integrations updated successfully.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to save integrations.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!settings) {
    return <div className="panel-body"><Skeleton height={400} /></div>;
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Alert Integrations</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Configure platform-wide API keys for alert channels</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
          <Save size={15} />
          {submitting ? 'Saving…' : 'Save Config'}
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Iconwave Radius</div>
            <div className="panel-sub">Required for authenticating requests from Iconwave Radius.</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">Radius API Key</label>
            <input
              type="password"
              className="form-input"
              value={settings.radius_api_key || ''}
              onChange={(e) => handleChange('radius_api_key', e.target.value)}
              placeholder="e.g. your-secure-radius-token"
            />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Telegram Bot</div>
            <div className="panel-sub">Required for sending Telegram alerts. Create a bot via BotFather.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTestConnection('telegram')}>Test Connection</button>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">Bot Token</label>
            <input
              type="password"
              className="form-input"
              value={settings.telegram_bot_token || ''}
              onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
              placeholder="123456789:ABCDefGhiJkLmNoPqRsTuVwXyZ"
            />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Twilio SMS</div>
            <div className="panel-sub">Required for sending SMS alerts.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTestConnection('sms')}>Test Connection</button>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label className="form-label">Account SID</label>
            <input
              type="text"
              className="form-input"
              value={settings.twilio_account_sid || ''}
              onChange={(e) => handleChange('twilio_account_sid', e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Auth Token</label>
            <input
              type="password"
              className="form-input"
              value={settings.twilio_auth_token || ''}
              onChange={(e) => handleChange('twilio_auth_token', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Twilio From Number</label>
            <input
              type="text"
              className="form-input"
              value={settings.twilio_sms_from || ''}
              onChange={(e) => handleChange('twilio_sms_from', e.target.value)}
              placeholder="+14155238886"
            />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">WhatsApp (Wapblaster / 3rd Party)</div>
            <div className="panel-sub">Required for WhatsApp alerts via HTTP webhook providers.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTestConnection('whatsapp')}>Test Connection</button>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label className="form-label">API Endpoint URL</label>
            <input
              type="url"
              className="form-input"
              value={settings.wapblaster_url || ''}
              onChange={(e) => handleChange('wapblaster_url', e.target.value)}
              placeholder="https://api.wapblaster.com/v1/messages"
            />
          </div>
          <div className="form-group">
            <label className="form-label">API Auth Token / Key</label>
            <input
              type="password"
              className="form-input"
              value={settings.wapblaster_token || ''}
              onChange={(e) => handleChange('wapblaster_token', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">MSG91 SMS</div>
            <div className="panel-sub">Required for sending SMS alerts via MSG91.</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">Auth Key</label>
            <input
              type="password"
              className="form-input"
              value={settings.msg91_auth_key || ''}
              onChange={(e) => handleChange('msg91_auth_key', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Email (SMTP)</div>
            <div className="panel-sub">Platform-wide mail server configuration for alert emails and system invites.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTestConnection('email')}>Test Connection</button>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label className="form-label">SMTP Host</label>
            <input
              type="text"
              className="form-input"
              value={settings.smtp_host || ''}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              placeholder="smtp.mailgun.org"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input
                type="text"
                className="form-input"
                value={settings.smtp_port || ''}
                onChange={(e) => handleChange('smtp_port', e.target.value)}
                placeholder="587"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Encryption</label>
              <input
                type="text"
                className="form-input"
                value={settings.smtp_encryption || ''}
                onChange={(e) => handleChange('smtp_encryption', e.target.value)}
                placeholder="tls"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">SMTP Username</label>
            <input
              type="text"
              className="form-input"
              value={settings.smtp_username || ''}
              onChange={(e) => handleChange('smtp_username', e.target.value)}
              placeholder="postmaster@yourdomain.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">SMTP Password</label>
            <input
              type="password"
              className="form-input"
              value={settings.smtp_password || ''}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="form-group">
            <label className="form-label">From Address</label>
            <input
              type="email"
              className="form-input"
              value={settings.smtp_from_address || ''}
              onChange={(e) => handleChange('smtp_from_address', e.target.value)}
              placeholder="alerts@yourdomain.com"
            />
          </div>
        </div>
      </div>
    </>
  );
}
