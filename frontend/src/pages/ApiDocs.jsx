import { Code, Key, Globe2, Activity, Server } from 'lucide-react';

export default function ApiDocs() {
  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">API Documentation</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Integrate NetOps Monitor into your workflows using our REST API</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title"><Key size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Authentication</div>
            <div className="panel-sub">How to authenticate your API requests</div>
          </div>
        </div>
        <div className="panel-body">
          <p style={{ marginBottom: 15, fontSize: 14, color: 'var(--text-secondary)' }}>
            All API requests must be authenticated using an API Key. You can generate API Keys in your <strong>Organization Settings</strong>.
            Pass the API key in the <code>X-API-Key</code> header of your requests.
          </p>
          <pre className="code-block" style={{ background: '#111', padding: 15, borderRadius: 8, color: '#00ffcc', fontFamily: 'monospace', overflowX: 'auto' }}>
            curl -H "X-API-Key: YOUR_API_KEY" https://api.yourdomain.com/v1/monitors
          </pre>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title"><Activity size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Monitors API</div>
            <div className="panel-sub">Manage your monitors programmatically</div>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>List Monitors</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>GET /v1/monitors</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Returns a list of all monitors in your organization.</p>
          </div>
          
          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>Create Monitor</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>POST /v1/monitors</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Creates a new monitor.</p>
            <pre className="code-block" style={{ background: '#111', padding: 15, borderRadius: 8, color: '#ddd', fontFamily: 'monospace', overflowX: 'auto' }}>
{`{
  "name": "Production API",
  "type": "http",
  "target": "https://api.myapp.com",
  "interval_seconds": 60
}`}
            </pre>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title"><Globe2 size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Heartbeat Push (Cron Jobs)</div>
            <div className="panel-sub">Ping the heartbeat endpoint for push monitors</div>
          </div>
        </div>
        <div className="panel-body">
          <p style={{ marginBottom: 15, fontSize: 14, color: 'var(--text-secondary)' }}>
            For <strong>Heartbeat (Cron)</strong> monitors, you must push a signal to NetOps Monitor to let us know your job ran successfully.
            The URL contains a unique token and does not require the X-API-Key header.
          </p>
          <pre className="code-block" style={{ background: '#111', padding: 15, borderRadius: 8, color: '#00ffcc', fontFamily: 'monospace', overflowX: 'auto' }}>
            curl -X POST https://api.yourdomain.com/hb/YOUR_HEARTBEAT_TOKEN
          </pre>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title"><Server size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Incidents API</div>
            <div className="panel-sub">Fetch and manage incidents</div>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>List Incidents</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>GET /v1/incidents</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Returns a list of recent incidents across your monitors.</p>
          </div>
        </div>
      </div>
    </>
  );
}
