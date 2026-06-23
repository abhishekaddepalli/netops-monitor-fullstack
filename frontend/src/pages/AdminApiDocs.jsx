import { useEffect, useState } from 'react';
import { Code, Key, Building2, ListPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';

export default function AdminApiDocs() {
  const { user } = useAuth();

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Radius API Documentation</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Automated provisioning API for Iconwave Radius Integrations</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title"><Key size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Authentication</div>
            <div className="panel-sub">Authenticating Iconwave Radius requests</div>
          </div>
        </div>
        <div className="panel-body">
          <p style={{ marginBottom: 15, fontSize: 14, color: 'var(--text-secondary)' }}>
            All requests to the Radius integration must use the <code>X-Radius-Key</code> header. You can configure this key in the <strong>Alert Integrations</strong> panel.
          </p>
          <pre className="code-block" style={{ background: '#111', padding: 15, borderRadius: 8, color: '#00ffcc', fontFamily: 'monospace', overflowX: 'auto' }}>
            curl -H "X-Radius-Key: YOUR_RADIUS_KEY" https://api.yourdomain.com/v1/radius/...
          </pre>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title"><Building2 size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Organizations</div>
            <div className="panel-sub">Manage tenant organizations via automation</div>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>Create Organization</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>POST /v1/radius/organizations</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Creates an organization and its primary admin owner.</p>
            <pre className="code-block" style={{ background: '#111', padding: 15, borderRadius: 8, color: '#ddd', fontFamily: 'monospace', overflowX: 'auto' }}>
{`{
  "org_name": "Acme Corp",
  "admin_name": "John Doe",
  "admin_email": "john@acmecorp.com",
  "admin_password": "securepassword123"
}`}
            </pre>
          </div>

          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>Suspend / Unsuspend Organization</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>POST /v1/radius/organizations/{'{id}'}/suspend</code><br/>
              <code>POST /v1/radius/organizations/{'{id}'}/unsuspend</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Suspends or unsuspends an organization, instantly disabling or enabling all of their monitors.</p>
          </div>

          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>Expire / Unexpire Organization</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>POST /v1/radius/organizations/{'{id}'}/expire</code><br/>
              <code>POST /v1/radius/organizations/{'{id}'}/unexpire</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Marks the organization as expired (e.g. for billing cycles).</p>
          </div>

          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>Delete Organization</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>DELETE /v1/radius/organizations/{'{id}'}</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Permanently deletes the organization and all its monitors, checks, and incidents.</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title"><ListPlus size={16} style={{ display: 'inline', marginRight: 8, position: 'relative', top: 2 }} />Billing Plans</div>
            <div className="panel-sub">Automate plan subscriptions</div>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ marginBottom: 25 }}>
            <h4 style={{ marginBottom: 10 }}>Assign Subscription</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <code>POST /v1/radius/subscriptions</code>
            </p>
            <p style={{ fontSize: 13, marginBottom: 10 }}>Subscribes an organization to a predefined billing plan.</p>
            <pre className="code-block" style={{ background: '#111', padding: 15, borderRadius: 8, color: '#ddd', fontFamily: 'monospace', overflowX: 'auto' }}>
{`{
  "organization_id": 12,
  "plan_id": 3
}`}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
