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

      <div className="row-2" style={{ gap: 24, alignItems: 'start' }}>
        <div className="panel" style={{ flex: 1, minHeight: 600 }}>
          <div className="panel-head" style={{ paddingBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--navy-border)', paddingBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }} className="hide-scrollbar">
              {CHANNELS.map(ch => (
                <button 
                  key={ch}
                  className={`btn btn-sm ${activeChannel === ch ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveChannel(ch)}
                  style={{ textTransform: 'capitalize', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
          
          <div className="panel-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
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
              <button 
                className={`btn btn-sm ${activeEvent === 'login_alert' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveEvent('login_alert')}
              >
                Login Alert
              </button>
              <button 
                className={`btn btn-sm ${activeEvent === 'team_invite' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveEvent('team_invite')}
              >
                Team Invite
              </button>
              <button 
                className={`btn btn-sm ${activeEvent === 'weekly_report' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveEvent('weekly_report')}
              >
                Weekly Report
              </button>
              <button 
                className={`btn btn-sm ${activeEvent === 'monthly_report' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveEvent('monthly_report')}
              >
                Monthly Report
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
            
            {(activeEvent === 'down' || activeEvent === 'up') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                <div><code>{`{{monitor.name}}`}</code><br/>Monitor Name</div>
                <div><code>{`{{monitor.type}}`}</code><br/>Type (HTTP, PING)</div>
                <div><code>{`{{monitor.target}}`}</code><br/>URL or IP</div>
                <div><code>{`{{monitor.details}}`}</code><br/>Detailed properties table</div>
                <div><code>{`{{incident.error}}`}</code><br/>Root cause message</div>
                <div><code>{`{{incident.duration}}`}</code><br/>Downtime length</div>
                <div><code>{`{{incident.started_at}}`}</code><br/>Start time</div>
                <div><code>{`{{time}}`}</code><br/>Current time</div>
                <div><code>{`{{date}}`}</code><br/>Current date</div>
              </div>
            )}
            
            {activeEvent === 'login_alert' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                <div><code>{`{{user.name}}`}</code><br/>User Name</div>
                <div><code>{`{{user.email}}`}</code><br/>User Email</div>
                <div><code>{`{{login.ip}}`}</code><br/>IP Address</div>
                <div><code>{`{{login.device}}`}</code><br/>Browser/Device</div>
                <div><code>{`{{login.time}}`}</code><br/>Login Timestamp</div>
              </div>
            )}

            {activeEvent === 'team_invite' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                <div><code>{`{{user.name}}`}</code><br/>Invitee Name</div>
                <div><code>{`{{user.email}}`}</code><br/>Invitee Email</div>
                <div><code>{`{{org.name}}`}</code><br/>Organization Name</div>
                <div><code>{`{{invite.password}}`}</code><br/>Temporary Password</div>
                <div><code>{`{{invite.link}}`}</code><br/>Login Link</div>
              </div>
            )}

            {(activeEvent === 'weekly_report' || activeEvent === 'monthly_report') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                <div><code>{`{{org.name}}`}</code><br/>Organization Name</div>
                <div><code>{`{{report.period}}`}</code><br/>Period (Weekly/Monthly)</div>
                <div><code>{`{{report.uptime_percentage}}`}</code><br/>Overall Uptime %</div>
                <div><code>{`{{report.total_incidents}}`}</code><br/>Total Incidents</div>
                <div><code>{`{{report.total_downtime}}`}</code><br/>Total Downtime Mins</div>
                <div><code>{`{{report.details}}`}</code><br/>Monitors Table</div>
              </div>
            )}

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
