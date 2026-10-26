import { useEffect, useState, useCallback, useRef } from 'react';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Save, RefreshCw, Copy, Check, Info, Code, Eye, Sparkles, Send } from 'lucide-react';

const CHANNELS = [
  { key: 'email', label: 'Email (HTML)', icon: '✉️' },
  { key: 'slack', label: 'Slack', icon: '💬' },
  { key: 'discord', label: 'Discord', icon: '🎮' },
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'teams', label: 'MS Teams', icon: '👥' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { key: 'sms', label: 'SMS', icon: '📟' },
  { key: 'webhook', label: 'Webhook (JSON)', icon: '🔗' },
  { key: 'wirepusher', label: 'WirePusher', icon: '🔔' },
];

const EVENTS = [
  { key: 'down', label: '🚨 Incident Down', badge: '#ef4444' },
  { key: 'up', label: '✅ Incident Resolved', badge: '#10b981' },
  { key: 'degraded', label: '⚠️ Performance Degraded', badge: '#f59e0b' },
  { key: 'ssl_expiry', label: '🔒 SSL Expiry Warning', badge: '#eab308' },
  { key: 'login_alert', label: '🛡️ Security Login Alert', badge: '#3b82f6' },
  { key: 'team_invite', label: '👥 Team Invitation', badge: '#8b5cf6' },
  { key: 'weekly_report', label: '📊 Weekly SLA Report', badge: '#06b6d4' },
  { key: 'monthly_report', label: '📈 Monthly SLA Report', badge: '#ec4899' },
];

