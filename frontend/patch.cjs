const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'MonitorDetail.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. We need to add selectedIface to state
if (!content.includes('const [selectedIface, setSelectedIface] = useState(null);')) {
  content = content.replace(
    'const [actionModal, setActionModal] = useState(null);',
    'const [actionModal, setActionModal] = useState(null);\n  const [selectedIface, setSelectedIface] = useState(null);'
  );
}

// 2. Add Activity and ArrowDown/ArrowUp and Chart imports
if (!content.includes('Activity,')) {
  content = content.replace('import { Play, Square, Settings, Wrench } from \'lucide-react\';', 'import { Play, Square, Settings, Wrench, Activity, ArrowDown, ArrowUp } from \'lucide-react\';\nimport Chart from \'react-apexcharts\';');
}

// 3. Add formatBytes
if (!content.includes('formatBytes')) {
  content = content.replace('formatDateTime,', 'formatDateTime, formatBytes,');
}

// 4. Add safeString
if (!content.includes('safeString')) {
  content = content.replace('export default function MonitorDetail() {', 'const safeString = (val) => {\n  if (val === null || val === undefined) return \'\';\n  if (typeof val === \'object\') return JSON.stringify(val);\n  return String(val);\n};\n\nexport default function MonitorDetail() {');
}

// 5. Add bwData useMemo
const bwDataCode = `
  const bwData = useMemo(() => {
    if (!monitor || !serverMetrics || serverMetrics.length < 2) return null;
    const res = {};
    for (let i = serverMetrics.length - 1; i >= 1; i--) {
      const curr = serverMetrics[i];
      const prev = serverMetrics[i - 1];
      const timeDiff = new Date(curr.created_at) - new Date(prev.created_at);
      if (timeDiff <= 0) continue;
      
      const currIfaces = Array.isArray(curr.interfaces) ? curr.interfaces : [];
      const prevIfaces = Array.isArray(prev.interfaces) ? prev.interfaces : [];
      
      for (const cIf of currIfaces) {
        if (!cIf.name) continue;
        const pIf = prevIfaces.find((p) => p.name === cIf.name);
        if (pIf) {
          if (!res[cIf.name]) res[cIf.name] = { in: [], out: [] };
          
          let inDiff = Number(cIf.in_octets) - Number(pIf.in_octets);
          let outDiff = Number(cIf.out_octets) - Number(pIf.out_octets);
          if (inDiff < 0) inDiff = 0;
          if (outDiff < 0) outDiff = 0;
          
          const inMbps = (inDiff * 8) / (timeDiff / 1000) / 1000000;
          const outMbps = (outDiff * 8) / (timeDiff / 1000) / 1000000;
          
          res[cIf.name].in.push([new Date(curr.created_at).getTime(), Number(inMbps.toFixed(2))]);
          res[cIf.name].out.push([new Date(curr.created_at).getTime(), Number(outMbps.toFixed(2))]);
        }
      }
    }
    return res;
  }, [monitor?.server_metrics]);
`;

if (!content.includes('const bwData = useMemo')) {
  content = content.replace('if (!monitor) {', bwDataCode + '\n  if (!monitor) {');
}

// 6. Replace serverMetrics block with ultra-safe one
// First remove the old server_agent block
const oldServerAgentRegex = /\{monitor\.type === 'server_agent' && monitor\.server_metrics\?\.\[0\] && \(\(\) => \{[\s\S]*?\}\)\(\)\}/;
content = content.replace(oldServerAgentRegex, '');

