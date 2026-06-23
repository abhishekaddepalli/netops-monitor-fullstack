import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { TrendingUp, AlertTriangle, Clock, ShieldAlert, Activity } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { incidentsApi } from '../api/incidents';
import { monitorsApi } from '../api/monitors';
import StatusPill from '../components/ui/StatusPill';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { MonitorTypeIcon } from '../utils/monitorIcons';
import { formatMs, formatUptime, timeAgo } from '../utils/format';

export default function Dashboard() {
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

  const chartSeries = [{
    name: 'Avg Response Time',
    data: (series || []).map((p) => [new Date(p.hour_bucket.replace(' ', 'T') + 'Z').getTime(), Math.round(p.avg_ms || 0)]),
  }];

  const chartOptions = {
    chart: { type: 'area', height: 240, toolbar: { show: true, tools: { download: true, selection: false, zoom: false, pan: false } }, fontFamily: 'JetBrains Mono, monospace', foreColor: '#9FB0C3', background: 'transparent', animations: { enabled: true, speed: 400 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] } },
    grid: { borderColor: '#22395A', strokeDashArray: 3, padding: { left: 8, right: 8 } },
    xaxis: { type: 'datetime', labels: { style: { fontSize: '10.5px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { fontSize: '10.5px' }, formatter: (v) => `${Math.round(v)}ms` } },
    tooltip: { theme: 'dark', x: { format: 'dd MMM, HH:mm' } },
    colors: ['#2E4FA3'],
    legend: { show: false },
  };

  return (
    <>
      <div className="kpi-grid">
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
          value={summary?.avg_response_time_ms != null ? <>{summary.avg_response_time_ms}<span className="unit">ms</span></> : null}
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
      </div>

      <div className="row-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Response Time</div>
              <div className="panel-sub">All monitors</div>
            </div>
            <div className="tab-row">
              {[{ h: 24, l: '24h' }, { h: 168, l: '7d' }, { h: 720, l: '30d' }].map((opt) => (
                <button key={opt.h} className={`chip${range === opt.h ? ' active' : ''}`} onClick={() => setRange(opt.h)}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body">
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
      </div>

      <div className="panel">
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
          <table className="data-table">
            <thead><tr><th>Monitor</th><th>Status</th><th>Uptime</th><th>Resp.</th></tr></thead>
            <tbody>
              {monitors.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => (window.location.href = `/monitors/${m.id}`)}>
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
                  <td>{m.uptime_pct != null ? formatUptime(m.uptime_pct) : '—'}</td>
                  <td className="mon-metric">{formatMs(m.last_response_time_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
