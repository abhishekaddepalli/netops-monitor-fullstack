import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { incidentsApi } from '../api/incidents';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import IncidentActionModal from '../components/incidents/IncidentActionModal';
import { timeAgo, formatDurationSeconds } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
  { key: '', label: 'All' },
];

export default function Incidents() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOperatorOrAbove } = useAuth();
  const [filter, setFilter] = useState('active');
  const [incidents, setIncidents] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { incident, type: 'acknowledge'|'resolve' }

  const load = useCallback(async () => {
    try {
      const params = filter === 'active' ? { active_only: 1 } : filter ? { state: filter } : {};
      const { data } = await incidentsApi.list({ ...params, per_page: 50 });
      setIncidents(data.data || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load incidents.'));
      setIncidents([]);
    }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Incidents</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            {incidents ? `${incidents.length} ${filter === 'active' ? 'active' : filter || 'total'}` : '...'}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="tab-row">
            {FILTERS.map((f) => (
              <button key={f.key} className={`chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          {incidents === null ? (
            <Skeleton height={240} />
          ) : incidents.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No incidents" subtitle={filter === 'active' ? "You're all clear — no active incidents." : 'No incidents match this filter.'} />
          ) : (
            incidents.map((inc, i) => (
              <div className="incident-item" key={inc.id} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }} onClick={() => navigate(`/monitors/${inc.monitor_id}`)}>
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div className="incident-dot-col" style={{ position: 'relative' }}>
                    <div className={`incident-dot ${inc.state === 'resolved' ? 'resolved' : inc.severity === 'degraded' ? 'degraded' : ''}`} />
                    {i < incidents.length - 1 && <div className="incident-line" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="incident-title">{inc.title}</div>
                    <div className="incident-meta">
                      {inc.monitor?.name} · started {timeAgo(inc.started_at)}
                      {inc.resolved_at && ` · resolved ${timeAgo(inc.resolved_at)}`}
                      {inc.time_to_resolve_seconds && ` · MTTR ${formatDurationSeconds(inc.time_to_resolve_seconds)}`}
                    </div>
                  </div>
                  {isOperatorOrAbove && inc.state !== 'resolved' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      {!inc.acknowledged_at && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setActionModal({ incident: inc, type: 'acknowledge' })}>Acknowledge</button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setActionModal({ incident: inc, type: 'resolve' })}>Resolve</button>
                    </div>
                  )}
                  <span className={`incident-state state-${inc.state}`}>{inc.state}</span>
                </div>
                
                {/* Extra Details row (Root Cause / Resolution Notes) */}
                {(inc.root_cause || inc.resolution_notes) && (
                  <div style={{ paddingLeft: 30, width: '100%' }}>
                    {inc.root_cause && (
                      <div style={{ background: 'var(--navy-900)', padding: '10px 14px', borderRadius: 6, marginBottom: inc.resolution_notes ? 8 : 0, fontSize: 13 }}>
                        <div style={{ color: 'var(--white-50)', fontWeight: 600, marginBottom: 2 }}>Cause Details</div>
                        <div style={{ color: 'var(--white-90)' }}>{inc.root_cause}</div>
                      </div>
                    )}
                    {inc.resolution_notes && (
                      <div style={{ background: 'var(--navy-900)', padding: '10px 14px', borderRadius: 6, fontSize: 13, borderLeft: '2px solid var(--green-400)' }}>
                        <div style={{ color: 'var(--white-50)', fontWeight: 600, marginBottom: 2 }}>Resolution Details</div>
                        <div style={{ color: 'var(--white-90)' }}>{inc.resolution_notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {actionModal && (
        <IncidentActionModal 
          incident={actionModal.incident} 
          actionType={actionModal.type} 
          onClose={() => setActionModal(null)} 
          onSuccess={() => { setActionModal(null); load(); }} 
        />
      )}
    </>
  );
}
