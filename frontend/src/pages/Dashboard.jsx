import { useEffect, useState } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { TrendingUp, AlertTriangle, Clock, ShieldAlert, Activity, Play, Pause, Trash2 } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { incidentsApi } from '../api/incidents';
import { monitorsApi } from '../api/monitors';
import StatusPill from '../components/ui/StatusPill';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { MonitorTypeIcon } from '../utils/monitorIcons';
import { formatMs, formatUptime, timeAgo } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSoundContext } from '../context/SoundContext';
import SoundControlBar from '../components/sound/SoundControlBar';
import { apiErrorMessage } from '../api/client';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function MiniUptimeGraph({ checks }) {
  if (!checks || checks.length === 0) return <span style={{ color: 'var(--white-40)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>No history</span>;
  return (
    <div style={{ display: 'flex', gap: 2.5, alignItems: 'center', height: 18, width: 110 }} title="Recent Checks (Live)">
      {checks.map((c, i) => {
        const resStr = String(c?.result || (c?.response_time_ms != null && c.response_time_ms > 0 ? 'up' : 'unknown')).toLowerCase();
        const isUp = resStr === 'up';
        const isDegraded = resStr === 'degraded';
        const color = isUp ? '#10b981' : isDegraded ? '#f59e0b' : '#ef4444';
        return (
          <div 
            key={i} 
            title={`${resStr.toUpperCase()} - ${c?.response_time_ms ?? 0}ms`}
            style={{ 
              flex: 1, 
              backgroundColor: color,
              height: '100%',
              borderRadius: 2,
              opacity: isUp ? 0.85 : 1,
              transition: 'transform 0.15s',
              cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scaleY(1.3)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scaleY(1)'}
          />
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOperatorOrAbove, isOrgAdmin } = useAuth();
  const { trackMonitors } = useSoundContext();
  const { summary: ctxSummary } = useOutletContext();
  const [summary, setSummary] = useState(ctxSummary);
  const [series, setSeries] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [monitors, setMonitors] = useState(null);
  const [range, setRange] = useState(24);

  useEffect(() => {
    if (ctxSummary) setSummary(ctxSummary);
  }, [ctxSummary]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data } = await dashboardApi.summary();
        setSummary(data);
      } catch { /* topbar/health-strip already retries this */ }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const { data } = await dashboardApi.responseTimeSeries({ hours: range });
        setSeries(data);
      } catch {
        setSeries([]);
      }
    };
    fetchSeries();
    const interval = setInterval(fetchSeries, 10000);
    return () => clearInterval(interval);
  }, [range]);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const { data } = await incidentsApi.list({ per_page: 5 });
        setIncidents(data.data || []);
      } catch {
        setIncidents([]);
      }
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const { data } = await monitorsApi.list({ per_page: 6 });
        setMonitors(data.data || []);
      } catch {
        setMonitors([]);
      }
    };
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (monitors && monitors.length > 0) {
      trackMonitors(monitors);
    }
  }, [monitors, trackMonitors]);

  const reloadMonitors = async () => {
    try {
      const { data } = await monitorsApi.list({ per_page: 6 });
      setMonitors(data.data || []);
    } catch {}
  };

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
      reloadMonitors();
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
      reloadMonitors();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  const parseTimestamp = (str) => {
    if (!str) return Date.now();
    if (typeof str === 'number') return str;
    const clean = str.includes('T') ? str : str.replace(' ', 'T');
    const d = new Date(clean.endsWith('Z') ? clean : clean + 'Z');
    return isNaN(d.getTime()) ? new Date(str).getTime() : d.getTime();
  };

  let chartPoints = (series || [])
    .map((p) => [parseTimestamp(p.hour_bucket), Math.round(p.avg_ms || 0)])
    .filter((p) => !isNaN(p[0]));

  // Fallback if series is empty but monitors have response time
  if (chartPoints.length === 0 && monitors && monitors.length > 0) {
    const valid = monitors.filter((m) => m.last_response_time_ms != null && m.last_response_time_ms > 0);
    if (valid.length > 0) {
      const avg = Math.round(valid.reduce((acc, m) => acc + Number(m.last_response_time_ms), 0) / valid.length);
      const now = Date.now();
      chartPoints = [
        [now - 3600 * 1000, avg],
        [now, avg],
      ];
    }
  }

  // If only 1 point exists, pad with previous baseline point so ApexCharts area can render
  if (chartPoints.length === 1) {
    const single = chartPoints[0];
    chartPoints = [
      [single[0] - 15 * 60 * 1000, single[1]],
      single,
    ];
  }

  const chartSeries = [{
    name: 'Avg Response Time',
    data: chartPoints,
  }];

  const chartOptions = {
    chart: { type: 'area', height: 240, toolbar: { show: true, tools: { download: true, selection: false, zoom: false, pan: false } }, fontFamily: 'JetBrains Mono, monospace', foreColor: '#9FB0C3', background: 'transparent', animations: { enabled: true, speed: 400 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.2 },
    markers: {
      size: chartPoints.length <= 8 ? 5 : 0,
      strokeWidth: 2,
      strokeColors: '#0e1726',
      hover: { size: 7 },
    },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] } },
    grid: { borderColor: '#22395A', strokeDashArray: 3, padding: { left: 8, right: 8 } },
    xaxis: { type: 'datetime', labels: { style: { fontSize: '10.5px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, forceNiceScale: true, labels: { style: { fontSize: '10.5px' }, formatter: (v) => `${Math.round(v)}ms` } },
    tooltip: { theme: 'dark', x: { format: 'dd MMM, HH:mm' } },
    colors: ['#2E4FA3'],
    legend: { show: false },
  };

  const avgResponseTimeDisplay = () => {
    if (summary?.avg_response_time_ms != null && summary.avg_response_time_ms > 0) {
      return <>{summary.avg_response_time_ms}<span className="unit">ms</span></>;
    }
    if (monitors && monitors.length > 0) {
      const valid = monitors.filter((m) => m.last_response_time_ms != null && m.last_response_time_ms > 0);
      if (valid.length > 0) {
        const avg = Math.round(valid.reduce((acc, m) => acc + Number(m.last_response_time_ms), 0) / valid.length);
        return <>{avg}<span className="unit">ms</span></>;
      }
    }
    if (summary) {
      return <>0<span className="unit">ms</span></>;
    }
    return null;
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #f1f5f9)', letterSpacing: '-0.3px' }}>
            System Overview
          </div>
          <div style={{ fontSize: 13, color: 'var(--white-50)', marginTop: 2 }}>
            Real-time infrastructure health and latency monitoring
          </div>
        </div>
        <SoundControlBar />
      </div>

      <motion.div className="kpi-grid" variants={itemVariants}>
        <KpiCard
          label="Overall Uptime"
          value={summary ? formatUptime(summary.overall_uptime_pct) : null}
          icon={<TrendingUp />}
          iconBg="var(--green-dim)"
          iconColor="var(--green-400)"
          delta={summary ? 'Last 24 hours' : null}
          deltaClass="delta-neutral"
        />
        <KpiCard
          label="Active Incidents"
          value={summary ? String(summary.active_incidents_count) : null}
          icon={<AlertTriangle />}
          iconBg="var(--red-dim)"
          iconColor="var(--red-400)"
          delta={summary ? `${summary.active_incidents_critical || 0} critical` : null}
          deltaClass={summary?.active_incidents_count > 0 ? 'delta-bad' : 'delta-neutral'}
        />
        <KpiCard
          label="Avg Response Time"
          value={avgResponseTimeDisplay()}
          icon={<Clock />}
          iconBg="var(--chakra-dim)"
          iconColor="var(--chakra-400)"
          delta={summary ? 'Last 24 hours' : null}
          deltaClass="delta-neutral"
        />
        <KpiCard
          label="SSL Expiring Soon"
          value={summary ? String(summary.ssl_expiring_soon?.length || 0) : null}
          icon={<ShieldAlert />}
          iconBg="var(--saffron-dim)"
          iconColor="var(--saffron-500)"
          delta={summary?.ssl_expiring_soon?.[0] ? `Next: ${summary.ssl_expiring_soon[0].monitor_name} in ${summary.ssl_expiring_soon[0].days_remaining}d` : 'None expiring soon'}
          deltaClass="delta-neutral"
        />
      </motion.div>

      <motion.div className="row-2" variants={itemVariants}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Response Time</div>
              <div className="panel-sub">All monitors</div>
            </div>
            <div className="tab-row">
              {[{ h: 1, l: 'Live' }, { h: 24, l: '24h' }, { h: 168, l: '7d' }, { h: 720, l: '30d' }].map((opt) => (
                <button key={opt.h} className={`chip${range === opt.h ? ' active' : ''}`} onClick={() => setRange(opt.h)}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body">
            {series && series.length > 0 && (() => {
              const valid = series.filter(s => s.avg_ms != null && s.avg_ms > 0);
              const minMs = valid.length > 0 ? Math.min(...valid.map(s => Math.round(s.avg_ms))) : 0;
              const maxMs = valid.length > 0 ? Math.max(...valid.map(s => Math.round(s.avg_ms))) : 0;
              const avgMs = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + Number(b.avg_ms), 0) / valid.length) : 0;

              return (
                <div className="graph-stats-row">
                  <div className="stat-tag">Min: <span className="val">{minMs}ms</span></div>
                  <div className="stat-tag">Avg: <span className="val">{avgMs}ms</span></div>
                  <div className="stat-tag">Max: <span className="val">{maxMs}ms</span></div>
                  <div className="stat-tag">Range: <span className="val">{range === 1 ? 'Live (1h)' : range === 24 ? '24 Hours' : range === 168 ? '7 Days' : '30 Days'}</span></div>
                </div>
              );
            })()}

            {series === null ? (
              <Skeleton height={240} />
            ) : series.length === 0 ? (
              <EmptyState icon={Activity} title="No data yet" subtitle="Response time history will appear once monitors start running." />
            ) : (
              <Chart options={chartOptions} series={chartSeries} type="area" height={240} />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Recent Incidents</div>
              <div className="panel-sub">Last 5</div>
            </div>
            <Link to="/incidents" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="panel-body">
            {incidents === null ? (
              <Skeleton height={180} />
            ) : incidents.length === 0 ? (
              <EmptyState title="No incidents" subtitle="Everything's running smoothly." />
            ) : (
              incidents.map((inc, i) => (
                <div className="incident-item" key={inc.id}>
                  <div className="incident-dot-col">
                    <div className={`incident-dot ${inc.state === 'resolved' ? 'resolved' : inc.severity === 'degraded' ? 'degraded' : ''}`} />
                    {i < incidents.length - 1 && <div className="incident-line" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="incident-title">{inc.title}</div>
                    <div className="incident-meta">{inc.monitor?.name} · {timeAgo(inc.started_at)}</div>
                  </div>
                  <span className={`incident-state state-${inc.state}`}>{inc.state}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      <motion.div className="panel" variants={itemVariants}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Monitors</div>
            <div className="panel-sub">
              {summary ? `${summary.monitors.total} total · ${summary.monitors.up} up · ${summary.monitors.degraded} degraded · ${summary.monitors.down} down` : '...'}
            </div>
          </div>
          <Link to="/monitors" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        {monitors === null ? (
          <div className="panel-body"><Skeleton height={160} /></div>
        ) : monitors.length === 0 ? (
          <div className="panel-body">
            <EmptyState title="No monitors yet" subtitle="Create your first monitor to start tracking uptime." action={<Link to="/monitors" className="btn btn-primary btn-sm">Create monitor</Link>} />
          </div>
        ) : (
          <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Monitor</th>
                <th>Status</th>
                <th>History</th>
                <th>Uptime</th>
                <th>Resp.</th>
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
                  <td>{m.uptime_pct != null ? formatUptime(m.uptime_pct) : (m.status === 'down' ? '0.00%' : '100.00%')}</td>
                  <td className="mon-metric">{formatMs(m.last_response_time_ms)}</td>
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
          </div>
        )}
      </motion.div>
    </motion.div>
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
