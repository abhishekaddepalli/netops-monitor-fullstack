import { useEffect, useState, useCallback } from 'react';
import { Plus, Plug, Trash2, Send, ExternalLink, Zap, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { alertChannelsApi } from '../api/alertChannels';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const CHANNEL_TYPES = [
  { key: 'email', label: 'Email', field: 'to', placeholder: 'ops@company.com, alerts@company.com' },
  { key: 'slack', label: 'Slack', field: 'webhook_url', placeholder: 'https://hooks.slack.com/services/...' },
  { key: 'telegram', label: 'Telegram', field: 'chat_id', placeholder: 'e.g. 812345678 or -100123456789' },
  { key: 'discord', label: 'Discord', field: 'webhook_url', placeholder: 'https://discord.com/api/webhooks/...' },
  { key: 'teams', label: 'MS Teams', field: 'webhook_url', placeholder: 'https://outlook.office.com/webhook/...' },
  { key: 'webhook', label: 'Webhook', field: 'url', placeholder: 'https://your-endpoint.com/alerts' },
  { key: 'whatsapp', label: 'WhatsApp', field: 'to', placeholder: 'e.g. 919876543210 (with country code)' },
  { key: 'sms', label: 'SMS', field: 'to', placeholder: '91XXXXXXXXXX' },
  { key: 'wirepusher', label: 'WirePusher', field: 'device_id', placeholder: 'Enter Device ID (e.g. j9df82)' },
];

export default function AlertChannels() {
  const toast = useToast();
  const { isOrgAdmin } = useAuth();
  const [channels, setChannels] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await alertChannelsApi.list();
      setChannels(data || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load alert channels.'));
      setChannels([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleTest(channel) {
    setTestingId(channel.id);
    try {
      await alertChannelsApi.test(channel.id);
      toast.success(`Test alert sent via ${channel.name}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Test alert failed.'));
    } finally {
      setTestingId(null);
    }
  }

  async function handleToggleActive(channel) {
    try {
      await alertChannelsApi.update(channel.id, { is_active: !channel.is_active });
      toast.success(`Channel ${channel.is_active ? 'disabled' : 'enabled'}.`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not toggle channel.'));
    }
  }

  async function handleDelete(channel) {
    if (!window.confirm(`Delete channel "${channel.name}"?`)) return;
    try {
      await alertChannelsApi.remove(channel.id);
      toast.success('Channel deleted.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function openEdit(channel) {
    setEditingChannel(channel);
    setShowModal(true);
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Alert Channels</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Manage notification endpoints for your organization. Alerts use platform-level gateways automatically.
          </div>
        </div>
        {isOrgAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditingChannel(null); setShowModal(true); }}>
            <Plus size={15} /> New Channel
          </button>
        )}
      </div>

      <div className="panel">
        {channels === null ? (
          <div className="panel-body"><Skeleton height={180} /></div>
        ) : channels.length === 0 ? (
          <div className="panel-body">
            <EmptyState
              icon={Plug}
              title="No alert channels configured"
              subtitle="Add a Telegram, WhatsApp, or Email channel to get instant outage alerts."
              action={isOrgAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingChannel(null); setShowModal(true); }}>
                  Add channel
                </button>
              )}
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => {
                  const typeDef = CHANNEL_TYPES.find((t) => t.key === c.type);
                  const dest = c.config?.[typeDef?.field || 'to'] || c.config?.webhook_url || c.config?.url || c.config?.chat_id || '—';
                  const destStr = Array.isArray(dest) ? dest.join(', ') : String(dest);
                  return (
                    <tr key={c.id}>
                      <td className="mon-name">{c.name}</td>
                      <td>
                        <span className="tag">{typeDef?.label || c.type}</span>
                      </td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--white-70)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                        {destStr}
                      </td>
                      <td>
                        <span className={`pill ${c.is_active ? 'pill-up' : 'pill-paused'}`}>
                          {c.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions" style={{ opacity: 1 }}>
                          {isOrgAdmin && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(c)}>
                                {c.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                                Edit
                              </button>
                              <button className="icon-btn-sm" onClick={() => handleTest(c)} title="Send test alert" disabled={testingId === c.id}>
                                <Send size={14} />
                              </button>
                              <button className="icon-btn-sm" onClick={() => handleDelete(c)} title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ChannelModal 
          channel={editingChannel}
          onClose={() => setShowModal(false)} 
          onSaved={() => { setShowModal(false); load(); }} 
        />
      )}
    </>
  );
}

function ChannelModal({ channel, onClose, onSaved }) {
  const toast = useToast();
  const [type, setType] = useState(channel ? channel.type : 'telegram');
  const [name, setName] = useState(channel ? channel.name : '');
  
  // Extract initial config value based on type
  const initialValue = () => {
    if (!channel) return '';
    const field = CHANNEL_TYPES.find((t) => t.key === channel.type)?.field;
    if (!field || !channel.config[field]) return '';
    return channel.type === 'email' && Array.isArray(channel.config[field]) 
      ? channel.config[field].join(', ') 
      : channel.config[field];
  };

  const [value, setValue] = useState(initialValue());
  const [submitting, setSubmitting] = useState(false);

  // Telegram auto-detect states
  const [botInfo, setBotInfo] = useState({ configured: false, bot_username: null });
  const [detecting, setDetecting] = useState(false);
  const [detectMessage, setDetectMessage] = useState(null);

  const typeDef = CHANNEL_TYPES.find((t) => t.key === type) || CHANNEL_TYPES[0];

  useEffect(() => {
    if (type === 'telegram') {
      alertChannelsApi.getTelegramBotInfo()
        .then(({ data }) => setBotInfo(data))
        .catch(() => {});
    }
  }, [type]);

  async function handleAutoDetect() {
    setDetecting(true);
    setDetectMessage(null);
    try {
      const { data } = await alertChannelsApi.detectTelegramChat();
      if (data.ok && data.chat_id) {
        setValue(data.chat_id);
        if (!name) setName(`Telegram (${data.chat_name || 'My Chat'})`);
        setDetectMessage({ ok: true, text: `Connected to ${data.chat_name} (Chat ID: ${data.chat_id})!` });
        toast.success(`Chat ID ${data.chat_id} detected!`);
      } else {
        setDetectMessage({ ok: false, text: data.message || 'No recent messages found with the bot.' });
      }
    } catch (err) {
      setDetectMessage({ 
        ok: false, 
        text: apiErrorMessage(err, 'Could not detect chat. Make sure you opened the bot and sent /start.') 
      });
    } finally {
      setDetecting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const config = { 
        [typeDef.field]: type === 'email' 
          ? value.split(',').map((v) => v.trim()).filter(Boolean) 
          : value.trim() 
      };
      
      if (channel) {
        await alertChannelsApi.update(channel.id, { name, config });
        toast.success('Alert channel updated.');
      } else {
        await alertChannelsApi.create({ name, type, config });
        toast.success('Alert channel created.');
      }
      onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error, `Could not ${channel ? 'update' : 'create'} channel.`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={channel ? "Edit Alert Channel" : "New Alert Channel"} onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name || !value}>
          {submitting ? 'Saving…' : 'Save Channel'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Channel type</label>
          {channel ? (
            <div style={{ padding: '8px 12px', background: 'var(--navy-900)', borderRadius: '6px', color: 'var(--white-80)', fontWeight: '500' }}>
              {typeDef?.label || channel.type}
            </div>
          ) : (
            <div className="tab-row" style={{ flexWrap: 'wrap' }}>
              {CHANNEL_TYPES.map((t) => (
                <button 
                  type="button" 
                  key={t.key} 
                  className={`chip${type === t.key ? ' active' : ''}`} 
                  onClick={() => {
                    setType(t.key);
                    setValue('');
                    setDetectMessage(null);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ch-name">Channel Name</label>
          <input 
            id="ch-name" 
            className="form-input" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder={type === 'telegram' ? 'e.g. Ops Team Telegram' : type === 'whatsapp' ? 'e.g. On-Call WhatsApp' : 'e.g. Primary Email'} 
            required 
            autoFocus 
          />
        </div>

        {/* ── Type-specific helper cards & inputs ── */}
        {type === 'telegram' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8, padding: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Zap size={15} /> Platform Telegram Gateway
              </div>
              <p style={{ margin: 0, color: 'var(--white-80)', lineHeight: 1.5 }}>
                {botInfo.configured && botInfo.bot_username ? (
                  <>
                    1. Open Telegram and search <strong>@{botInfo.bot_username}</strong> (or click{' '}
                    <a 
                      href={`https://t.me/${botInfo.bot_username}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: '#38bdf8', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                    >
                      @{botInfo.bot_username} <ExternalLink size={12} />
                    </a>
                    ) and press <strong>START</strong>.<br />
                    2. Click the <strong>⚡ Auto-Detect My Chat ID</strong> button below to automatically load your numeric ID.
                  </>
                ) : (
                  <>
                    Telegram uses a numeric <strong>Chat ID</strong> (e.g. <code>812345678</code> or <code>-100...</code> for groups). Send a message to your Telegram bot and click Auto-Detect below.
                  </>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" htmlFor="ch-value">Telegram Chat ID (Numeric)</label>
                <input 
                  id="ch-value" 
                  className="form-input" 
                  value={value} 
                  onChange={(e) => setValue(e.target.value)} 
                  placeholder="e.g. 812345678 or -100123456789" 
                  required 
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div style={{ paddingTop: 22 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleAutoDetect} 
                  disabled={detecting}
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {detecting ? <Loader2 size={15} className="spin" /> : <Zap size={15} color="#38bdf8" />}
                  Auto-Detect My Chat ID
                </button>
              </div>
            </div>

            {detectMessage && (
              <div style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                fontSize: 12, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                background: detectMessage.ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${detectMessage.ok ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: detectMessage.ok ? '#4ade80' : '#f87171'
              }}>
                {detectMessage.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{detectMessage.text}</span>
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--white-50)' }}>
              Note: Telegram bots can only message users who have initiated a conversation or groups where the bot is added as an administrator.
            </span>
          </div>
        )}

        {type === 'whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--white-80)' }}>
              <div style={{ fontWeight: 600, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Zap size={15} /> Platform WhatsApp Gateway Active
              </div>
              Outage notifications are sent instantly via the platform's high-speed WhatsApp Business Gateway. Enter your mobile phone number including the country code without plus or spaces (e.g., <code>919876543210</code> for India, <code>14155552671</code> for US).
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ch-value">WhatsApp Recipient Phone Number</label>
              <input 
                id="ch-value" 
                className="form-input" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder="e.g. 919876543210 (Country code + Mobile Number)" 
                required 
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        )}

        {type === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(129, 140, 248, 0.08)', border: '1px solid rgba(129, 140, 248, 0.25)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--white-80)' }}>
              <div style={{ fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Info size={15} /> Platform SMTP Gateway
              </div>
              Incident alerts are dispatched immediately via platform high-reputation SMTP mailers. You can add one or multiple recipient emails separated by commas.
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ch-value">Recipient Email Addresses</label>
              <input 
                id="ch-value" 
                className="form-input" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder="ops@company.com, alerts@company.com" 
                required 
              />
            </div>
          </div>
        )}

        {type === 'wirepusher' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--white-80)' }}>
              <div style={{ fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Zap size={15} /> Free Instant Mobile Push
              </div>
              Install the free <strong>WirePusher</strong> app from Google Play Store or Apple App Store. Copy your unique Device ID from the app and paste it below.
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ch-value">WirePusher Device ID</label>
              <input 
                id="ch-value" 
                className="form-input" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder="e.g. j9df82" 
                required 
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        )}

        {!['telegram', 'whatsapp', 'email', 'wirepusher'].includes(type) && (
          <div className="form-group">
            <label className="form-label" htmlFor="ch-value">
              {typeDef.label} {typeDef.field === 'webhook_url' || typeDef.field === 'url' ? 'URL' : 'Destination'}
            </label>
            <input 
              id="ch-value" 
              className="form-input" 
              value={value} 
              onChange={(e) => setValue(e.target.value)} 
              placeholder={typeDef.placeholder} 
              required 
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
