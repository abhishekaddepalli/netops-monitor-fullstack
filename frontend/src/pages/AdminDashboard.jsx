import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Building2, Users, Activity, AlertTriangle, DollarSign, ServerCrash, CheckCircle } from 'lucide-react';
import { timeAgo } from '../utils/format';

export default function AdminDashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.getDashboardSummary();
      setSummary(data);
    } catch {
      toast.error('Could not load dashboard summary.');
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (!summary) {
    return <div className="detail-body"><Skeleton height={200} /></div>;
  }

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">Super Admin Overview</div>
      </div>
      
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <KpiCard
          label="Est. Monthly Revenue"
          value={`₹${summary.mrr || 0}`}
          icon={<DollarSign />}
          iconBg="var(--green-dim)"
          iconColor="var(--green-400)"
        />
        <KpiCard
          label="Total Organizations"
          value={summary.total_organizations}
          icon={<Building2 />}
          iconBg="var(--blue-dim)"
          iconColor="var(--blue-400)"
        />
        <KpiCard
          label="Active Monitors"
          value={summary.active_monitors}
          icon={<Activity />}
          iconBg="var(--chakra-dim)"
          iconColor="var(--chakra-400)"
        />
        <KpiCard
          label="Queue Health"
          value={summary.queue_health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
          icon={summary.queue_health?.status === 'healthy' ? <CheckCircle /> : <ServerCrash />}
          iconBg={summary.queue_health?.status === 'healthy' ? 'var(--green-dim)' : 'var(--red-dim)'}
          iconColor={summary.queue_health?.status === 'healthy' ? 'var(--green-400)' : 'var(--red-400)'}
          delta={summary.queue_health?.failed_jobs > 0 ? `${summary.queue_health.failed_jobs} failed jobs` : '0 failed jobs'}
          deltaClass={summary.queue_health?.failed_jobs > 0 ? 'delta-bad' : 'delta-neutral'}
        />
      </div>

      <div className="row-2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Recent Signups (Organizations)</div>
          </div>
          <div className="panel-body">
            {summary.recent_signups?.length === 0 ? (
              <div style={{ color: 'var(--white-40)', fontSize: 13 }}>No recent signups.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Organization</th><th>Plan</th><th>Joined</th></tr></thead>
                <tbody>
                  {summary.recent_signups?.map(org => (
                    <tr key={org.id}>
                      <td style={{ fontWeight: 500 }}>{org.name}</td>
                      <td><span className="tag">{org.plan || 'Free'}</span></td>
                      <td style={{ color: 'var(--white-40)' }}>{timeAgo(org.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Recent Users (Live Updates)</div>
          </div>
          <div className="panel-body">
            {summary.recent_users?.length === 0 ? (
              <div style={{ color: 'var(--white-40)', fontSize: 13 }}>No recent users.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>User</th><th>Organization</th><th>Joined</th></tr></thead>
                <tbody>
                  {summary.recent_users?.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--white-60)' }}>{user.email}</div>
                      </td>
                      <td>{user.organization?.name || '-'}</td>
                      <td style={{ color: 'var(--white-40)' }}>{timeAgo(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="row-2" style={{ marginTop: 24 }}>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Recent Invoices</div>
          </div>
          <div className="panel-body">
            {summary.recent_invoices?.length === 0 ? (
              <div style={{ color: 'var(--white-40)', fontSize: 13 }}>No recent invoices.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Invoice</th><th>Organization</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {summary.recent_invoices?.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                      <td>{inv.organization?.name || '-'}</td>
                      <td>₹{inv.amount}</td>
                      <td><span className={`tag state-${inv.status === 'paid' ? 'resolved' : 'investigating'}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Recent Payments</div>
          </div>
          <div className="panel-body">
            {summary.recent_payments?.length === 0 ? (
              <div style={{ color: 'var(--white-40)', fontSize: 13 }}>No recent payments.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Invoice</th><th>Organization</th><th>Amount</th><th>Paid</th></tr></thead>
                <tbody>
                  {summary.recent_payments?.map(pay => (
                    <tr key={pay.id}>
                      <td style={{ fontWeight: 500 }}>{pay.invoice_number}</td>
                      <td>{pay.organization?.name || '-'}</td>
                      <td>₹{pay.amount}</td>
                      <td style={{ color: 'var(--white-40)' }}>{timeAgo(pay.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
         <div className="panel-head">
          <div className="panel-title">System Metrics</div>
        </div>
        <div className="panel-body" style={{ display: 'flex', gap: 48 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>Total Users</div>
            <div style={{ fontSize: 12, color: 'var(--white-40)', marginBottom: 8 }}>Across all organizations</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{summary.total_users}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>Open Incidents</div>
            <div style={{ fontSize: 12, color: 'var(--white-40)', marginBottom: 8 }}>Currently unresolved incidents</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: summary.open_incidents > 0 ? 'var(--red-400)' : 'var(--green-400)' }}>{summary.open_incidents}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, icon, iconBg, iconColor, delta, deltaClass }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      </div>
      <div className="kpi-value">{value ?? <Skeleton width={70} height={28} />}</div>
      {delta && <div className={`kpi-delta ${deltaClass}`}>{delta}</div>}
    </div>
  );
}