// Now inject the new one!
const newBlock = `
      {(monitor.type === 'server_agent' || monitor.type === 'snmp') && serverMetrics && serverMetrics.length > 0 ? (() => {
        const sm = serverMetrics[0];
        if (!sm) return null;
        const cpuPct = Number(sm.cpu_usage_pct) || 0;
        const ramPct = Number(sm.ram_usage_pct) || 0;
        const diskPct = Number(sm.disk_usage_pct) || 0;
        
        return (
          <React.Fragment>
            <div className="panel" style={{ marginTop: 24, marginBottom: 16, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="text-xl font-bold text-white mb-4">Server Metrics</div>
              <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                 <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
                    <div className="text-white-40 text-xs uppercase mb-2">CPU Usage</div>
                    <div className="text-white text-lg font-bold">{safeString(cpuPct.toFixed(1))}%</div>
                    <div style={{ marginTop: 8, height: 4, background: 'var(--white-10)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: \`\${Math.min(100, cpuPct)}%\`, height: '100%', background: cpuPct > 80 ? 'var(--red-400)' : 'var(--green-400)' }} />
                    </div>
                 </div>
                 <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
                    <div className="text-white-40 text-xs uppercase mb-2">RAM Usage</div>
                    <div className="text-white text-lg font-bold">{safeString(ramPct.toFixed(1))}%</div>
                    <div style={{ marginTop: 8, height: 4, background: 'var(--white-10)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: \`\${Math.min(100, ramPct)}%\`, height: '100%', background: ramPct > 80 ? 'var(--red-400)' : 'var(--green-400)' }} />
                    </div>
                 </div>
                 <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
                    <div className="text-white-40 text-xs uppercase mb-2">Disk Usage</div>
                    <div className="text-white text-lg font-bold">{safeString(diskPct.toFixed(1))}%</div>
                    <div style={{ marginTop: 8, height: 4, background: 'var(--white-10)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: \`\${Math.min(100, diskPct)}%\`, height: '100%', background: diskPct > 80 ? 'var(--red-400)' : 'var(--green-400)' }} />
                    </div>
                 </div>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="p-4 border-b border-navy-700">
                <div className="text-lg font-bold text-white">Network Interfaces</div>
              </div>
              <div style={{ padding: '20px' }}>
                {(!Array.isArray(sm.interfaces) || sm.interfaces.length === 0) ? (
                  <div style={{ textAlign: 'center', color: 'var(--white-40)' }}>No interfaces reported</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {sm.interfaces.map((iface, i) => {
                      if (!iface || typeof iface !== 'object') return null;
                      const hasGraph = bwData && bwData[iface.name] && Array.isArray(bwData[iface.name].in) && bwData[iface.name].in.length > 0;
                      const isSelected = selectedIface === iface.name;
                      const statusUp = typeof iface.status === 'string' && iface.status.toLowerCase() === 'up';
                      return (
                        <div key={i} style={{
                          background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--navy-800)',
                          border: \`1px solid \${isSelected ? 'var(--blue-500)' : 'var(--navy-600)'}\`,
                          borderRadius: 8, padding: 16, position: 'relative',
                          transition: 'all 0.2s',
                          cursor: hasGraph ? 'pointer' : 'default'
                        }} onClick={() => {
                          if (hasGraph) setSelectedIface(isSelected ? null : iface.name);
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, wordBreak: 'break-all' }}>{safeString(iface.name)}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--white-60)' }}>
                                {safeString(Array.isArray(iface.ips) ? iface.ips.join(', ') : 'No IP')}
                              </div>
                            </div>
                            <div>
                              <span className={\`badge \${statusUp ? 'badge-success' : 'badge-error'}\`}>{safeString(iface.status)}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--white-10)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--white-80)' }}>
                              <ArrowDown size={14} className="text-blue-400" />
                              {safeString(formatBytes(iface.in_octets))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--white-80)' }}>
                              <ArrowUp size={14} className="text-green-400" />
                              {safeString(formatBytes(iface.out_octets))}
                            </div>
                          </div>
                          
                          {hasGraph ? (
                            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--blue-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Activity size={12} />
                              {isSelected ? 'Hide Bandwidth Graph' : 'Show Bandwidth Graph'}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {selectedIface && bwData && bwData[selectedIface] ? (
              <div className="panel" style={{ marginBottom: 20 }}>
                <div className="p-4 border-b border-navy-700">
                  <div className="text-lg font-bold text-white">Bandwidth Utilization - {safeString(selectedIface)}</div>
                </div>
                <div className="p-4">
                  <Chart
                    type="area"
                    height={220}
                    series={[
                      { name: 'Inbound (Mbps)', data: Array.isArray(bwData[selectedIface].in) ? bwData[selectedIface].in : [] },
                      { name: 'Outbound (Mbps)', data: Array.isArray(bwData[selectedIface].out) ? bwData[selectedIface].out : [] }
                    ]}
                    options={{
                      chart: { type: 'area', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
                      theme: { mode: 'dark' },
                      colors: ['#10B981', '#3B82F6'],
                      dataLabels: { enabled: false },
                      stroke: { curve: 'smooth', width: 2 },
                      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 90, 100] } },
                      grid: { borderColor: '#22395A', strokeDashArray: 3 },
                      xaxis: { 
                        type: 'datetime',
                        labels: { style: { fontSize: '10.5px', colors: '#94a3b8' } },
                        axisBorder: { show: false },
                        axisTicks: { show: false }
                      },
                      yaxis: { labels: { style: { fontSize: '11px', colors: '#94a3b8' }, formatter: (val) => val ? val.toFixed(1) + ' Mbps' : '0 Mbps' } },
                      tooltip: { theme: 'dark', x: { format: 'dd MMM HH:mm:ss' } }
                    }}
                  />
                </div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })() : null}
`;

const snmpChecksBlock = `
      {monitor.type === 'snmp' && checks && checks.length > 0 ? (() => {
        const lastCheck = checks[0];
        if (!lastCheck) return null;
        let uptimeStr = 'Unknown';
        let sysName = '-';
        let sysDescr = '-';
        if (lastCheck.details && typeof lastCheck.details === 'object') {
           uptimeStr = lastCheck.details.uptime || 'Unknown';
           sysName = lastCheck.details.sysName || '-';
           sysDescr = lastCheck.details.sysDescr || '-';
        }
        return (
          <div className="panel" style={{ marginTop: 20 }}>
            <div className="p-4 border-b border-navy-700">
              <div className="text-lg font-bold text-white">SNMP Live Data</div>
              <div className="text-white-40 text-xs">System information from the most recent check</div>
            </div>
            <div className="p-4">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <div>
                  <div className="text-white-40 text-xs uppercase mb-2">System Name</div>
                  <div className="text-white font-bold">{safeString(sysName)}</div>
                </div>
                <div>
                  <div className="text-white-40 text-xs uppercase mb-2">Device Uptime</div>
                  <div className="text-white font-bold">{safeString(uptimeStr)}</div>
                </div>
                {sysDescr !== '-' ? (
                  <div className="bg-navy-800 p-4 rounded-lg border border-navy-700" style={{ gridColumn: '1 / -1' }}>
                    <div className="text-white-40 text-xs uppercase mb-2">System Description</div>
                    <div className="text-white-80 text-sm leading-relaxed">{safeString(sysDescr)}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })() : null}
`;

const injectTarget = `      </div>
    
      <div className="panel">
        <div className="panel-head"><div className="panel-title">Incident Timeline</div></div>`;

content = content.replace(injectTarget, snmpChecksBlock + '\n' + newBlock + '\n' + injectTarget);


fs.writeFileSync(file, content);
console.log('Patched');
