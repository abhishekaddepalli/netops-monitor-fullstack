import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Activity, Download, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { formatDateTime } from '../utils/format';

export default function AdminLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState(null);
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then(({ data }) => setRetentionDays(data.log_retention_days || 30)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listAuditLogs({ search: search || undefined, per_page: 50 });
      setLogs(data.data || []);
    } catch {
      toast.error('Could not load audit logs.');
      setLogs([]);
    }
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="detail-title">Global Audit Logs</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => adminApi.exportAuditLogs({ search: search || undefined })}>
            <Download size={16} style={{ marginRight: 8 }} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowManage(true)}>
            <SettingsIcon size={16} style={{ marginRight: 8 }} /> Manage Logs
          </button>
        </div>
      </div>
      
      <div className="panel">
        <div className="panel-head">
          <div className="search-box" style={{ maxWidth: 300 }}>
            <input placeholder="Search user or organization..." value={search} onChange={(e) => setSearch(e.target.value)} onBlur={load} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
        </div>
        
        {logs === null ? (
          <div className="panel-body"><Skeleton height={400} /></div>
        ) : logs.length === 0 ? (
          <div className="panel-body"><EmptyState icon={Activity} title="No logs found" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Organization</th>
                <th>Timestamp</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.action}</div>
                    <div style={{ fontSize: 12, color: 'var(--white-40)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {log.ip_address}
                    </div>
                  </td>
                  <td>{log.user ? `${log.user.name} (${log.user.email})` : 'System'}</td>
                  <td style={{ fontWeight: 500 }}>{log.organization?.name || '—'}</td>
                  <td style={{ color: 'var(--white-40)' }}>{formatDateTime(log.created_at)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLog(log)}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showManage && (
        <Modal title="Manage Audit Logs" onClose={() => setShowManage(false)} footer={
          <button className="btn btn-primary" onClick={async () => {
            setSubmitting(true);
            try {
              await adminApi.updateSettings({ log_retention_days: retentionDays });
              toast.success('Log retention settings updated.');
              setShowManage(false);
            } catch {
              toast.error('Could not update settings.');
            } finally { setSubmitting(false); }
          }} disabled={submitting}>
            Save Settings
          </button>
        }>
          <div className="form-group">
            <label className="form-label">Log Retention (Days)</label>
            <div style={{ fontSize: 13, color: 'var(--white-60)', marginBottom: 8 }}>
              Logs older than this number of days will be permanently deleted automatically every day.
            </div>
            <input type="number" className="form-input" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} />
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Manual Deletion</div>
            <div style={{ fontSize: 13, color: 'var(--white-60)' }}>Immediately free up database storage by deleting logs right now.</div>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm('Delete all logs older than 30 days?')) return;
              await adminApi.deleteAuditLogs({ older_than_days: 30 });
              toast.success('Logs deleted.'); load(); setShowManage(false);
            }}>
              Delete &gt; 30 Days
            </button>
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm('Are you absolutely sure you want to delete ALL audit logs?')) return;
              await adminApi.deleteAuditLogs();
              toast.success('All logs deleted.'); load(); setShowManage(false);
            }}>
              Delete ALL Logs
            </button>
          </div>
        </Modal>
      )}

      {selectedLog && (
        <Modal title="Audit Log Details" onClose={() => setSelectedLog(null)} footer={
          <button className="btn btn-ghost" onClick={() => setSelectedLog(null)}>Close</button>
        }>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
              <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>Action</div>
              <div style={{ fontWeight: 600 }}>{selectedLog.action}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
                <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>User</div>
                <div style={{ fontWeight: 500 }}>{selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : 'System'}</div>
              </div>
              <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
                <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>Organization</div>
                <div style={{ fontWeight: 500 }}>{selectedLog.organization?.name || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
                <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>IP Address</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.ip_address}</div>
              </div>
              <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
                <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>Timestamp</div>
                <div>{formatDateTime(selectedLog.created_at)}</div>
              </div>
            </div>

            <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
              <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>User Agent</div>
              <div style={{ fontSize: 13, color: 'var(--white-80)', wordBreak: 'break-all' }}>{selectedLog.user_agent}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
                <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>Subject Type</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{selectedLog.subject_type || '—'}</div>
              </div>
              <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
                <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>Subject ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{selectedLog.subject_id || '—'}</div>
              </div>
            </div>

            <div className="panel" style={{ background: 'var(--navy-900)', padding: 16 }}>
              <div style={{ color: 'var(--white-50)', fontSize: 13, marginBottom: 4 }}>Changes (JSON)</div>
              <pre style={{ background: 'var(--bg-1)', padding: 12, borderRadius: 8, overflowX: 'auto', fontSize: 13, color: 'var(--primary-300)', margin: 0 }}>
                {JSON.stringify(selectedLog.changes, null, 2) || '{}'}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
