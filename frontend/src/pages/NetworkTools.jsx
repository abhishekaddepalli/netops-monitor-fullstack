import { useState, useCallback } from 'react';
import { toolsApi } from '../api/tools';
import { Activity, Globe, Shield, Terminal, Zap, Search, Info, MapPin, Download, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TOOLS = [
  { id: 'ping', name: 'Ping', icon: Activity, desc: 'Measure latency and packet loss to a target.' },
  { id: 'traceroute', name: 'Traceroute', icon: MapPin, desc: 'Trace the network path to a specific host.' },
  { id: 'dns', name: 'DNS Lookup', icon: Globe, desc: 'Fetch A, MX, TXT, and CNAME records.' },
  { id: 'port', name: 'Port Scanner', icon: Terminal, desc: 'Check if a specific port is open.' },
  { id: 'ssl', name: 'SSL Decoder', icon: Shield, desc: 'Decode and inspect SSL certificates.' },
  { id: 'headers', name: 'HTTP Headers', icon: Zap, desc: 'Fetch raw HTTP headers from a server.' },
  { id: 'ipinfo', name: 'IP Geolocation', icon: Info, desc: 'Find location and ISP details for an IP.' },
  { id: 'whois', name: 'WHOIS Lookup', icon: Search, desc: 'Query domain registration details.' },
  { id: 'blacklist', name: 'Blacklist Check', icon: AlertTriangle, desc: 'Check if IP/Domain is on spam blacklists.' },
  { id: 'ipreputation', name: 'IP Reputation', icon: ShieldAlert, desc: 'Analyze IP against threat intelligence.' },
  { id: 'snmp-routes', name: 'SNMP Routes', icon: MapPin, desc: 'Fetch routing table via SNMP.' }
];

export default function NetworkTools() {
  const { user } = useAuth();
  const toast = useToast();
  const allowedTools = user?.organization?.effective_features?.allowed_tools || ['ping', 'dns'];

  const [activeTool, setActiveTool] = useState('ping');
  const [target, setTarget] = useState('');
  const [port, setPort] = useState(443);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const activeToolDef = TOOLS.find(t => t.id === activeTool);

  const runTest = async (e) => {
    e.preventDefault();
    if (!target) return;
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      let res;
      if (activeTool === 'port') {
        res = await toolsApi.port({ target, port });
      } else {
        res = await toolsApi[activeTool]({ target });
      }
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format = 'png') => {
    if (!result) return;
    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTool}_result_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const { default: html2canvas } = await import('html2canvas');
      const element = document.getElementById('diagnostic-results-container');
      if (!element) return;
      
      const canvas = await html2canvas(element, { 
        backgroundColor: '#0f172a',
        scale: 2
      });

      if (format === 'png' || format === 'jpg') {
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataURL = canvas.toDataURL(mime);
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `${activeTool}_result_${new Date().getTime()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${activeTool}_result_${new Date().getTime()}.pdf`);
      } else if (format === 'svg') {
        // Basic SVG wrapping the PNG data as image
        const dataURL = canvas.toDataURL('image/png');
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${dataURL}" width="100%" height="100%"/></svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTool}_result_${new Date().getTime()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to generate file:', err);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (activeTool === 'ping' || activeTool === 'traceroute' || activeTool === 'whois') {
      return (
        <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid var(--navy-600)', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#38bdf8', whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
          {result.output || 'No output received.'}
        </div>
      );
    }

    if (activeTool === 'port') {
      const isOpen = result.status === 'open';
      return (
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid var(--navy-600)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: isOpen ? 'var(--success)' : 'var(--danger)', boxShadow: isOpen ? '0 0 10px var(--success)' : '0 0 10px var(--danger)' }}></div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Port {result.port} is {isOpen ? 'OPEN' : 'CLOSED'}</div>
          {result.error && <div style={{ color: 'var(--danger)' }}>{result.error}</div>}
        </div>
      );
    }

    if (activeTool === 'dns') {
      if (!result.records || result.records.length === 0) return <div style={{ padding: 20, color: 'var(--white-60)' }}>No records found.</div>;
      return (
        <table className="data-table">
          <thead>
            <tr><th>Type</th><th>Host</th><th>Target / Value</th><th>TTL</th></tr>
          </thead>
          <tbody>
            {result.records.map((r, i) => (
              <tr key={i}>
                <td>{r.type}</td>
                <td>{r.host}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{r.target || r.ip || r.ipv6 || r.txt || r.mname || '-'}</td>
                <td>{r.ttl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTool === 'ssl') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Issuer</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{result.issuer}</div>
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Subject</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{result.subject}</div>
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Days Remaining</div>
            <div style={{ fontWeight: 800, fontSize: 24, marginTop: 4, color: result.days_remaining > 30 ? 'var(--success)' : 'var(--warning)' }}>{result.days_remaining}</div>
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Valid To</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{result.valid_to}</div>
          </div>
        </div>
      );
    }

    if (activeTool === 'ipinfo') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Location</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{result.city}, {result.country}</div>
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>ISP</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{result.isp}</div>
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Coordinates</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{result.lat}, {result.lon}</div>
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>AS</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{result.as}</div>
          </div>
        </div>
      );
    }
    
    if (activeTool === 'headers') {
      return (
        <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid var(--navy-600)', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#38bdf8', whiteSpace: 'pre-wrap' }}>
          <div style={{ color: 'var(--success)', marginBottom: 10, fontWeight: 700 }}>HTTP {result.status}</div>
          {Object.entries(result.headers || {}).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 4 }}><strong style={{ color: 'var(--white-80)' }}>{k}:</strong> {v.join ? v.join(', ') : v}</div>
          ))}
        </div>
      );
    }

    if (activeTool === 'blacklist') {
      return (
        <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid var(--navy-600)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: result.is_listed ? 'var(--danger)' : 'var(--success)', boxShadow: result.is_listed ? '0 0 10px var(--danger)' : '0 0 10px var(--success)' }}></div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {result.is_listed ? 'Listed on one or more blacklists' : 'Clean - Not listed on any blacklists'}
            </div>
          </div>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--navy-600)' }}>
                <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Provider</th>
                <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Status</th>
                <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--navy-700)' }}>
                  <td style={{ padding: '12px 0' }}>{r.provider}</td>
                  <td style={{ padding: '12px 0', color: r.listed ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {r.listed ? 'LISTED' : 'OK'}
                  </td>
                  <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)' }}>{r.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTool === 'ipreputation') {
      const getScoreColor = (score) => {
        if (score > 80) return 'var(--success)';
        if (score > 40) return 'var(--warning)';
        return 'var(--danger)';
      };
      
      return (
        <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid var(--navy-600)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="panel" style={{ padding: 20, textAlign: 'center', borderColor: getScoreColor(result.score) }}>
              <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Reputation Score</div>
              <div style={{ fontWeight: 800, fontSize: 36, marginTop: 8, color: getScoreColor(result.score) }}>{result.score}/100</div>
            </div>
            <div className="panel" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ color: 'var(--white-60)', fontSize: 12, textTransform: 'uppercase' }}>Verdict</div>
              <div style={{ fontWeight: 700, fontSize: 24, marginTop: 12, color: getScoreColor(result.score) }}>{result.status}</div>
            </div>
          </div>
          
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Threat Detections</h3>
          {result.detections.length === 0 ? (
            <div style={{ color: 'var(--success)', padding: 16, background: 'rgba(59, 214, 113, 0.1)', borderRadius: 8 }}>
              No active threats detected against this IP.
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--navy-600)' }}>
                  <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Threat Type</th>
                  <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Source List</th>
                  <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Indicator</th>
                </tr>
              </thead>
              <tbody>
                {result.detections.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--navy-700)' }}>
                    <td style={{ padding: '12px 0', fontWeight: 600, color: 'var(--danger)' }}>{d.source}</td>
                    <td style={{ padding: '12px 0' }}>{d.list}</td>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)' }}>{d.record}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }

    if (activeTool === 'snmp-routes') {
      if (!result.routes || result.routes.length === 0) return <div style={{ padding: 20, color: 'var(--white-60)' }}>No routes found.</div>;
      return (
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--navy-600)' }}>
              <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Destination</th>
              <th style={{ padding: '10px 0', color: 'var(--white-60)' }}>Next Hop</th>
            </tr>
          </thead>
          <tbody>
            {result.routes.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--navy-700)' }}>
                <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)' }}>{r.destination}</td>
                <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{r.next_hop}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>{JSON.stringify(result, null, 2)}</div>;
  };

  return (
    <>
      <div className="detail-header" style={{ marginBottom: 30 }}>
        <div>
          <div className="detail-title">Diagnostic Tools</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Run real-time network tests and diagnostics directly from our servers.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 30 }}>
        {TOOLS.map(t => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          const isAllowed = allowedTools.includes(t.id);
          return (
            <div 
              key={t.id}
              onClick={() => { 
                if (!isAllowed) {
                  toast.error(`The ${t.name} tool is not available on your current plan. Please upgrade.`);
                  return;
                }
                setActiveTool(t.id); setResult(null); setError(null); 
              }}
              className="panel"
              style={{ 
                padding: 20, 
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                border: isActive ? '1px solid var(--primary-500)' : '1px solid var(--border)',
                background: isActive ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.1) 0%, var(--bg-2) 100%)' : 'var(--bg-2)',
                boxShadow: isActive ? '0 0 20px rgba(14, 165, 233, 0.1)' : 'none',
                opacity: isAllowed ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: isActive ? 'var(--primary-500)' : 'var(--navy-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : 'var(--white-100)' }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: isActive ? 'var(--primary-500)' : 'var(--white-100)' }}>{t.name}</div>
                </div>
                {!isAllowed && <Lock size={16} color="var(--white-40)" />}
              </div>
              <div style={{ color: 'var(--white-60)', fontSize: 13, lineHeight: 1.4 }}>{t.desc}</div>
            </div>
          )
        })}
      </div>

      <div className="panel" style={{ padding: '30px', minHeight: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--navy-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
            {activeToolDef && <activeToolDef.icon size={24} />}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--white-100)' }}>{activeToolDef?.name}</div>
            <div style={{ color: 'var(--white-60)', fontSize: 14 }}>{activeToolDef?.desc}</div>
          </div>
        </div>

        <form onSubmit={runTest} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 30 }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter IP address or domain (e.g. google.com)"
              value={target}
              onChange={e => setTarget(e.target.value)}
              required
              style={{ fontSize: 16, padding: '12px 16px' }}
            />
          </div>
          
          {activeTool === 'port' && (
            <div style={{ width: 100 }}>
              <input 
                type="number" 
                className="form-input" 
                placeholder="Port"
                value={port}
                onChange={e => setPort(e.target.value)}
                required
                style={{ fontSize: 16, padding: '12px 16px' }}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 24px', fontSize: 15 }}>
            {loading ? 'Running...' : 'Run Test'}
          </button>
        </form>

        {error && (
          <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', gap: 16 }}>
            <div className="spinner"></div>
            <div style={{ color: 'var(--white-60)', fontWeight: 500 }}>Executing diagnostic task...</div>
          </div>
        ) : (
          result && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Diagnostic Results</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => handleDownload('png')} style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}>
                    <Download size={16} /> PNG
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleDownload('jpg')} style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}>
                    <Download size={16} /> JPG
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleDownload('pdf')} style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}>
                    <Download size={16} /> PDF
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleDownload('svg')} style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}>
                    <Download size={16} /> SVG
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleDownload('json')} style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}>
                    <Download size={16} /> JSON
                  </button>
                </div>
              </div>
              <div id="diagnostic-results-container" style={{ padding: '2px' }}>
                {renderResult()}
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
