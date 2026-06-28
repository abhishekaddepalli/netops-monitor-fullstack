import { useEffect, useState, useCallback } from 'react';
import { apiErrorMessage } from '../api/client';
import { adminApi } from '../api/admin';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { Building2, Plus, Pencil, Download, Upload, FileDown, Trash2, Pause, Play, Ban, RefreshCw } from 'lucide-react';

export default function AdminOrganizations() {
  const toast = useToast();
  const [orgs, setOrgs] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [plans, setPlans] = useState([]);


  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listOrganizations();
      setOrgs(data.data || []);
      const { data: nodesData } = await adminApi.listNodes();
      setNodes(nodesData || []);
      const { data: plansData } = await adminApi.listPlans();
      setPlans(plansData || []);

    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load data.'));
      setOrgs([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleSuspendToggle(org) {
    try {
      if (org.is_suspended) {
        await adminApi.unsuspendOrganization(org.id);
        toast.success(`${org.name} unsuspended.`);
      } else {
        const reason = window.prompt(`Reason for suspending ${org.name}:`);
        if (!reason) return;
        await adminApi.suspendOrganization(org.id, { reason });
        toast.success(`${org.name} suspended.`);
      }
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleExpireToggle(org) {
    try {
      if (org.is_expired) {
        await adminApi.unexpireOrganization(org.id);
        toast.success(`${org.name} unexpired.`);
      } else {
        await adminApi.expireOrganization(org.id);
        toast.success(`${org.name} expired.`);
      }
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleDelete(org) {
    if (!window.confirm(`Are you sure you want to completely delete ${org.name}? This will delete all their data.`)) return;
    try {
      await adminApi.deleteOrganization(org.id);
      toast.success(`${org.name} deleted.`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleExport() {
    try {
      const response = await apiClient.get('/admin/organizations/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'organizations.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error('Export failed');
    }
  }

  async function handleTemplate() {
    try {
      const response = await apiClient.get('/admin/organizations/import-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'organizations_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error('Template download failed');
    }
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    adminApi.importOrganizations(file).then(res => {
      toast.success(res.data.message);
      load();
    }).catch(err => toast.error(apiErrorMessage(err)));
    e.target.value = null; // reset
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Super Admin — Organizations</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>{orgs ? `${orgs.length} organizations` : '...'}</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-ghost" onClick={handleTemplate} title="Download CSV Template"><FileDown size={16} /></button>
          <button className="btn btn-ghost" onClick={handleExport} title="Export Organizations"><Download size={16} /> Export</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }} title="Import Organizations">
            <Upload size={16} /> Import
            <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Organization
          </button>
        </div>
      </div>

      <div className="panel">
        {orgs === null ? (
          <div className="panel-body"><Skeleton height={240} /></div>
        ) : orgs.length === 0 ? (
          <div className="panel-body"><EmptyState icon={Building2} title="No organizations" /></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Organization</th><th>Plan</th><th>Monitors</th><th>Users</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="mon-name">{org.name}</td>
                  <td><span className="tag" style={{ textTransform: 'capitalize' }}>{org.plan}</span></td>
                  <td className="mon-metric">{org.monitors_count ?? 0}</td>
                  <td className="mon-metric">{org.users_count ?? 0}</td>
                  <td>
                    <span className={`pill ${org.is_expired ? 'pill-down' : (org.is_suspended ? 'pill-down' : 'pill-up')}`}>
                      {org.is_expired ? 'Expired' : (org.is_suspended ? 'Suspended' : 'Active')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="icon-btn" onClick={() => setEditOrg(org)} title="Edit"><Pencil size={15} /></button>
                      <button className="icon-btn" onClick={() => handleSuspendToggle(org)} title={org.is_suspended ? 'Unsuspend' : 'Suspend'}>
                        {org.is_suspended ? <Play size={15} /> : <Pause size={15} />}
                      </button>
                      <button className="icon-btn" onClick={() => handleExpireToggle(org)} title={org.is_expired ? 'Unexpire' : 'Expire'}>
                        {org.is_expired ? <RefreshCw size={15} /> : <Ban size={15} />}
                      </button>
                      <button className="icon-btn" onClick={() => handleDelete(org)} title="Delete" style={{ color: 'var(--red-400)' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateOrgModal nodes={nodes} plans={plans} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}

      {editOrg && (
        <EditOrgModal nodes={nodes} plans={plans} org={editOrg} onClose={() => setEditOrg(null)} onUpdated={() => { setEditOrg(null); load(); }} />
      )}
    </>
  );
}

function CreateOrgModal({ nodes, plans, onClose, onCreated }) {
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState(plans.length > 0 ? plans[0].key : 'free');

  const [defaultNodeId, setDefaultNodeId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(true);
  const [alertSmsEnabled, setAlertSmsEnabled] = useState(false);
  const [alertWebhookEnabled, setAlertWebhookEnabled] = useState(false);
  const [alertSlackEnabled, setAlertSlackEnabled] = useState(false);
  const [alertTelegramEnabled, setAlertTelegramEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { 
        name, plan, phone, address,

        admin_name: adminName, admin_email: adminEmail, admin_password: adminPassword, admin_phone: adminPhone,
        white_label_enabled: whiteLabelEnabled,
        alert_email_enabled: alertEmailEnabled,
        alert_sms_enabled: alertSmsEnabled,
        alert_webhook_enabled: alertWebhookEnabled,
        alert_slack_enabled: alertSlackEnabled,
        alert_telegram_enabled: alertTelegramEnabled
      };
      if (defaultNodeId) payload.default_monitoring_node_id = defaultNodeId;
      await adminApi.createOrganization(payload);
      toast.success('Organization created.');
      onCreated();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Organization" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
      </>
    }>
      <div className="tab-row" style={{ marginBottom: 20 }}>
        <button type="button" className={`chip ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>Organization Details</button>
        <button type="button" className={`chip ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>Admin User</button>
        <button type="button" className={`chip ${tab === 'features' ? 'active' : ''}`} onClick={() => setTab('features')}>Features</button>
      </div>

      <form onSubmit={handleSubmit}>
        {tab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Organization Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">

            </div>
            <div className="form-group">
              <label className="form-label">Legacy Plan</label>
              <select className="form-select" value={plan} onChange={(e) => setPlan(e.target.value)}>
                {plans.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Default Monitoring Node</label>
              <select className="form-select" value={defaultNodeId} onChange={(e) => setDefaultNodeId(e.target.value)}>
                <option value="">-- Main Server (No specific node) --</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.region_code})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Org Phone</label>
              <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Org Address</label>
              <textarea className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {tab === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Admin Name</label>
              <input className="form-input" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input type="email" className="form-input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Admin Phone</label>
              <input type="text" className="form-input" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Admin Password</label>
              <input type="password" className="form-input" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
            </div>
          </div>
        )}

        {tab === 'features' && (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer', gridColumn: 'span 2' }}>
              <input type="checkbox" checked={whiteLabelEnabled} onChange={(e) => setWhiteLabelEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>White-labeling</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Allow this organization to use custom domains and branding</div>
              </div>
            </label>
            <div style={{ gridColumn: 'span 2', fontWeight: 600, marginTop: 8, marginBottom: -8 }}>Alert Management Options</div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertEmailEnabled} onChange={(e) => setAlertEmailEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Email Alerts</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertSmsEnabled} onChange={(e) => setAlertSmsEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>SMS Alerts</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertWebhookEnabled} onChange={(e) => setAlertWebhookEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Webhooks</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertSlackEnabled} onChange={(e) => setAlertSlackEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Slack Alerts</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertTelegramEnabled} onChange={(e) => setAlertTelegramEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Telegram Alerts</div>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}

function EditOrgModal({ nodes, plans, org, onClose, onUpdated }) {
  const toast = useToast();
  const [tab, setTab] = useState('general');
  
  const [name, setName] = useState(org.name);
  const [plan, setPlan] = useState(org.plan);

  const [monitorLimit, setMonitorLimit] = useState(org.monitor_limit);
  const [teamMemberLimit, setTeamMemberLimit] = useState(org.team_member_limit);
  const [defaultNodeId, setDefaultNodeId] = useState(org.default_monitoring_node_id || '');
  const [phone, setPhone] = useState(org.phone || '');
  const [address, setAddress] = useState(org.address || '');

  const adminUser = org.users?.find(u => u.pivot?.role === 'org_admin') || {};
  const [adminName, setAdminName] = useState(adminUser.name || '');
  const [adminEmail, setAdminEmail] = useState(adminUser.email || '');
  const [adminPhone, setAdminPhone] = useState(adminUser.phone || '');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(org.white_label_enabled || false);
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(org.alert_email_enabled ?? true);
  const [alertSmsEnabled, setAlertSmsEnabled] = useState(org.alert_sms_enabled ?? false);
  const [alertWebhookEnabled, setAlertWebhookEnabled] = useState(org.alert_webhook_enabled ?? false);
  const [alertSlackEnabled, setAlertSlackEnabled] = useState(org.alert_slack_enabled ?? false);
  const [alertTelegramEnabled, setAlertTelegramEnabled] = useState(org.alert_telegram_enabled ?? false);
  const [submitting, setSubmitting] = useState(false);

  const handlePlanChange = (e) => {
    const newPlanKey = e.target.value;
    setPlan(newPlanKey);
    const selectedPlan = plans.find(p => p.key === newPlanKey);
    if (selectedPlan) {
      setMonitorLimit(selectedPlan.monitor_limit);
      setTeamMemberLimit(selectedPlan.team_member_limit);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { 
        name, plan, monitor_limit: Number(monitorLimit), team_member_limit: Number(teamMemberLimit),
        phone, address,

        admin_name: adminName, admin_email: adminEmail, admin_phone: adminPhone,
        white_label_enabled: whiteLabelEnabled,
        alert_email_enabled: alertEmailEnabled,
        alert_sms_enabled: alertSmsEnabled,
        alert_webhook_enabled: alertWebhookEnabled,
        alert_slack_enabled: alertSlackEnabled,
        alert_telegram_enabled: alertTelegramEnabled
      };
      if (adminPassword) payload.admin_password = adminPassword;
      if (defaultNodeId) payload.default_monitoring_node_id = defaultNodeId;
      else payload.default_monitoring_node_id = null;
      await adminApi.updateOrganization(org.id, payload);
      toast.success('Organization updated.');
      onUpdated();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit ${org.name}`} onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
      </>
    }>
      <div className="tab-row" style={{ marginBottom: 20 }}>
        <button type="button" className={`chip ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>General</button>
        <button type="button" className={`chip ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>Admin User</button>
        <button type="button" className={`chip ${tab === 'features' ? 'active' : ''}`} onClick={() => setTab('features')}>Features</button>
      </div>

      <form onSubmit={handleSubmit}>
        {tab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Organization Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>

            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Legacy Plan</label>
              <select className="form-select" value={plan} onChange={handlePlanChange}>
                {plans.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monitor Limit</label>
              <input type="number" className="form-input" value={monitorLimit} onChange={(e) => setMonitorLimit(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Team Member Limit</label>
              <input type="number" className="form-input" value={teamMemberLimit} onChange={(e) => setTeamMemberLimit(e.target.value)} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Default Monitoring Node</label>
              <select className="form-select" value={defaultNodeId} onChange={(e) => setDefaultNodeId(e.target.value)}>
                <option value="">-- Main Server (No specific node) --</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.region_code})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Org Phone</label>
              <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Org Address</label>
              <textarea className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {tab === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {!adminUser.id && (
              <div style={{ gridColumn: 'span 2', color: 'var(--text-muted)' }}>
                No active Admin User found for this organization.
              </div>
            )}
            {adminUser.id && (
              <>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Admin Name</label>
                  <input className="form-input" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Email</label>
                  <input type="email" className="form-input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Phone</label>
                  <input type="text" className="form-input" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: 10, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ color: 'var(--text-main)', fontSize: 16, marginBottom: 8, display: 'block' }}>Change Password</label>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Leave blank if you do not wish to change the current password.</p>
                  <input type="password" placeholder="New Password" className="form-input" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'features' && (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer', gridColumn: 'span 2' }}>
              <input type="checkbox" checked={whiteLabelEnabled} onChange={(e) => setWhiteLabelEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>White-labeling</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Allow this organization to use custom domains and branding</div>
              </div>
            </label>
            <div style={{ gridColumn: 'span 2', fontWeight: 600, marginTop: 8, marginBottom: -8 }}>Alert Management Options</div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertEmailEnabled} onChange={(e) => setAlertEmailEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Email Alerts</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertSmsEnabled} onChange={(e) => setAlertSmsEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>SMS Alerts</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertWebhookEnabled} onChange={(e) => setAlertWebhookEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Webhooks</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertSlackEnabled} onChange={(e) => setAlertSlackEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Slack Alerts</div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertTelegramEnabled} onChange={(e) => setAlertTelegramEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Telegram Alerts</div>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
