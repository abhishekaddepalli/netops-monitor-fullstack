import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { statusPagesApi } from '../api/statusPages';
import { PageLoading } from '../components/ui/Spinner';
import { timeAgo } from '../utils/format';

const OVERALL_DISPLAY = {
  operational: { label: 'All Systems Operational', bg: 'var(--green-dim)', color: 'var(--green-400)', Icon: CheckCircle2 },
  degraded: { label: 'Degraded Performance', bg: 'var(--saffron-dim)', color: 'var(--saffron-500)', Icon: AlertTriangle },
  partial_outage: { label: 'Partial Outage', bg: 'var(--saffron-dim)', color: 'var(--saffron-500)', Icon: AlertTriangle },
  major_outage: { label: 'Major Outage', bg: 'var(--red-dim)', color: 'var(--red-400)', Icon: XCircle },
};

export default function PublicStatusPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');

  async function load(pwd) {
    try {
      const { data } = await statusPagesApi.publicShow(slug, pwd ? { headers: { 'X-Status-Page-Password': pwd } } : undefined);
      setPage(data);
      setPasswordRequired(false);
    } catch (err) {
      if (err.response?.status === 401 && err.response.data?.password_protected) {
        setPasswordRequired(true);
      } else {
        setError('This status page could not be found.');
      }
    }
  }

  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (passwordRequired) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-title">Password protected</div>
          <div className="auth-sub">This status page requires a password to view.</div>
          <form onSubmit={(e) => { e.preventDefault(); load(password); }}>
            <div className="form-group">
              <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoFocus />
            </div>
            <button className="btn btn-primary btn-block" type="submit">View status page</button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <XCircle size={32} style={{ color: 'var(--red-400)', marginBottom: 12 }} />
          <div className="auth-title">{error}</div>
        </div>
      </div>
    );
  }

  if (!page) return <PageLoading />;

  const overall = OVERALL_DISPLAY[page.overall_status] || OVERALL_DISPLAY.operational;
  const OverallIcon = overall.Icon;

  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px', background: 'var(--navy-950)' }}>
      <div className="statuspage-wrap">
        <div className="sp-header">
          <div className="sp-logo">
            <div className="brand-mark" style={{ width: 26, height: 26 }} />
            <span style={{ fontWeight: 800, fontSize: 17 }}>{page.name}</span>
          </div>
          <div className="sp-overall" style={{ background: overall.bg, color: overall.color }}>
            <OverallIcon size={18} />
            {overall.label}
          </div>
        </div>
        <div className="sp-body">
          {page.components.map((c, i) => (
            <div className="sp-component" key={i}>
              <div>
                <div className="sp-comp-name">{c.name}</div>
                {c.group && <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 1 }}>{c.group}</div>}
              </div>
              <span className={`pill pill-${c.status === 'pending' ? 'pending' : c.status}`}>
                {c.status === 'up' ? 'Operational' : c.status === 'down' ? 'Outage' : c.status === 'degraded' ? 'Degraded' : 'Pending'}
              </span>
            </div>
          ))}

          {page.active_maintenance?.length > 0 && (
            <div style={{ marginTop: 24, padding: 14, background: 'var(--chakra-dim)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--chakra-400)' }}>Scheduled Maintenance</div>
              {page.active_maintenance.map((m, i) => (
                <div key={i} style={{ fontSize: 12.5, color: 'var(--white-60)' }}>{m.title}</div>
              ))}
            </div>
          )}

          {page.recent_incidents?.length > 0 && (
            <div style={{ marginTop: 30, paddingTop: 24, borderTop: '1px solid var(--navy-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 14 }}>Incident History</div>
              {page.recent_incidents.map((inc) => (
                <div className="incident-item" key={inc.id}>
                  <div className="incident-dot-col">
                    <div className={`incident-dot ${inc.state === 'resolved' ? 'resolved' : ''}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="incident-title">{inc.title}</div>
                    <div className="incident-meta">{timeAgo(inc.started_at)} · {inc.state}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
