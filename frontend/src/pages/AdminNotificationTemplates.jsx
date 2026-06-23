import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Save, FileText, Info } from 'lucide-react';

const CHANNELS = ['email', 'sms', 'whatsapp', 'telegram', 'slack', 'discord', 'teams'];

export default function AdminNotificationTemplates() {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [activeChannel, setActiveChannel] = useState('email');
  const [activeEvent, setActiveEvent] = useState('down');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listNotificationTemplates();
      setTemplates(data);
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
  }, [currentTemplate]);

  async function handleSave() {
    if (!currentTemplate) return;
    setSaving(true);
    try {
      await adminApi.updateNotificationTemplate(currentTemplate.id, { content });
      toast.success('Template updated successfully.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to update template.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Notification Templates</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Design expert-level formats for incident alerts across all channels.</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !currentTemplate}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            <div className="tabs" style={{ gap: 20 }}>
              {CHANNELS.map(ch => (
                <button 
                  key={ch}
                  className={`tab ${activeChannel === ch ? 'active' : ''}`}
                  onClick={() => setActiveChannel(ch)}
                  style={{ textTransform: 'capitalize', paddingBottom: 15 }}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
          
          <div className="panel-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button 
                className={`btn btn-sm ${activeEvent === 'down' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveEvent('down')}
              >
                Incident Down
              </button>
              <button 
                className={`btn btn-sm ${activeEvent === 'up' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveEvent('up')}
              >
                Incident Resolved
              </button>
            </div>

            {templates === null ? (
              <Skeleton height={300} />
            ) : currentTemplate ? (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 15, borderBottom: '1px solid var(--navy-border)', paddingBottom: 10 }}>
                  <button className={`btn btn-sm ${viewMode === 'edit' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('edit')}>Editor</button>
                  <button className={`btn btn-sm ${viewMode === 'preview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('preview')}>Live Preview</button>
                </div>
                
                {viewMode === 'edit' ? (
                  <div className="form-group">
                    <textarea 
                      className="form-input" 
                      style={{ fontFamily: 'monospace', minHeight: 400, fontSize: 13, lineHeight: 1.6 }}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter your template (Markdown or HTML based on channel support)..."
                    />
                  </div>
                ) : (
                  <div 
                    style={{ minHeight: 400, padding: 20, background: 'var(--navy-800)', borderRadius: 8, border: '1px solid var(--navy-border)' }}
                    dangerouslySetInnerHTML={{ 
                      __html: content
                        .replace(/{{monitor\.name}}/g, 'Production API')
                        .replace(/{{monitor\.url}}/g, 'https://api.myapp.com')
                        .replace(/{{incident\.error}}/g, 'HTTP 500 Internal Server Error')
                        .replace(/{{time}}/g, '14:32:00')
                        .replace(/{{date}}/g, '2026-06-22')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                No template found for this channel and event.
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} /> Template Variables
            </div>
          </div>
          <div className="panel-body" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            <p style={{ marginBottom: 15 }}>Use the following placeholders in your templates. They will be dynamically replaced when an alert is sent.</p>
            
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <code style={{ color: 'var(--text-main)', background: 'var(--bg-lighter)', padding: '2px 6px', borderRadius: 4 }}>{'{{monitor.name}}'}</code>
                  <div style={{ marginTop: 2 }}>Monitor name</div>
                </div>
                <div>
                  <code style={{ color: 'var(--text-main)', background: 'var(--bg-lighter)', padding: '2px 6px', borderRadius: 4 }}>{'{{monitor.type}}'}</code>
                  <div style={{ marginTop: 2 }}>Monitor type (PING, HTTP)</div>
                </div>
                <div>
                  <code style={{ color: 'var(--text-main)', background: 'var(--bg-lighter)', padding: '2px 6px', borderRadius: 4 }}>{'{{monitor.target}}'}</code>
                  <div style={{ marginTop: 2 }}>Target URL/IP</div>
                </div>
                <div>
                  <code style={{ color: 'var(--text-main)', background: 'var(--bg-lighter)', padding: '2px 6px', borderRadius: 4 }}>{'{{incident.error}}'}</code>
                  <div style={{ marginTop: 2 }}>Error details</div>
                </div>
                <div style={{ gridColumn: '1 / -1', background: 'var(--navy-800)', padding: 10, borderRadius: 6, border: '1px dashed var(--navy-border)' }}>
                  <code style={{ color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>{'{{monitor.details}}'}</code>
                  <div style={{ marginTop: 4, color: 'var(--text-main)' }}><strong>(Recommended)</strong> Automatically injects a formatted list of parameters specific to the monitor type (e.g., Ping response times, SSL days remaining, Port numbers, etc).</div>
                </div>
              </div>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <strong>Channel Formatting Notes:</strong>
              <ul style={{ paddingLeft: 20, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>Email</strong>: Supports HTML parsing.</li>
                <li><strong>Slack/Discord</strong>: Supports standard Markdown formatting (*bold*, `code`).</li>
                <li><strong>Telegram</strong>: Supports standard HTML tags (&lt;b&gt;, &lt;code&gt;).</li>
                <li><strong>WhatsApp</strong>: Uses *bold* and _italic_.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
