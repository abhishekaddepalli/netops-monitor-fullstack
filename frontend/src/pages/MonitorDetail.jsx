import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { ChevronRight, CheckCircle2, Pencil, Pause, Play, Zap, Copy, Printer } from 'lucide-react';
import { monitorsApi } from '../api/monitors';
import { incidentsApi } from '../api/incidents';
import { apiErrorMessage } from '../api/client';
import StatusPill from '../components/ui/StatusPill';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import EditMonitorModal from '../components/monitors/EditMonitorModal';
import IncidentActionModal from '../components/incidents/IncidentActionModal';
import { MonitorTypeIcon } from '../utils/monitorIcons';
import { MONITOR_TYPE_LABELS, formatMs, timeAgo, formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function MonitorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOperatorOrAbove } = useAuth();
  const [monitor, setMonitor] = useState(null);
  const [checks, setChecks] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [chartRange, setChartRange] = useState('live');
  const [actionModal, setActionModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await monitorsApi.get(id);
      setMonitor(data);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load monitor.'));
      navigate('/monitors');
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    const fetchAll = () => {
      load();
      (async () => {
        try {
          if (chartRange === 'live') {
            const { data } = await monitorsApi.checks(id, { per_page: 200 });
            setChecks((data.data || []).slice().reverse());
          } else {
            const { data } = await monitorsApi.chartData(id, chartRange);
            setChecks(data.data || []);
          }
        } catch { setChecks([]); }
      })();
      (async () => {
        try {
          const { data } = await incidentsApi.list({ per_page: 10 });
          setIncidents((data.data || []).filter((inc) => inc.monitor_id === Number(id)));
        } catch { setIncidents([]); }
      })();
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [id, load, chartRange]);

  async function handleTest() {
    setTesting(true);
    try {
      const { data } = await monitorsApi.test(id);
      toast[data.result === 'up' ? 'success' : 'error'](
        `Test result: ${data.result.toUpperCase()}${data.response_time_ms ? ` (${data.response_time_ms}ms)` : ''}${data.error_message ? ` — ${data.error_message}` : ''}`
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Test failed.'));
    } finally {
      setTesting(false);
    }
  }

  async function handlePauseToggle() {
    try {
      if (monitor.is_paused) {
        await monitorsApi.resume(id);
        toast.success('Monitor resumed.');
      } else {
        await monitorsApi.pause(id);
        toast.success('Monitor paused.');
      }
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function copyHeartbeatUrl() {
    const url = `${window.location.origin}/hb/${monitor.heartbeat_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Heartbeat URL copied.');
  }

  function copyAgentScript(type) {
    const url = `${window.location.origin}/hb/${monitor.heartbeat_token}`;
    let script = '';
    if (type === 'bash') {
      script = `#!/bin/bash\nURL="${url}"\nCPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')\nRAM=$(free | grep Mem | awk '{print $3/$2 * 100.0}')\nDISK=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')\nIFACES=$(ip -o link show | awk -F': ' '{print "{\\"name\\":\\""$2"\\",\\"status\\":\\""($3~/UP/?"UP":"DOWN")"\\"}"}' | paste -sd, -)\ncurl -s -X POST -H "Content-Type: application/json" -d "{\\"cpu_usage_pct\\": $CPU, \\"ram_usage_pct\\": $RAM, \\"disk_usage_pct\\": $DISK, \\"interfaces\\": [$IFACES]}" $URL`;
    } else if (type === 'ps1') {
      script = `$Url = "${url}"\n$Cpu = (Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average\n$Mem = Get-WmiObject Win32_OperatingSystem\n$Ram = [math]::Round((($Mem.TotalVisibleMemorySize - $Mem.FreePhysicalMemory) / $Mem.TotalVisibleMemorySize) * 100, 2)\n$Disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"\n$DiskPct = [math]::Round((($Disk.Size - $Disk.FreeSpace) / $Disk.Size) * 100, 2)\n$Ifaces = Get-NetAdapter | ForEach-Object { @{ name = $_.Name; status = $_.Status } }\n$Body = @{ cpu_usage_pct = $Cpu; ram_usage_pct = $Ram; disk_usage_pct = $DiskPct; interfaces = $Ifaces } | ConvertTo-Json -Depth 3\nInvoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $Body`;
    } else if (type === 'mikrotik') {
      script = `:local url "${url}";\n:local cpu [/system resource get cpu-load];\n:local ramTotal [/system resource get total-memory];\n:local ramFree [/system resource get free-memory];\n:local ramUsed ($ramTotal - $ramFree);\n:local ramPct (($ramUsed * 100) / $ramTotal);\n:local diskTotal [/system resource get total-hdd-space];\n:local diskFree [/system resource get free-hdd-space];\n:local diskPct 0;\n:if ($diskTotal > 0) do={ :set diskPct ((($diskTotal - $diskFree) * 100) / $diskTotal); }\n:local ifaces "";\n:local first 1;\n/interface {\n  :foreach i in=[find] do={\n    :local name [get $i name];\n    :local running [get $i running];\n    :local status "DOWN";\n    :if ($running) do={ :set status "UP"; }\n    :if ($first = 0) do={ :set ifaces "$ifaces,"; }\n    :set ifaces "$ifaces{\\"name\\":\\"$name\\",\\"status\\":\\"$status\\"}";\n    :set first 0;\n  }\n}\n:local payload "{\\"cpu_usage_pct\\":$cpu,\\"ram_usage_pct\\":$ramPct,\\"disk_usage_pct\\":$diskPct,\\"interfaces\\":[$ifaces]}";\n/tool fetch mode=http http-method=post http-header-field="Content-Type: application/json" url=$url http-data=$payload keep-result=no;`;
    } else if (type === 'python') {
      script = `import requests, time, sys\n# pip install pysnmp requests\n# This is a stub SNMP bridge script. \n# Ensure you configure your OLT IP and Community String below:\nOLT_IP = "192.168.1.10"\nCOMMUNITY = "public"\nURL = "${url}"\n\ndef poll_olt():\n    # Implement pysnmp calls here to fetch IF-MIB::ifOperStatus\n    # For demonstration, we simulate data:\n    data = {\n        "cpu_usage_pct": 15.5,\n        "ram_usage_pct": 42.0,\n        "disk_usage_pct": 10.0,\n        "interfaces": [{"name": "PON0/1/1", "status": "UP"}, {"name": "PON0/1/2", "status": "DOWN"}]\n    }\n    requests.post(URL, json=data)\n\nif __name__ == "__main__":\n    poll_olt()`;
    }
    navigator.clipboard.writeText(script);
    
    const names = { bash: 'Bash', ps1: 'PowerShell', mikrotik: 'RouterOS', python: 'Python' };
    toast.success(`${names[type]} script copied to clipboard.`);
  }

  if (!monitor) {
    return <Skeleton height={400} />;
  }

  const chartSeries = [{
    name: 'Response Time',
    data: (checks || []).map((c) => [new Date(c.checked_at).getTime(), c.response_time_ms == null ? 0 : c.response_time_ms]),
  }];

  const chartOptions = {
    chart: { type: 'area', height: 220, toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } }, fontFamily: 'JetBrains Mono, monospace', foreColor: '#9FB0C3', background: 'transparent' },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] } },
    grid: { borderColor: '#22395A', strokeDashArray: 3 },
    xaxis: { 
      type: 'datetime', 
      labels: { 
        style: { fontSize: '10.5px' },
        formatter: function(value, timestamp) {
          try {
            const tz = window.APP_TIMEZONE || 'UTC';
            return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp || value));
          } catch { return value; }
        }
      } 
    },
    yaxis: { labels: { style: { fontSize: '10.5px' }, formatter: (v) => `${Math.round(v)}ms` } },
    tooltip: { 
      theme: 'dark', 
      x: { 
        formatter: function(val) {
          try {
            const tz = window.APP_TIMEZONE || 'UTC';
            const format12h = window.APP_TIME_FORMAT === '12h';
            return new Intl.DateTimeFormat('en-GB', {
              timeZone: tz, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: format12h
            }).format(new Date(val));
          } catch { return val; }
        }
      } 
    },
    colors: [monitor.status === 'down' ? '#DC2626' : '#2E4FA3'],
    legend: { show: false },
    annotations: {
      xaxis: [
        ...(incidents || []).map(inc => ({
          x: new Date(inc.started_at).getTime(),
          x2: inc.resolved_at ? new Date(inc.resolved_at).getTime() : new Date().getTime(),
          fillColor: '#DC2626',
          opacity: 0.15,
        })),
        ...(incidents || []).map(inc => ({
          x: new Date(inc.started_at).getTime(),
          borderColor: '#DC2626',
          label: {
            text: 'DOWN 🔴',
            style: { color: '#fff', background: '#DC2626', fontSize: '10px', fontWeight: 600, padding: { left: 4, right: 4, top: 2, bottom: 2 } }
          }
        })),
        ...(incidents || []).filter(inc => inc.resolved_at).map(inc => ({
          x: new Date(inc.resolved_at).getTime(),
          borderColor: '#10B981',
          label: {
            text: 'UP 🟢',
            style: { color: '#fff', background: '#10B981', fontSize: '10px', fontWeight: 600, padding: { left: 4, right: 4, top: 2, bottom: 2 } }
          }
        }))
      ]
    }
  };

  return (
    <>
      <div className="breadcrumb">
        <Link to="/monitors">Monitors</Link>
        <ChevronRight />
        <span>{monitor.name}</span>
      </div>

      <div className="detail-header">
        <div className="detail-title-row">
          <div className="mon-type-icon" style={{ width: 42, height: 42, borderRadius: 11 }}>
            <MonitorTypeIcon type={monitor.type} size={20} />
          </div>
          <div>
            <div className="detail-title">{monitor.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <StatusPill status={monitor.status} label={monitor.status === 'down' || monitor.status === 'degraded' ? `${monitor.status.toUpperCase()} — ${timeAgo(monitor.status_since).replace(' ago', '')}` : undefined} />
              <span className="mon-url" style={{ color: 'var(--white-40)' }}>{monitor.target}{monitor.port ? `:${monitor.port}` : ''}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => window.print()} title="Download PDF Report">
            <Printer size={15} />Report
          </button>
          {isOperatorOrAbove && (
            <>
              <button className="btn btn-ghost" onClick={handleTest} disabled={testing}>
                <Zap size={15} />{testing ? 'Testing…' : 'Test now'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowEdit(true)}><Pencil size={15} />Edit</button>
              <button className="btn btn-primary" onClick={handlePauseToggle}>
                {monitor.is_paused ? <Play size={15} /> : <Pause size={15} />}
                {monitor.is_paused ? 'Resume Monitor' : 'Pause Monitor'}
              </button>
            </>
          )}
        </div>
      </div>

      {monitor.type === 'heartbeat' && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Heartbeat URL</div>
              <div className="mon-url">{window.location.origin}/hb/{monitor.heartbeat_token}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyHeartbeatUrl}><Copy size={13} />Copy</button>
          </div>
        </div>
      )}

      <div className="metric-strip">
        <div className="metric-box">
          <div className="metric-box-label">Status</div>
          <div className="metric-box-val" style={{ color: monitor.status === 'down' ? 'var(--red-400)' : monitor.status === 'degraded' ? 'var(--saffron-500)' : 'var(--green-400)' }}>
            {monitor.status.charAt(0).toUpperCase() + monitor.status.slice(1)}
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Avg Response</div>
          <div className="metric-box-val">{formatMs(monitor.last_response_time_ms)}</div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Last Check</div>
          <div className="metric-box-val" style={{ fontSize: 14 }}>{timeAgo(monitor.last_checked_at)}</div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Interval</div>
          <div className="metric-box-val">{monitor.check_interval_seconds}s</div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Type</div>
          <div className="metric-box-val" style={{ fontSize: 14 }}>{MONITOR_TYPE_LABELS[monitor.type]}</div>
        </div>
      </div>

      {monitor.type === 'server_agent' && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div className="panel-title">Agent Setup & Instructions</div>
          </div>
          <div className="panel-body">
            <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--white-70)', lineHeight: '1.6' }}>
              <p style={{ marginBottom: 12 }}>To monitor this server, run our lightweight agent script locally. It will automatically gather CPU, RAM, Disk, and Network Interface metrics and securely push them to Netops Monitor.</p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                <button className="btn btn-primary btn-sm" onClick={() => copyAgentScript('bash')}><Copy size={13}/> Copy Bash (Linux)</button>
                <button className="btn btn-ghost btn-sm" onClick={() => copyAgentScript('ps1')}><Copy size={13}/> Copy PowerShell (Windows)</button>
                <button className="btn btn-ghost btn-sm" onClick={() => copyAgentScript('mikrotik')}><Copy size={13}/> Copy RouterOS (MikroTik)</button>
                <button className="btn btn-ghost btn-sm" onClick={() => copyAgentScript('python')}><Copy size={13}/> Copy Python (OLTs/SNMP)</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--white-10)' }}>
                <div>
                  <h4 style={{ color: 'var(--white)', marginBottom: 8, fontSize: 14 }}>Linux Guide (Cron)</h4>
                  <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>Create a script file: <code style={{ background: 'var(--white-10)', padding: '2px 6px', borderRadius: 4 }}>nano netops-agent.sh</code></li>
                    <li>Paste the copied Bash script and save the file.</li>
                    <li>Make it executable: <code style={{ background: 'var(--white-10)', padding: '2px 6px', borderRadius: 4 }}>chmod +x netops-agent.sh</code></li>
                    <li>Open crontab: <code style={{ background: 'var(--white-10)', padding: '2px 6px', borderRadius: 4 }}>crontab -e</code></li>
                    <li>Add this line to run it every minute:<br/>
                        <code style={{ display: 'block', background: 'var(--white-10)', padding: '6px', borderRadius: 4, marginTop: 4 }}>* * * * * /path/to/netops-agent.sh &gt; /dev/null 2&gt;&amp;1</code>
                    </li>
                  </ol>
                </div>
                <div>
                  <h4 style={{ color: 'var(--white)', marginBottom: 8, fontSize: 14 }}>Windows Guide (Task Scheduler)</h4>
                  <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>Create a script file (e.g. <code style={{ background: 'var(--white-10)', padding: '2px 6px', borderRadius: 4 }}>C:\netops-agent.ps1</code>).</li>
                    <li>Paste the copied PowerShell script and save it.</li>
                    <li>Open <strong>Task Scheduler</strong> and click <strong>Create Task</strong>.</li>
                    <li>Set the Trigger to <strong>Daily</strong> and check <strong>Repeat task every: 1 minute</strong>.</li>
                    <li>Set the Action to <strong>Start a program</strong>:<br/>
                        <span style={{ fontSize: 12 }}>Program: <code>powershell.exe</code></span><br/>
                        <span style={{ fontSize: 12 }}>Args: <code>-WindowStyle Hidden -File "C:\netops-agent.ps1"</code></span>
                    </li>
                  </ol>
                </div>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--white-10)', paddingTop: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                    <div>
                      <h4 style={{ color: 'var(--white)', marginBottom: 8, fontSize: 14 }}>MikroTik RouterOS Native Guide</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <li>Log in via Winbox or WebFig.</li>
                        <li>Go to <strong>System</strong> &gt; <strong>Scripts</strong>, click <strong>Add New</strong>.</li>
                        <li>Name it <code>netops-agent</code>, check all policies (read, write, test, policy, etc).</li>
                        <li>Paste the copied RouterOS script into the Source box and save.</li>
                        <li>Go to <strong>System</strong> &gt; <strong>Scheduler</strong>, click <strong>Add New</strong>.</li>
                        <li>Name it <code>run-netops</code>, set Interval to <code>00:01:00</code>.</li>
                        <li>Set On Event to <code>/system script run netops-agent</code>. Apply & OK!</li>
                      </ol>
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--white)', marginBottom: 8, fontSize: 14 }}>OLT / Switch SNMP Bridge Guide</h4>
                      <ol style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <li>Copy the <strong>Python</strong> template script.</li>
                        <li>Save it as <code>olt-bridge.py</code> on an internal server/Raspberry Pi.</li>
                        <li>Open the file and update <code>OLT_IP</code> and <code>COMMUNITY</code> string inside.</li>
                        <li>Install dependencies: <code style={{ background: 'var(--white-10)', padding: '2px 6px', borderRadius: 4 }}>pip install pysnmp requests</code></li>
                        <li>Configure real SNMP OIDs for your specific OLT model inside the script.</li>
                        <li>Schedule it via cron/Task Scheduler exactly like the Linux/Windows guides!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {monitor.type === 'server_agent' && monitor.server_metrics?.[0] && (() => {
        const sm = monitor.server_metrics[0];
        return (
          <>
            <div className="metric-strip" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
               <div className="metric-box">
                  <div className="metric-box-label">CPU Usage</div>
                  <div className="metric-box-val">{Number(sm.cpu_usage_pct).toFixed(1)}%</div>
                  <div style={{ marginTop: 8, height: 4, background: 'var(--white-10)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, sm.cpu_usage_pct)}%`, height: '100%', background: sm.cpu_usage_pct > 80 ? 'var(--red-400)' : 'var(--green-400)' }} />
                  </div>
               </div>
               <div className="metric-box">
                  <div className="metric-box-label">RAM Usage</div>
                  <div className="metric-box-val">{Number(sm.ram_usage_pct).toFixed(1)}%</div>
                  <div style={{ marginTop: 8, height: 4, background: 'var(--white-10)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, sm.ram_usage_pct)}%`, height: '100%', background: sm.ram_usage_pct > 80 ? 'var(--red-400)' : 'var(--green-400)' }} />
                  </div>
               </div>
               <div className="metric-box">
                  <div className="metric-box-label">Disk Usage</div>
                  <div className="metric-box-val">{Number(sm.disk_usage_pct).toFixed(1)}%</div>
                  <div style={{ marginTop: 8, height: 4, background: 'var(--white-10)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, sm.disk_usage_pct)}%`, height: '100%', background: sm.disk_usage_pct > 80 ? 'var(--red-400)' : 'var(--green-400)' }} />
                  </div>
               </div>
            </div>

            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-head">
                <div className="panel-title">Network Interfaces & VLANs</div>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="table">
                  <thead><tr><th>Interface</th><th>Status</th></tr></thead>
                  <tbody>
                    {(sm.interfaces || []).map((iface, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{iface.name}</td>
                        <td><StatusPill status={iface.status?.toLowerCase() === 'up' ? 'up' : 'down'} label={iface.status?.toUpperCase()} /></td>
                      </tr>
                    ))}
                    {(!sm.interfaces || sm.interfaces.length === 0) && (
                      <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--white-40)' }}>No interfaces reported</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      })()}

      <div className="row-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Response Time History</div>
              <div className="panel-sub">
                {chartRange === 'live' ? 'Last 200 checks' : 
                 chartRange === '24h' ? 'Hourly average (Last 24 hours)' : 
                 chartRange === '3d' ? 'Hourly average (Last 3 days)' : 
                 chartRange === '7d' ? 'Hourly average (Last 7 days)' : 
                 'Daily average (Last 30 days)'}
              </div>
            </div>
            <div className="tab-row">
              {['live', '24h', '3d', '7d', '30d'].map(r => (
                <button key={r} className={`chip${chartRange === r ? ' active' : ''}`} onClick={() => setChartRange(r)}>
                  {r === 'live' ? 'Live' : r === '30d' ? '1m' : r}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body">
            {checks === null ? (
              <Skeleton height={220} />
            ) : chartSeries[0].data.length === 0 ? (
              <EmptyState title="No check data yet" subtitle="Data will appear once this monitor has run." />
            ) : (
              <Chart options={chartOptions} series={chartSeries} type="area" height={220} />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div className="panel-title">SSL Certificate</div></div>
          <div className="panel-body">
            {monitor.ssl_certificate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Row label="Issuer" value={monitor.ssl_certificate.issuer} />
                <Row label="Valid until" value={formatDateTime(monitor.ssl_certificate.valid_to)} mono />
                <Row label="Signature algo" value={monitor.ssl_certificate.signature_algorithm} />
                <Row label="Days remaining" value={<StatusPill status={monitor.ssl_certificate.days_remaining > 15 ? 'up' : 'degraded'} label={`${monitor.ssl_certificate.days_remaining} days`} />} />
              </div>
            ) : (
              <EmptyState title="No SSL data" subtitle={monitor.type === 'ssl' ? 'Will populate after the first check.' : 'Only tracked for SSL-type monitors.'} />
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="panel-title">Incident Timeline</div></div>
        <div className="panel-body">
          {incidents === null ? (
            <Skeleton height={100} />
          ) : incidents.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No incidents" subtitle="This monitor has had no incidents." />
          ) : (
            incidents.map((inc, i) => (
              <div className="incident-item" key={inc.id} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 16 }}>
                  <div className="incident-dot-col" style={{ position: 'relative' }}>
                    <div className={`incident-dot ${inc.state === 'resolved' ? 'resolved' : ''}`} />
                    {i < incidents.length - 1 && <div className="incident-line" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="incident-title">{inc.title}</div>
                    <div className="incident-meta">{timeAgo(inc.started_at)}{inc.resolved_at ? ` · resolved ${timeAgo(inc.resolved_at)}` : ''}</div>
                  </div>
                  {isOperatorOrAbove && inc.state !== 'resolved' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {!inc.acknowledged_at && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setActionModal({ incident: inc, type: 'acknowledge' })}>Acknowledge</button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setActionModal({ incident: inc, type: 'resolve' })}>Resolve</button>
                    </div>
                  )}
                  <span className={`incident-state state-${inc.state}`}>{inc.state}</span>
                </div>

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

      {showEdit && (
        <EditMonitorModal 
          monitor={monitor} 
          onClose={() => setShowEdit(false)} 
          onUpdated={() => { setShowEdit(false); load(); }} 
        />
      )}

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

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--white-40)', fontSize: 12.5 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value || '—'}</span>
    </div>
  );
}
