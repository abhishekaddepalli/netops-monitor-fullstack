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
    </>
  );
}
