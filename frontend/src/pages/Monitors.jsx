import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, Pause, Play, Trash2, Activity, Download, Upload, FileDown, Search } from 'lucide-react';
import { monitorsApi } from '../api/monitors';
import { apiErrorMessage } from '../api/client';
import StatusPill from '../components/ui/StatusPill';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import CreateMonitorModal from '../components/monitors/CreateMonitorModal';
import NetworkDiscoveryModal from '../components/monitors/NetworkDiscoveryModal';
import { MonitorTypeIcon } from '../utils/monitorIcons';
import { MONITOR_TYPE_LABELS, formatMs, formatUptime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

function MiniUptimeGraph({ checks }) {
  if (!checks || checks.length === 0) return <span style={{ color: 'var(--white-40)', fontSize: 12 }}>No data</span>;
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 20, width: 100 }}>
      {checks.map((c, i) => (
        <div 
          key={i} 
          title={`${c.result} - ${c.response_time_ms}ms`}
          style={{ 
            flex: 1, 
            backgroundColor: c.result === 'up' ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)',
            height: '100%',
            borderRadius: 2,
            opacity: c.result === 'up' ? 0.8 : 1
          }} 
        />
      ))}
    </div>
  );
}

export default function Monitors() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOperatorOrAbove, isOrgAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [monitors, setMonitors] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await monitorsApi.list({
        type: typeFilter || undefined,
        search: search || undefined,
        per_page: 100,
      });
      setMonitors(data.data || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load monitors.'));
      setMonitors([]);
    }
  }, [typeFilter, search, toast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function handlePauseToggle(e, monitor) {
    e.stopPropagation();
    try {
      if (monitor.is_paused) {
        await monitorsApi.resume(monitor.id);
        toast.success(`${monitor.name} resumed.`);
      } else {
        await monitorsApi.pause(monitor.id);
        toast.success(`${monitor.name} paused.`);
      }
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleDelete(e, monitor) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${monitor.name}"? This cannot be undone.`)) return;
    try {
      await monitorsApi.remove(monitor.id);
      toast.success(`${monitor.name} deleted.`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  const counts = (monitors || []).reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});

  function handleExport() {
    window.open('/api/v1/monitors/export', '_blank');
  }

  function handleTemplate() {
    window.open('/api/v1/monitors/import-template', '_blank');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    monitorsApi.import(file).then(res => {
      toast.success(res.data.message);
      load();
    }).catch(err => toast.error(apiErrorMessage(err)));
    e.target.value = null; // reset
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Monitors</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            {monitors ? `${monitors.length} monitors` : '...'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleTemplate} title="Download CSV Template"><FileDown size={15} /></button>
          <button className="btn btn-ghost" onClick={handleExport} title="Export Monitors"><Download size={15} /></button>
          {isOperatorOrAbove && (
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }} title="Import Monitors">
              <Upload size={15} />
              <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          )}
          {isOperatorOrAbove && (
            <button className="btn btn-secondary" onClick={() => setShowDiscovery(true)}>
              <Search size={15} />
              Discovery
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} />New Monitor
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="tab-row">
            <button className={`chip${typeFilter === '' ? ' active' : ''}`} onClick={() => setTypeFilter('')}>
              All ({monitors?.length ?? '…'})
            </button>
            {Object.entries(MONITOR_TYPE_LABELS).map(([type, label]) => (
              <button key={type} className={`chip${typeFilter === type ? ' active' : ''}`} onClick={() => setTypeFilter(type)}>
                {label} ({counts[type] || 0})
              </button>
            ))}
          </div>
          <div className="search-box" style={{ maxWidth: 240 }}>
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchParams(e.target.value ? { search: e.target.value } : {});
              }}
            />
          </div>
        </div>

        {monitors === null ? (
          <div className="panel-body"><Skeleton height={300} /></div>
        ) : monitors.length === 0 ? (
          <div className="panel-body">
            <EmptyState
              icon={Activity}
              title="No monitors found"
              subtitle={search || typeFilter ? 'Try adjusting your filters.' : 'Create your first monitor to start tracking uptime.'}
              action={isOperatorOrAbove && !search && !typeFilter && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create monitor</button>
              )}
            />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Monitor</th>
                <th>Status</th>
                <th>History</th>
                <th>Uptime</th>
                <th>Type</th>
                <th>Resp.</th>
                <th>Interval</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => navigate(`/monitors/${m.id}`)}>
                  <td>
                    <div className="mon-name-cell">
                      <div className="mon-type-icon"><MonitorTypeIcon type={m.type} /></div>
                      <div>
                        <div className="mon-name">{m.name}</div>
                        <div className="mon-url">{m.target}</div>
                      </div>
                    </div>
                  </td>
                  <td><StatusPill status={m.status} /></td>
                  <td><MiniUptimeGraph checks={m.recent_checks} /></td>
                  <td>{m.uptime_pct != null ? formatUptime(m.uptime_pct) : '—'}</td>
                  <td><span className="tag">{MONITOR_TYPE_LABELS[m.type]}</span></td>
                  <td className="mon-metric">{formatMs(m.last_response_time_ms)}</td>
                  <td style={{ color: 'var(--white-60)' }}>{m.check_interval_seconds}s</td>
                  <td style={{ textAlign: 'right' }}>
                    {isOperatorOrAbove && (
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/monitors/${m.id}`); }} title="View / Test">
                          <Activity size={14} />
                        </button>
                        <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/monitors/${m.id}`); }} title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button className="icon-btn-sm" onClick={(e) => handlePauseToggle(e, m)} title={m.is_paused ? 'Resume' : 'Pause'}>
                          {m.is_paused ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                        {isOrgAdmin && (
                          <button className="icon-btn-sm" onClick={(e) => handleDelete(e, m)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateMonitorModal
          onClose={() => setShowCreate(false)}
          onCreated={(monitor) => {
            setShowCreate(false);
            load();
            navigate(`/monitors/${monitor.id}`);
          }}
        />
      )}

      {showDiscovery && (
        <NetworkDiscoveryModal
          isOpen={showDiscovery}
          onClose={() => setShowDiscovery(false)}
          onAdded={() => {
            setShowDiscovery(false);
            load();
          }}
        />
      )}
    </>
  );
}
