import { useEffect, useState, useCallback } from 'react';
import { Plus, Plug, Trash2, Send } from 'lucide-react';
import { alertChannelsApi } from '../api/alertChannels';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const CHANNEL_TYPES = [
  { key: 'email', label: 'Email', field: 'to', placeholder: 'ops@company.com' },
  { key: 'slack', label: 'Slack', field: 'webhook_url', placeholder: 'https://hooks.slack.com/services/...' },
  { key: 'telegram', label: 'Telegram', field: 'chat_id', placeholder: '-100123456789' },
  { key: 'discord', label: 'Discord', field: 'webhook_url', placeholder: 'https://discord.com/api/webhooks/...' },
  { key: 'teams', label: 'MS Teams', field: 'webhook_url', placeholder: 'https://outlook.office.com/webhook/...' },
  { key: 'webhook', label: 'Webhook', field: 'url', placeholder: 'https://your-endpoint.com/alerts' },
  { key: 'whatsapp', label: 'WhatsApp', field: 'to', placeholder: '+91XXXXXXXXXX' },
  { key: 'sms', label: 'SMS', field: 'to', placeholder: '91XXXXXXXXXX' },
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
          <div className="panel-sub" style={{ marginTop: 4 }}>Where incident notifications get sent</div>
        </div>
        {isOrgAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditingChannel(null); setShowModal(true); }}><Plus size={15} />New Channel</button>
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
              subtitle="Add a channel so incidents actually notify someone."
              action={isOrgAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditingChannel(null); setShowModal(true); }}>Add channel</button>}
            />
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id}>
                  <td className="mon-name">{c.name}</td>
                  <td><span className="tag">{CHANNEL_TYPES.find((t) => t.key === c.type)?.label || c.type}</span></td>
                  <td><span className={`pill ${c.is_active ? 'pill-up' : 'pill-paused'}`}>{c.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td>
                    <div className="row-actions" style={{ opacity: 1 }}>
                      {isOrgAdmin && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(c)}>
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                          <button className="icon-btn-sm" onClick={() => handleTest(c)} title="Send test alert" disabled={testingId === c.id}>
                            <Send />
                          </button>
                          <button className="icon-btn-sm" onClick={() => handleDelete(c)} title="Delete"><Trash2 /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [type, setType] = useState(channel ? channel.type : 'email');
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

  const typeDef = CHANNEL_TYPES.find((t) => t.key === type);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const config = { [typeDef.field]: type === 'email' ? value.split(',').map((v) => v.trim()) : value };
      
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
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name || !value}>{submitting ? 'Saving…' : 'Save'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Channel type</label>
          {channel ? (
            <div style={{ padding: '8px 12px', background: 'var(--navy-900)', borderRadius: '6px', color: 'var(--white-80)', fontWeight: '500' }}>
              {typeDef?.label || channel.type}
            </div>
          ) : (
            <div className="tab-row">
              {CHANNEL_TYPES.map((t) => (
                <button type="button" key={t.key} className={`chip${type === t.key ? ' active' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ch-name">Name</label>
          <input id="ch-name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ops Team Email" required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ch-value">{typeDef.label} {typeDef.field === 'to' ? '(comma-separated for multiple)' : ''}</label>
          <input id="ch-value" className="form-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={typeDef.placeholder} required />
        </div>
      </form>
    </Modal>
  );
}
