import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { apiClient, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { 
  Code, Key, Copy, CheckCircle, ShieldCheck, Zap, Sliders, Play, 
  Terminal, Server, RefreshCw, Layers, Check, ExternalLink, AlertTriangle, BookOpen
} from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';

export default function AdminApiDocs() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [activeTab, setActiveTab] = useState('endpoints'); // 'endpoints', 'code', 'sandbox'
  const [codeLang, setCodeLang] = useState('oneradius'); // 'oneradius', 'iconwave', 'curl', 'nodejs', 'mikrotik'

  // Radius Settings State
  const [settings, setSettings] = useState({
    radius_enabled: true,
    radius_api_key: '',
    radius_allow_provision: true,
    radius_allow_suspend: true,
    radius_allow_expire: true,
    radius_allow_edit: true,
    radius_allow_delete: true,
    radius_allow_plan_change: true,
    radius_default_plan_id: '',
    api_base_url: `${window.location.origin}/api/v1/radius`,
  });

  const [plans, setPlans] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Sandbox State
  const [sandboxAction, setSandboxAction] = useState('list_plans');
  const [sandboxParams, setSandboxParams] = useState({
    org_name: 'Acme Broadband Customer',
    admin_name: 'Rajesh Kumar',
    admin_email: 'rajesh@acmebroadband.in',
    plan_key: 'pro',
    radius_username: 'isp_user_9921',
    org_id: '1',
    reason: 'Account suspended for billing non-payment',
  });
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState(null);

  useEffect(() => {
    Promise.all([
      adminApi.getRadiusSettings().catch(() => ({ data: {} })),
      adminApi.listPlans().catch(() => ({ data: [] })),
    ]).then(([resSettings, resPlans]) => {
      if (resSettings.data) {
        setSettings((s) => ({
          ...s,
          ...resSettings.data,
          api_base_url: resSettings.data.api_base_url || `${window.location.origin}/api/v1/radius`,
        }));
      }
      if (resPlans.data) {
        setPlans(Array.isArray(resPlans.data) ? resPlans.data : (resPlans.data.data || []));
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const { data } = await adminApi.updateRadiusSettings(settings);
      setSettings((s) => ({ ...s, ...data }));
      toast.success('Radius integration settings saved successfully.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save Radius settings.'));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleGenerateKey() {
    if (!window.confirm('Generating a new API Key will invalidate existing RADIUS hooks. Continue?')) return;
    setGeneratingKey(true);
    const newKey = 'rad_' + Math.random().toString(36).substring(2, 12) + '_' + Math.random().toString(36).substring(2, 12);
    try {
      const { data } = await adminApi.updateRadiusSettings({ radius_api_key: newKey });
      setSettings((s) => ({ ...s, ...data, radius_api_key: newKey }));
      toast.success('New Radius API Key generated!');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to generate key.'));
    } finally {
      setGeneratingKey(false);
    }
  }

  function copyKey() {
    if (!settings.radius_api_key) return;
    navigator.clipboard.writeText(settings.radius_api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success('Radius API Key copied to clipboard.');
  }

  function copyUrl() {
    navigator.clipboard.writeText(settings.api_base_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('Radius Base URL copied.');
  }

  // Execute Sandbox Request
  async function runSandbox() {
    setSandboxRunning(true);
    setSandboxResponse(null);
    try {
      let res;
      const headers = {
        'Authorization': `Bearer ${settings.radius_api_key}`,
        'Content-Type': 'application/json',
      };

      if (sandboxAction === 'list_plans') {
        res = await apiClient.get('/v1/radius/plans', { headers });
      } else if (sandboxAction === 'list_orgs') {
        res = await apiClient.get('/v1/radius/organizations', { headers });
      } else if (sandboxAction === 'provision') {
        res = await apiClient.post('/v1/radius/provision', {
          org_name: sandboxParams.org_name,
          admin_name: sandboxParams.admin_name,
          admin_email: sandboxParams.admin_email,
          plan_key: sandboxParams.plan_key,
          radius_username: sandboxParams.radius_username,
        }, { headers });
      } else if (sandboxAction === 'suspend') {
        res = await apiClient.post(`/v1/radius/organizations/${sandboxParams.org_id}/suspend`, {
          reason: sandboxParams.reason,
        }, { headers });
      } else if (sandboxAction === 'unsuspend') {
        res = await apiClient.post(`/v1/radius/organizations/${sandboxParams.org_id}/unsuspend`, {}, { headers });
      } else if (sandboxAction === 'status') {
        res = await apiClient.get(`/v1/radius/organizations/${sandboxParams.org_id}/status`, { headers });
      }

      setSandboxResponse({
        status: res.status,
        statusText: res.statusText || 'OK',
        data: res.data,
      });
      toast.success(`Request completed with HTTP ${res.status}`);
    } catch (err) {
      setSandboxResponse({
        status: err.response?.status || 500,
        statusText: err.response?.statusText || 'Error',
        data: err.response?.data || { error: err.message },
      });
      toast.error(`Request returned HTTP ${err.response?.status || 500}`);
    } finally {
      setSandboxRunning(false);
    }
  }

  if (loading) return <Skeleton height={420} />;

  const baseUrl = settings.api_base_url || `${window.location.origin}/api/v1/radius`;
  const apiKey = settings.radius_api_key || 'YOUR_RADIUS_API_KEY';

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Code color="#38bdf8" /> Radius ISP Integration & API Management
          </div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Integrate NetOps Monitor into ISP billing & RADIUS engines (OneRadius, Iconwave, Splynx, Mikrotik) to offer network monitoring as a managed customer add-on.
          </div>
        </div>
      </div>

      {/* ── Section 1: Master Credentials & Base URL ── */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} color="#f59e0b" /> API Key & Authentication
            </div>
            <span className={`pill ${settings.radius_enabled ? 'pill-up' : 'pill-down'}`}>
              {settings.radius_enabled ? '● RADIUS API ENABLED' : '○ RADIUS API DISABLED'}
            </span>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--white-70)', margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            Authenticate all external API requests from your RADIUS billing platform using either the HTTP header{' '}
            <code>Authorization: Bearer &lt;KEY&gt;</code> or <code>X-Radius-Key: &lt;KEY&gt;</code>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 }}>
            {/* Radius API Key */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Radius API Secret Key</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={settings.radius_api_key || 'No key generated yet'} 
                  readOnly 
                  style={{ fontFamily: 'var(--font-mono)', background: 'var(--navy-900)', color: '#38bdf8' }}
                />
                {settings.radius_api_key && (
                  <button className="btn btn-secondary" onClick={copyKey} title="Copy Key">
                    {copiedKey ? <Check size={15} color="#4ade80" /> : <Copy size={15} />}
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleGenerateKey} disabled={generatingKey} style={{ whiteSpace: 'nowrap' }}>
                  <RefreshCw size={14} className={generatingKey ? 'spin' : ''} style={{ marginRight: 6 }} />
                  {settings.radius_api_key ? 'Regenerate' : 'Generate Key'}
                </button>
              </div>
            </div>

            {/* Base Endpoint URL */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">API Base URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={baseUrl} 
                  readOnly 
                  style={{ fontFamily: 'var(--font-mono)', background: 'var(--navy-900)' }}
                />
                <button className="btn btn-secondary" onClick={copyUrl} title="Copy Base URL">
                  {copiedUrl ? <Check size={15} color="#4ade80" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Super Admin Radius Feature Toggles ── */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={16} color="#38bdf8" /> Super Admin ISP Feature Toggles
              </div>
              <div className="panel-sub">
                Selectively grant or deny which actions external RADIUS / ISP software can execute via API.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Toggles'}
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {/* Master Switch */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Master RADIUS Switch</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>Enable or disable all external API calls</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_enabled} 
                onChange={(e) => setSettings({ ...settings, radius_enabled: e.target.checked })}
              />
            </div>

            {/* Allow Provisioning */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Allow Provisioning (Add)</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>POST /provision customer account creation</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_allow_provision} 
                onChange={(e) => setSettings({ ...settings, radius_allow_provision: e.target.checked })}
              />
            </div>

            {/* Allow Suspend */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Allow Suspend & Unsuspend</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>Pause monitoring when ISP plan is unpaid</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_allow_suspend} 
                onChange={(e) => setSettings({ ...settings, radius_allow_suspend: e.target.checked })}
              />
            </div>

            {/* Allow Expire */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Allow Expire & Unexpire</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>Mark account expired on cycle end</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_allow_expire} 
                onChange={(e) => setSettings({ ...settings, radius_allow_expire: e.target.checked })}
              />
            </div>

            {/* Allow Plan Changes */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Allow Plan Upgrade/Downgrade</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>Switch tiers when ISP speed plan changes</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_allow_plan_change} 
                onChange={(e) => setSettings({ ...settings, radius_allow_plan_change: e.target.checked })}
              />
            </div>

            {/* Allow Edit */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Allow Edit Organization</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>Update customer name, contact & limits</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_allow_edit} 
                onChange={(e) => setSettings({ ...settings, radius_allow_edit: e.target.checked })}
              />
            </div>

            {/* Allow Deletion */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Allow Deprovision (Delete)</div>
                <div style={{ fontSize: 11, color: 'var(--white-50)' }}>DELETE /organizations/{'{id}'} removal</div>
              </div>
              <input 
                type="checkbox" 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
                checked={settings.radius_allow_delete} 
                onChange={(e) => setSettings({ ...settings, radius_allow_delete: e.target.checked })}
              />
            </div>

            {/* Default Plan */}
            <div style={{ padding: 12, background: 'var(--navy-900)', borderRadius: 8, border: '1px solid var(--navy-700)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-90)' }}>Default Plan for Provisioning</div>
              <select 
                className="form-select" 
                value={settings.radius_default_plan_id || ''}
                onChange={(e) => setSettings({ ...settings, radius_default_plan_id: e.target.value })}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                <option value="">Auto-assign first active plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.key}) - {p.monitor_limit} Monitors</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--navy-border)', paddingBottom: 10 }}>
        <button 
          className={`btn btn-sm ${activeTab === 'endpoints' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('endpoints')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={15} /> Endpoints Reference (11)
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'code' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('code')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Code size={15} /> OneRadius & ISP Code Examples
        </button>
        <button 
          className={`btn btn-sm ${activeTab === 'sandbox' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('sandbox')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Play size={15} /> Interactive API Sandbox
        </button>
      </div>

      {/* ── TAB 1: API Endpoints Reference ── */}
      {activeTab === 'endpoints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Provision */}
          <EndpointCard 
            method="POST" 
            path="/provision" 
            baseUrl={baseUrl}
            title="1. Provision Customer & Add-on Subscription"
            description="Creates a new customer organization, generates an admin user, provisions a monthly subscription, and dispatches credentials via email."
            requestJson={{
              org_name: "Apex Broadband Customer",
              admin_email: "customer@example.com",
              admin_name: "Customer Name (optional)",
              admin_password: "custom_password_or_leave_empty",
              plan_key: "pro",
              radius_username: "isp_subscriber_1042",
              phone: "919876543210",
              monitor_limit: 25
            }}
            responseJson={{
              success: true,
              message: "Organization provisioned successfully.",
              organization: {
                id: 42,
                name: "Apex Broadband Customer",
                slug: "apex-broadband-customer-7fa1",
                plan: "pro",
                monitor_limit: 25,
                radius_username: "isp_subscriber_1042",
                is_suspended: false,
                created_at: "2026-10-27T12:00:00Z"
              },
              admin_user: {
                id: 88,
                name: "Customer Name",
                email: "customer@example.com",
                temporary_password: "generated_password_if_blank"
              },
              login_url: `${window.location.origin}/login`
            }}
          />

          {/* 2. Suspend */}
          <EndpointCard 
            method="POST" 
            path="/organizations/{id}/suspend" 
            baseUrl={baseUrl}
            title="2. Suspend (Disable) Organization"
            description="Instantly disables monitoring and user logins when customer broadband service is disconnected or unpaid. You can identify by ID or radius_username."
            requestJson={{
              reason: "Suspended due to overdue ISP invoice #INV-9921"
            }}
            responseJson={{
              success: true,
              message: "Organization 'Apex Broadband Customer' suspended successfully.",
              organization_id: 42,
              is_suspended: true,
              suspension_reason: "Suspended due to overdue ISP invoice #INV-9921"
            }}
          />

          {/* 3. Unsuspend */}
          <EndpointCard 
            method="POST" 
            path="/organizations/{id}/unsuspend" 
            baseUrl={baseUrl}
            title="3. Unsuspend (Enable) Organization"
            description="Re-enables active monitoring and login access immediately after payment is received in RADIUS."
            requestJson={{}}
            responseJson={{
              success: true,
              message: "Organization 'Apex Broadband Customer' unsuspended successfully.",
              organization_id: 42,
              is_suspended: false
            }}
          />

          {/* 4. Expire */}
          <EndpointCard 
            method="POST" 
            path="/organizations/{id}/expire" 
            baseUrl={baseUrl}
            title="4. Expire Organization"
            description="Marks the organization's subscription period as expired."
            requestJson={{}}
            responseJson={{
              success: true,
              message: "Organization marked as expired.",
              organization_id: 42,
              is_expired: true
            }}
          />

          {/* 5. Unexpire */}
          <EndpointCard 
            method="POST" 
            path="/organizations/{id}/unexpire" 
            baseUrl={baseUrl}
            title="5. Unexpire Organization"
            description="Restores an expired organization back to active subscription status."
            requestJson={{}}
            responseJson={{
              success: true,
              message: "Organization unexpired.",
              organization_id: 42,
              is_expired: false
            }}
          />

          {/* 6. Change Plan */}
          <EndpointCard 
            method="POST" 
            path="/organizations/{id}/change-plan" 
            baseUrl={baseUrl}
            title="6. Upgrade or Downgrade Subscription Plan"
            description="Upgrades or downgrades the subscriber's monitoring plan and limits when they switch ISP tiers."
            requestJson={{
              plan_key: "enterprise"
            }}
            responseJson={{
              success: true,
              message: "Plan changed to 'Enterprise' successfully.",
              organization: {
                id: 42,
                plan: "enterprise",
                monitor_limit: 100
              },
              new_plan: {
                id: 3,
                name: "Enterprise Plan",
                key: "enterprise",
                monitor_limit: 100
              }
            }}
          />

          {/* 7. Update Details */}
          <EndpointCard 
            method="PUT" 
            path="/organizations/{id}" 
            baseUrl={baseUrl}
            title="7. Edit Customer Details & Monitor Limits"
            description="Updates organization contact email, address, phone, or custom monitor limit."
            requestJson={{
              name: "Apex Broadband Customer Pvt Ltd",
              phone: "919876543210",
              monitor_limit: 30
            }}
            responseJson={{
              success: true,
              message: "Organization updated successfully."
            }}
          />

          {/* 8. Get Status */}
          <EndpointCard 
            method="GET" 
            path="/organizations/{id}/status" 
            baseUrl={baseUrl}
            title="8. Query Live Organization Health & Metrics"
            description="Returns current monitor count, uptime status, active incidents, and plan utilization."
            requestJson={null}
            responseJson={{
              success: true,
              organization: {
                id: 42,
                name: "Apex Broadband Customer",
                plan: "pro",
                monitor_limit: 25,
                is_suspended: false,
                is_expired: false
              },
              usage: {
                monitors_total: 12,
                monitors_up: 11,
                monitors_down: 1,
                monitors_available: 13,
                active_incidents: 1
              },
              admin_contact: {
                name: "Customer Name",
                email: "customer@example.com"
              }
            }}
          />

          {/* 9. List Plans */}
          <EndpointCard 
            method="GET" 
            path="/plans" 
            baseUrl={baseUrl}
            title="9. List Available Add-on Plans"
            description="Returns list of available monitoring plans to display in your ISP customer self-service portal."
            requestJson={null}
            responseJson={{
              success: true,
              plans: [
                { id: 1, key: "basic", name: "Basic Monitor", price: 299, monitor_limit: 10 },
                { id: 2, key: "pro", name: "Pro ISP Addon", price: 799, monitor_limit: 50 },
                { id: 3, key: "enterprise", name: "Enterprise NOC", price: 1999, monitor_limit: 200 }
              ]
            }}
          />

          {/* 10. List Organizations */}
          <EndpointCard 
            method="GET" 
            path="/organizations" 
            baseUrl={baseUrl}
            title="10. List All Managed Subscribers"
            description="Returns paginated list of all subscriber organizations with status filter and search query."
            requestJson={null}
            responseJson={{
              success: true,
              data: [
                { id: 42, name: "Apex Customer", plan: "pro", is_suspended: false }
              ],
              total: 1
            }}
          />

          {/* 11. Deprovision */}
          <EndpointCard 
            method="DELETE" 
            path="/organizations/{id}" 
            baseUrl={baseUrl}
            title="11. Deprovision (Delete) Customer"
            description="Permanently deletes the customer organization, stopping all background monitors and alerts."
            requestJson={null}
            responseJson={{
              success: true,
              message: "Organization deprovisioned and deleted successfully."
            }}
          />
        </div>
      )}

      {/* ── TAB 2: Ready Code Snippets ── */}
      {activeTab === 'code' && (
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div className="panel-title">Copy-Paste Integration Snippets</div>
              <div className="tab-row" style={{ margin: 0 }}>
                <button 
                  className={`chip${codeLang === 'oneradius' ? ' active' : ''}`}
                  onClick={() => setCodeLang('oneradius')}
                >
                  OneRadius / PHP
                </button>
                <button 
                  className={`chip${codeLang === 'iconwave' ? ' active' : ''}`}
                  onClick={() => setCodeLang('iconwave')}
                >
                  Iconwave / Python
                </button>
                <button 
                  className={`chip${codeLang === 'curl' ? ' active' : ''}`}
                  onClick={() => setCodeLang('curl')}
                >
                  cURL (CLI)
                </button>
                <button 
                  className={`chip${codeLang === 'nodejs' ? ' active' : ''}`}
                  onClick={() => setCodeLang('nodejs')}
                >
                  Node.js
                </button>
                <button 
                  className={`chip${codeLang === 'mikrotik' ? ' active' : ''}`}
                  onClick={() => setCodeLang('mikrotik')}
                >
                  Mikrotik RouterOS
                </button>
              </div>
            </div>
          </div>
          <div className="panel-body">
            {codeLang === 'oneradius' && (
              <div>
                <p style={{ color: 'var(--white-70)', fontSize: 13, marginBottom: 12 }}>
                  Drop this function into your <strong>OneRadius / FreeRADIUS</strong> post-auth or billing hook (e.g. on new customer signup or package change):
                </p>
                <CodeBlock 
                  lang="php" 
                  code={`<?php
/**
 * NetOps Monitor Add-on Integration for OneRadius / Splynx
 */
function netops_provision_customer($subscriber) {
    $apiKey = '${apiKey}';
    $endpoint = '${baseUrl}/provision';

    $payload = [
        'org_name'        => $subscriber['company_name'] ?? $subscriber['full_name'],
        'admin_email'     => $subscriber['email'],
        'admin_name'      => $subscriber['full_name'],
        'plan_key'        => $subscriber['addon_plan_key'] ?? 'pro',
        'radius_username' => $subscriber['radius_username'],
        'phone'           => $subscriber['phone'] ?? null,
    ];

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);
    if ($httpCode === 201) {
        // Save NetOps Organization ID into your RADIUS subscriber metadata
        $netopsOrgId = $result['organization']['id'];
        return $netopsOrgId;
    }

    error_log("NetOps Provisioning Failed: " . $response);
    return false;
}

// Suspend Customer when ISP bill is unpaid
function netops_suspend_customer($netopsOrgId, $reason = 'Billing suspended') {
    $apiKey = '${apiKey}';
    $endpoint = "${baseUrl}/organizations/{$netopsOrgId}/suspend";

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['reason' => $reason]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}`} 
                />
              </div>
            )}

            {codeLang === 'iconwave' && (
              <div>
                <p style={{ color: 'var(--white-70)', fontSize: 13, marginBottom: 12 }}>
                  Python integration module for <strong>Iconwave Radius / Python Billing Services</strong>:
                </p>
                <CodeBlock 
                  lang="python" 
                  code={`import requests

BASE_URL = "${baseUrl}"
API_KEY = "${apiKey}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def provision_subscriber(username, email, company_name, plan="pro"):
    """Call NetOps Monitor API to provision customer add-on"""
    payload = {
        "org_name": company_name,
        "admin_email": email,
        "plan_key": plan,
        "radius_username": username
    }
    resp = requests.post(f"{BASE_URL}/provision", json=payload, headers=headers, timeout=10)
    if resp.status_code == 201:
        data = resp.json()
        print(f"Customer provisioned! Org ID: {data['organization']['id']}")
        return data["organization"]["id"]
    else:
        print(f"Error ({resp.status_code}):", resp.text)
        return None

def toggle_suspension(org_id, suspend=True, reason="ISP payment overdue"):
    """Suspend or unsuspend subscriber access"""
    action = "suspend" if suspend else "unsuspend"
    url = f"{BASE_URL}/organizations/{org_id}/{action}"
    resp = requests.post(url, json={"reason": reason}, headers=headers, timeout=10)
    return resp.json()`}
                />
              </div>
            )}

            {codeLang === 'curl' && (
              <div>
                <p style={{ color: 'var(--white-70)', fontSize: 13, marginBottom: 12 }}>
                  Standard cURL commands for command-line scripting and shell-based automations:
                </p>
                <CodeBlock 
                  lang="bash" 
                  code={`# 1. Provision a New Organization
curl -X POST "${baseUrl}/provision" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "org_name": "Apex Broadband Customer",
    "admin_email": "ops@apexbroadband.com",
    "admin_name": "NOC Engineer",
    "plan_key": "pro",
    "radius_username": "isp_apex_902"
  }'

# 2. Suspend Customer by ID
curl -X POST "${baseUrl}/organizations/42/suspend" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"reason": "Invoice unpaid"}'

# 3. Unsuspend Customer
curl -X POST "${baseUrl}/organizations/42/unsuspend" \\
  -H "Authorization: Bearer ${apiKey}"

# 4. Check Customer Monitor Status & Metrics
curl -X GET "${baseUrl}/organizations/42/status" \\
  -H "Authorization: Bearer ${apiKey}"`}
                />
              </div>
            )}

            {codeLang === 'nodejs' && (
              <div>
                <p style={{ color: 'var(--white-70)', fontSize: 13, marginBottom: 12 }}>
                  Node.js / Express integration using standard <code>axios</code>:
                </p>
                <CodeBlock 
                  lang="javascript" 
                  code={`const axios = require('axios');

const netopsClient = axios.create({
  baseURL: '${baseUrl}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
});

// Provision add-on
async function provisionAddon(subscriber) {
  try {
    const { data } = await netopsClient.post('/provision', {
      org_name: subscriber.name,
      admin_email: subscriber.email,
      plan_key: subscriber.plan || 'pro',
      radius_username: subscriber.username
    });
    return data.organization.id;
  } catch (error) {
    console.error('NetOps provisioning failed:', error.response?.data || error.message);
  }
}`}
                />
              </div>
            )}

            {codeLang === 'mikrotik' && (
              <div>
                <p style={{ color: 'var(--white-70)', fontSize: 13, marginBottom: 12 }}>
                  Mikrotik RouterOS script (User Manager / Hotspot trigger):
                </p>
                <CodeBlock 
                  lang="routeros" 
                  code={`# Mikrotik RouterOS HTTP Fetch trigger
/tool fetch url="${baseUrl}/organizations/42/suspend" \\
  http-method=post \\
  http-header-field="Authorization: Bearer ${apiKey},Content-Type: application/json" \\
  http-data="{\\"reason\\":\\"Mikrotik bandwidth quota reached\\"}" \\
  output=user`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Interactive API Sandbox ── */}
      {activeTab === 'sandbox' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={16} color="#10b981" /> Live RADIUS API Sandbox Simulator
              </div>
              <div className="panel-sub">
                Test API endpoints against your live database using your active RADIUS credentials.
              </div>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 24 }}>
              {/* Request Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select API Action</label>
                  <select 
                    className="form-select"
                    value={sandboxAction}
                    onChange={(e) => {
                      setSandboxAction(e.target.value);
                      setSandboxResponse(null);
                    }}
                  >
                    <option value="list_plans">GET /plans (List Available Plans)</option>
                    <option value="list_orgs">GET /organizations (List Managed Subscribers)</option>
                    <option value="provision">POST /provision (Provision Customer Account)</option>
                    <option value="suspend">POST /organizations/{'{id}'}/suspend (Suspend Access)</option>
                    <option value="unsuspend">POST /organizations/{'{id}'}/unsuspend (Resume Access)</option>
                    <option value="status">GET /organizations/{'{id}'}/status (Check Live Status)</option>
                  </select>
                </div>

                {sandboxAction === 'provision' && (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Organization / Customer Name</label>
                      <input 
                        className="form-input" 
                        value={sandboxParams.org_name} 
                        onChange={(e) => setSandboxParams({ ...sandboxParams, org_name: e.target.value })} 
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Admin Email</label>
                        <input 
                          type="email"
                          className="form-input" 
                          value={sandboxParams.admin_email} 
                          onChange={(e) => setSandboxParams({ ...sandboxParams, admin_email: e.target.value })} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Plan Key</label>
                        <input 
                          className="form-input" 
                          value={sandboxParams.plan_key} 
                          onChange={(e) => setSandboxParams({ ...sandboxParams, plan_key: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">RADIUS Subscriber Username</label>
                      <input 
                        className="form-input" 
                        value={sandboxParams.radius_username} 
                        onChange={(e) => setSandboxParams({ ...sandboxParams, radius_username: e.target.value })} 
                      />
                    </div>
                  </>
                )}

                {['suspend', 'unsuspend', 'status'].includes(sandboxAction) && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Organization ID</label>
                    <input 
                      className="form-input" 
                      value={sandboxParams.org_id} 
                      onChange={(e) => setSandboxParams({ ...sandboxParams, org_id: e.target.value })} 
                      placeholder="e.g. 1" 
                    />
                  </div>
                )}

                {sandboxAction === 'suspend' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Suspension Reason</label>
                    <input 
                      className="form-input" 
                      value={sandboxParams.reason} 
                      onChange={(e) => setSandboxParams({ ...sandboxParams, reason: e.target.value })} 
                    />
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  onClick={runSandbox} 
                  disabled={sandboxRunning || !settings.radius_api_key}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}
                >
                  <Zap size={16} /> {sandboxRunning ? 'Executing Request...' : '⚡ Send Test Request'}
                </button>
              </div>

              {/* Response Viewer */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white-80)' }}>API Response</div>
                  {sandboxResponse && (
                    <span className={`pill ${sandboxResponse.status < 400 ? 'pill-up' : 'pill-down'}`}>
                      HTTP {sandboxResponse.status} {sandboxResponse.statusText}
                    </span>
                  )}
                </div>
                <div style={{ 
                  flex: 1, 
                  minHeight: 240, 
                  background: 'var(--navy-900)', 
                  border: '1px solid var(--navy-700)', 
                  borderRadius: 8, 
                  padding: 14, 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: 12, 
                  overflow: 'auto',
                  color: sandboxResponse ? (sandboxResponse.status < 400 ? '#4ade80' : '#f87171') : 'var(--white-40)'
                }}>
                  {sandboxResponse ? (
                    <pre style={{ margin: 0 }}>{JSON.stringify(sandboxResponse.data, null, 2)}</pre>
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--white-40)' }}>
                      Click "Send Test Request" to inspect live response output.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EndpointCard({ method, path, baseUrl, title, description, requestJson, responseJson }) {
  const methodColors = {
    GET: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
    POST: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)' },
    PUT: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
    DELETE: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' },
  };
  const color = methodColors[method] || methodColors.GET;

  return (
    <div className="panel" style={{ margin: 0 }}>
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: 'var(--white-90)', fontWeight: 600 }}>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <span style={{ 
              background: color.bg, 
              color: color.text, 
              border: `1px solid ${color.border}`, 
              padding: '2px 8px', 
              borderRadius: 4, 
              fontWeight: 700 
            }}>
              {method}
            </span>
            <span style={{ color: 'var(--white-70)' }}>{path}</span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: 'var(--white-70)', lineHeight: 1.5 }}>
          {description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: requestJson ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 12 }}>
          {requestJson && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--white-60)', marginBottom: 4, textTransform: 'uppercase' }}>
                Request Body (JSON)
              </div>
              <pre style={{ 
                margin: 0, 
                padding: 10, 
                background: 'var(--navy-900)', 
                border: '1px solid var(--navy-700)', 
                borderRadius: 6, 
                fontSize: 11, 
                color: '#38bdf8', 
                overflow: 'auto',
                maxHeight: 180
              }}>
                {JSON.stringify(requestJson, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--white-60)', marginBottom: 4, textTransform: 'uppercase' }}>
              Sample Response (JSON)
            </div>
            <pre style={{ 
              margin: 0, 
              padding: 10, 
              background: 'var(--navy-900)', 
              border: '1px solid var(--navy-700)', 
              borderRadius: 6, 
              fontSize: 11, 
              color: '#4ade80', 
              overflow: 'auto',
              maxHeight: 180
            }}>
              {JSON.stringify(responseJson, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={copy}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid var(--navy-700)',
          color: copied ? '#4ade80' : 'var(--white-70)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
      </button>
      <pre style={{ 
        margin: 0, 
        padding: 16, 
        background: 'var(--navy-900)', 
        border: '1px solid var(--navy-700)', 
        borderRadius: 8, 
        fontSize: 12, 
        lineHeight: 1.6, 
        fontFamily: 'var(--font-mono)', 
        color: '#e2e8f0', 
        overflow: 'auto',
        maxHeight: 460
      }}>
        {code}
      </pre>
    </div>
  );
}