export default function AdminNotificationTemplates() {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [activeChannel, setActiveChannel] = useState('email');
  const [activeEvent, setActiveEvent] = useState('down');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'
  const [copiedToken, setCopiedToken] = useState(null);
  const textareaRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listNotificationTemplates();
      setTemplates(data || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load templates.'));
      setTemplates([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const currentTemplate = templates?.find(t => t.channel_type === activeChannel && t.event_type === activeEvent);

  useEffect(() => {
    if (currentTemplate) {
      setContent(currentTemplate.content);
    } else {
      setContent('');
    }
  }, [currentTemplate, activeChannel, activeEvent]);

  async function handleSave() {
    setSaving(true);
    try {
      await adminApi.upsertNotificationTemplate({
        channel_type: activeChannel,
        event_type: activeEvent,
        content: content,
      });
      toast.success(`Template for ${activeChannel.toUpperCase()} (${activeEvent}) saved.`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to update template.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    if (!window.confirm(`Reset ${activeChannel.toUpperCase()} template for "${activeEvent}" to the recommended default?`)) return;
    setResetting(true);
    try {
      const { data } = await adminApi.resetNotificationTemplateDefault(activeChannel, activeEvent);
      setContent(data.content);
      toast.success('Template reset to recommended default.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to reset template.'));
    } finally {
      setResetting(false);
    }
  }

  function insertVariable(token) {
    if (textareaRef.current) {
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newText = content.substring(0, start) + token + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + token.length;
        el.focus();
      }, 0);
    } else {
      setContent((prev) => prev + token);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  }

  // Generate realistic live preview with mock variables replaced
  function getPreviewHtml() {
    let output = content
      .replace(/{{monitor\.name}}/g, 'Production API Gateway')
      .replace(/{{monitor\.url}}/g, 'https://api.infiniforge.cloud')
      .replace(/{{monitor\.target}}/g, 'https://api.infiniforge.cloud')
      .replace(/{{monitor\.type}}/g, 'HTTPS')
      .replace(/{{monitor\.port}}/g, '443')
      .replace(/{{monitor\.interval}}/g, '30s')
      .replace(/{{incident\.severity}}/g, 'CRITICAL')
      .replace(/{{incident\.error}}/g, 'HTTP 502 Bad Gateway (Upstream timeout after 15000ms)')
      .replace(/{{incident\.duration}}/g, '12m 45s')
      .replace(/{{incident\.started_at}}/g, '2026-10-26 11:45:00 UTC')
      .replace(/{{incident\.resolved_at}}/g, '2026-10-26 11:57:45 UTC')
      .replace(/{{ssl\.issuer}}/g, "Let's Encrypt Authority X3")
      .replace(/{{ssl\.valid_to}}/g, '2026-11-15 23:59:59 UTC')
      .replace(/{{ssl\.days_remaining}}/g, '18')
      .replace(/{{login\.ip}}/g, '103.21.115.63')
      .replace(/{{login\.user_agent}}/g, 'Chrome 130.0 / macOS')
      .replace(/{{organization\.name}}/g, 'Acme Corp')
      .replace(/{{invite\.url}}/g, 'https://infmonitor.infiniforge.cloud/invite/accept?t=mock123')
      .replace(/{{time}}/g, '11:57:45')
      .replace(/{{date}}/g, '2026-10-26');

    return output;
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Notification & Alert Templates</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Design expert-level formats for incident alerts, warnings, and reports across all communication channels.</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-ghost" onClick={handleResetDefault} disabled={resetting}>
            <RefreshCw size={15} className={resetting ? 'spin' : ''} /> Reset to Recommended Default
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !content}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Channel Selector Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 6 }} className="hide-scrollbar">
        {CHANNELS.map(ch => (
          <button 
            key={ch.key}
            className={`btn btn-sm ${activeChannel === ch.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveChannel(ch.key)}
            style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>{ch.icon}</span>
            <span>{ch.label}</span>
          </button>
        ))}
      </div>

      {/* Event Selector Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 6 }} className="hide-scrollbar">
        {EVENTS.map(ev => (
          <button 
            key={ev.key}
            className={`btn btn-sm ${activeEvent === ev.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveEvent(ev.key)}
            style={{ 
              whiteSpace: 'nowrap', 
              flexShrink: 0,
              borderLeft: activeEvent === ev.key ? 'none' : `3px solid ${ev.badge}`,
            }}
          >
            {ev.label}
          </button>
        ))}
      </div>

      <div className="row-2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Left Column: Template Editor or Live Preview */}
        <div className="panel" style={{ flex: 1, minHeight: 620 }}>
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>
                {CHANNELS.find(c => c.key === activeChannel)?.icon}
              </span>
              <div>
                <div className="panel-title" style={{ textTransform: 'capitalize' }}>
                  {activeChannel} &bull; {EVENTS.find(e => e.key === activeEvent)?.label}
                </div>
                <div className="panel-sub" style={{ fontSize: 12 }}>
                  {activeChannel === 'email' ? 'Full HTML email formatting supported' : 'Standard markdown formatting supported'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className={`btn btn-sm ${viewMode === 'edit' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setViewMode('edit')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Code size={14} /> Editor
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'preview' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setViewMode('preview')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Eye size={14} /> Live Preview
              </button>
            </div>
          </div>
          
          <div className="panel-body">
            {templates === null ? (
              <Skeleton height={420} />
            ) : viewMode === 'edit' ? (
              <div className="form-group" style={{ margin: 0 }}>
                <textarea 
                  ref={textareaRef}
                  className="form-input" 
                  style={{ 
                    fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace', 
                    minHeight: 520, 
                    fontSize: 13, 
                    lineHeight: 1.6,
                    background: 'var(--navy-900)',
                    color: '#e2e8f0',
                  }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter template code (HTML or Markdown)..."
                />
              </div>
            ) : (
              /* Live Preview */
              <div>
                {activeChannel === 'email' ? (
                  <div style={{ 
                    borderRadius: 12, 
                    overflow: 'hidden', 
                    border: '1px solid var(--navy-border)', 
                    background: '#0b1120',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    minHeight: 520,
                  }}>
                    <iframe 
                      title="Email Preview"
                      srcDoc={getPreviewHtml()}
                      style={{ 
                        width: '100%', 
                        height: 540, 
                        border: 'none', 
                        display: 'block',
                        background: '#0b1120',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    background: activeChannel === 'slack' ? '#1a1d21' : activeChannel === 'discord' ? '#313338' : 'var(--navy-900)',
                    borderRadius: 12, 
                    padding: 24, 
                    border: '1px solid var(--navy-border)',
                    fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace',
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    color: '#e2e8f0',
                    minHeight: 400,
                  }}>
                    {getPreviewHtml()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Template Variables Cheat Sheet */}
        <div className="panel" style={{ width: 340, flexShrink: 0 }}>
          <div className="panel-head">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Sparkles size={16} color="var(--primary-400)" /> Template Variables
            </div>
            <div className="panel-sub" style={{ fontSize: 12, marginTop: 4 }}>
              Click any token to insert at cursor position
            </div>
          </div>
          <div className="panel-body" style={{ maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Monitor Variables */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Monitor Information
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { token: '{{monitor.name}}', desc: 'Monitor name' },
                    { token: '{{monitor.url}}', desc: 'Target URL / Host' },
                    { token: '{{monitor.type}}', desc: 'Protocol (HTTPS, PING, TCP)' },
                    { token: '{{monitor.port}}', desc: 'Target Port' },
                    { token: '{{monitor.interval}}', desc: 'Check frequency (e.g. 30s)' },
                    { token: '{{monitor.details}}', desc: 'Full properties summary table' },
                  ].map(v => (
                    <button
                      key={v.token}
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => insertVariable(v.token)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '6px 10px', 
                        fontSize: 12, 
                        background: 'var(--navy-900)',
                        textAlign: 'left',
                        borderRadius: 6,
                        border: '1px solid var(--navy-700)',
                      }}
                    >
                      <code style={{ color: '#38bdf8', fontWeight: 600 }}>{v.token}</code>
                      <span style={{ fontSize: 11, color: 'var(--white-50)' }}>
                        {copiedToken === v.token ? <Check size={12} color="#34d399" /> : v.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Incident Variables */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Incident & Outage Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { token: '{{incident.error}}', desc: 'Root cause error message' },
                    { token: '{{incident.duration}}', desc: 'Total outage duration' },
                    { token: '{{incident.severity}}', desc: 'CRITICAL / WARNING' },
                    { token: '{{incident.started_at}}', desc: 'Outage start timestamp' },
                    { token: '{{incident.resolved_at}}', desc: 'Recovery timestamp' },
                  ].map(v => (
                    <button
                      key={v.token}
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => insertVariable(v.token)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '6px 10px', 
                        fontSize: 12, 
                        background: 'var(--navy-900)',
                        textAlign: 'left',
                        borderRadius: 6,
                        border: '1px solid var(--navy-700)',
                      }}
                    >
                      <code style={{ color: '#f87171', fontWeight: 600 }}>{v.token}</code>
                      <span style={{ fontSize: 11, color: 'var(--white-50)' }}>
                        {copiedToken === v.token ? <Check size={12} color="#34d399" /> : v.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SSL & Global Variables */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  SSL & Date/Time
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { token: '{{ssl.days_remaining}}', desc: 'Days until certificate expiry' },
                    { token: '{{ssl.valid_to}}', desc: 'Certificate expiration date' },
                    { token: '{{ssl.issuer}}', desc: 'Certificate issuer (CA)' },
                    { token: '{{time}}', desc: 'Current transmission time' },
                    { token: '{{date}}', desc: 'Current transmission date' },
                  ].map(v => (
                    <button
                      key={v.token}
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => insertVariable(v.token)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '6px 10px', 
                        fontSize: 12, 
                        background: 'var(--navy-900)',
                        textAlign: 'left',
                        borderRadius: 6,
                        border: '1px solid var(--navy-700)',
                      }}
                    >
                      <code style={{ color: '#fbbf24', fontWeight: 600 }}>{v.token}</code>
                      <span style={{ fontSize: 11, color: 'var(--white-50)' }}>
                        {copiedToken === v.token ? <Check size={12} color="#34d399" /> : v.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
