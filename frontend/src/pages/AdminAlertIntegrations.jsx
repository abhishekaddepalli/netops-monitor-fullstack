import { useEffect, useState, useCallback } from 'react';
import { Save, Plug, MessageSquare, Send, Mail, Radio, Sparkles, HelpCircle, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { apiClient, apiErrorMessage } from '../api/client';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function AdminAlertIntegrations() {
  const toast = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [detectingTelegram, setDetectingTelegram] = useState(false);
  const [testingMonthly, setTestingMonthly] = useState(false);

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
      const payload = {
        ...settings,
        test_email: settings.smtp_test_email || user?.email,
        test_whatsapp_to: settings.whatsapp_test_phone || '918121886213',
        test_chat_id: settings.telegram_test_chat_id,
      };
      const res = await apiClient.post(`/v1/admin/integrations/test/${provider}`, payload);
      toast.success(res.data?.message || `${provider} connection tested successfully! Alert sent.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, `Failed to test ${provider} connection.`));
    }
  }

  async function handleAutoDetectTelegram() {
    if (!settings.telegram_bot_token) {
      toast.error('Please enter your Telegram Bot Token first.');
      return;
    }
    setDetectingTelegram(true);
    try {
      toast.info('Querying Telegram Bot API for incoming messages...');
      const res = await apiClient.post('/v1/admin/integrations/telegram/detect-chat', {
        telegram_bot_token: settings.telegram_bot_token
      });
      if (res.data?.ok) {
        setSettings(s => ({ ...s, telegram_test_chat_id: res.data.chat_id }));
        toast.success(res.data.message);
      } else {
        toast.warning(res.data?.message || 'No chat found. Open the bot and click START.');
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to detect Telegram chat.'));
    } finally {
      setDetectingTelegram(false);
    }
  }

  async function handleTestMonthlyReport() {
    setTestingMonthly(true);
    try {
      toast.info('Generating and sending monthly performance SLA report...');
      const payload = {
        test_email: settings.smtp_test_email || user?.email,
        ...settings,
      };
      const res = await apiClient.post('/v1/admin/integrations/test-monthly-report', payload);
      toast.success(res.data?.message || 'Monthly report email sent successfully!');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to send monthly report email.'));
    } finally {
      setTestingMonthly(false);
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
      <div className="detail-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="detail-title">Alert Integrations & Gateways</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Configure platform-wide API credentials, SMS gateways, WhatsApp webhooks, and SMTP mail delivery.
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
          <Save size={15} />
          {submitting ? 'Saving…' : 'Save All Configurations'}
        </button>
      </div>

      {/* ── Telegram Bot ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={18} style={{ color: '#38bdf8' }} /> Telegram Bot
            </div>
            <div className="panel-sub">Deliver instant incident alerts to Telegram users, groups, or channels.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              onClick={handleAutoDetectTelegram} 
              disabled={detectingTelegram}
              title="Automatically fetch Chat ID of the user who started this bot"
            >
              <Sparkles size={14} style={{ color: '#38bdf8' }} /> {detectingTelegram ? 'Detecting…' : 'Auto-Detect Chat ID'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => handleTestConnection('telegram')}>
              Test Connection
            </button>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label className="form-label">Telegram Bot Token</label>
            <input
              type="password"
              className="form-input"
              value={settings.telegram_bot_token || ''}
              onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
              placeholder="e.g. 7123456789:AAHxyzYourBotTokenHere"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default / Test Chat ID or Channel ID</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                value={settings.telegram_test_chat_id || ''}
                onChange={(e) => handleChange('telegram_test_chat_id', e.target.value)}
                placeholder="e.g. 812345678 or @my_alert_channel"
              />
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={handleAutoDetectTelegram}
                disabled={detectingTelegram}
                style={{ whiteSpace: 'nowrap' }}
              >
                Auto-Detect
              </button>
            </div>
          </div>

          {/* Quick Setup Guide */}
          <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={15} /> How to configure Telegram:
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li>Open Telegram and message <strong>@BotFather</strong>. Send <code>/newbot</code> to get your Bot Token.</li>
              <li>Open your newly created bot in Telegram and click <strong>START</strong> (or send any text message).</li>
              <li>Click <strong>Auto-Detect Chat ID</strong> above; it will fetch your Chat ID automatically.</li>
              <li>For Channels/Groups: Add your bot as an Administrator to the group/channel, then enter <code>@channel_username</code> or the group ID.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── WhatsApp Gateway ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} style={{ color: '#22c55e' }} /> WhatsApp Gateway (InfiniChat / Wapblaster / Custom API)
            </div>
            <div className="panel-sub">Deliver instant alerts to WhatsApp numbers and group chats.</div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleTestConnection('whatsapp')}>
            Test Connection
          </button>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label className="form-label">API Endpoint URL</label>
            <input
              type="text"
              className="form-input"
              value={settings.wapblaster_url || ''}
              onChange={(e) => handleChange('wapblaster_url', e.target.value)}
              placeholder="https://waba.infiniforge.cloud/api/v1/messages"
            />
          </div>

          <div className="form-group">
            <label className="form-label">API Auth Key / Token</label>
            <input
              type="password"
              className="form-input"
              value={settings.wapblaster_token || ''}
              onChange={(e) => handleChange('wapblaster_token', e.target.value)}
              placeholder="Enter your API token or X-API-Key"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Test Recipient Phone Number (with Country Code)</label>
            <input
              type="text"
              className="form-input"
              value={settings.whatsapp_test_phone || ''}
              onChange={(e) => handleChange('whatsapp_test_phone', e.target.value)}
              placeholder="e.g. 918121886213"
            />
          </div>

          {/* Quick Setup Guide */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 600, color: '#22c55e', fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} /> WhatsApp Gateway Compatibility & Specs:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li><strong>InfiniChat:</strong> Use endpoint <code>https://waba.infiniforge.cloud/api/v1/messages</code>. Headers <code>X-API-Key</code> and <code>Authorization: Bearer</code> are passed automatically.</li>
              <li><strong>Recipient Format:</strong> International format without spaces or symbols (e.g. <code>918121886213</code>).</li>
              <li><strong>JSON Payload:</strong> The system sends <code>{`{ "to": "...", "message": "...", "text": "...", "type": "text" }`}</code> matching all industry gateway standards.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Email (SMTP) ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} style={{ color: '#eab308' }} /> Email (SMTP Server)
            </div>
            <div className="panel-sub">Platform-wide mail server for alert emails, user registration, invoice delivery, and monthly SLA reports.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              onClick={handleTestMonthlyReport}
              disabled={testingMonthly}
              title="Test generating and sending monthly SLA performance report"
            >
              <FileText size={14} /> {testingMonthly ? 'Generating…' : 'Test Monthly Report'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => handleTestConnection('email')}>
              Test Alert Email
            </button>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label className="form-label">SMTP Host</label>
            <input
              type="text"
              className="form-input"
              value={settings.smtp_host || ''}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              placeholder="e.g. s4157.bom1.stableserver.net or smtp.gmail.com"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input
                type="text"
                className="form-input"
                value={settings.smtp_port || ''}
                onChange={(e) => handleChange('smtp_port', e.target.value)}
                placeholder="465 (SSL) or 587 (TLS)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Encryption</label>
              <input
                type="text"
                className="form-input"
                value={settings.smtp_encryption || ''}
                onChange={(e) => handleChange('smtp_encryption', e.target.value)}
                placeholder="ssl or tls"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
            <div className="form-group">
              <label className="form-label">SMTP Username</label>
              <input
                type="text"
                className="form-input"
                value={settings.smtp_username || ''}
                onChange={(e) => handleChange('smtp_username', e.target.value)}
                placeholder="noreply@infiniforge.cloud"
              />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Password</label>
              <input
                type="password"
                className="form-input"
                value={settings.smtp_password || ''}
                onChange={(e) => handleChange('smtp_password', e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
            <div className="form-group">
              <label className="form-label">From Address</label>
              <input
                type="email"
                className="form-input"
                value={settings.smtp_from_address || ''}
                onChange={(e) => handleChange('smtp_from_address', e.target.value)}
                placeholder="noreply@infiniforge.cloud"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Test Recipient Email</label>
              <input
                type="email"
                className="form-input"
                value={settings.smtp_test_email || ''}
                onChange={(e) => handleChange('smtp_test_email', e.target.value)}
                placeholder={user?.email || 'test@example.com'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Pusher (Real-Time Alarms) ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={18} style={{ color: '#a855f7' }} /> Pusher (Real-Time Live Dashboard & Audio Alarms)
            </div>
            <div className="panel-sub">Powers instant WebSocket notifications, live graphs, and popup sound alerts.</div>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
            <div className="form-group">
              <label className="form-label">Pusher App ID</label>
              <input
                type="text"
                className="form-input"
                value={settings.pusher_app_id || ''}
                onChange={(e) => handleChange('pusher_app_id', e.target.value)}
                placeholder="e.g. 1234567"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pusher Cluster</label>
              <input
                type="text"
                className="form-input"
                value={settings.pusher_app_cluster || ''}
                onChange={(e) => handleChange('pusher_app_cluster', e.target.value)}
                placeholder="e.g. ap2 or mt1"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
            <div className="form-group">
              <label className="form-label">Pusher Key</label>
              <input
                type="text"
                className="form-input"
                value={settings.pusher_app_key || ''}
                onChange={(e) => handleChange('pusher_app_key', e.target.value)}
                placeholder="e.g. a1b2c3d4e5f6g7h8i9j0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pusher Secret</label>
              <input
                type="password"
                className="form-input"
                value={settings.pusher_app_secret || ''}
                onChange={(e) => handleChange('pusher_app_secret', e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Twilio & MSG91 SMS ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Twilio SMS</div>
            <div className="panel-sub">Required for sending SMS alerts via Twilio.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleTestConnection('sms')}>
            Test SMS
          </button>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
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
                placeholder="••••••••••••••••"
              />
            </div>
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

      {/* ── MSG91 SMS ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">MSG91 SMS</div>
            <div className="panel-sub">Send SMS alerts across India via MSG91 API.</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">MSG91 Auth Key</label>
            <input
              type="password"
              className="form-input"
              value={settings.msg91_auth_key || ''}
              onChange={(e) => handleChange('msg91_auth_key', e.target.value)}
              placeholder="••••••••••••••••"
            />
          </div>
        </div>
      </div>

      {/* ── Radius API ── */}
      <div className="panel" style={{ marginBottom: 30 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Iconwave Radius</div>
            <div className="panel-sub">Required for authenticating sync requests from Iconwave Radius.</div>
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
    </>
  );
}
