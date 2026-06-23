import { useEffect, useState, useCallback } from 'react';
import { apiErrorMessage } from '../api/client';
import { adminApi } from '../api/admin';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { Building2, Plus, Pencil, Download, Upload, FileDown, Trash2 } from 'lucide-react';

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

  function handleExport() {
    window.open('http://127.0.0.1:8000/api/v1/admin/organizations/export', '_blank');
  }

  function handleTemplate() {
    window.open('http://127.0.0.1:8000/api/v1/admin/organizations/import-template', '_blank');
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
                    <button className="icon-btn" onClick={() => setEditOrg(org)} title="Edit"><Pencil size={15} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleSuspendToggle(org)} style={{ marginLeft: 8 }}>
                      {org.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleExpireToggle(org)} style={{ marginLeft: 8 }}>
                      {org.is_expired ? 'Unexpire' : 'Expire'}
                    </button>
                    <button className="icon-btn" onClick={() => handleDelete(org)} title="Delete" style={{ marginLeft: 8, color: 'var(--red-400)' }}>
                      <Trash2 size={15} />
                    </button>
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
  const [name, setName] = useState('');
  const [plan, setPlan] = useState(plans.length > 0 ? plans[0].key : 'free');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [defaultNodeId, setDefaultNodeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name, plan, admin_name: adminName, admin_email: adminEmail, admin_password: adminPassword };
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
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Organization Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Plan</label>
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
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
        <div className="form-group">
          <label className="form-label">Admin Name</label>
          <input className="form-input" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Admin Email</label>
          <input type="email" className="form-input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Admin Password</label>
          <input type="password" className="form-input" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
        </div>
      </form>
    </Modal>
  );
}

function EditOrgModal({ nodes, plans, org, onClose, onUpdated }) {
  const toast = useToast();
  const [plan, setPlan] = useState(org.plan);
  const [monitorLimit, setMonitorLimit] = useState(org.monitor_limit);
  const [teamMemberLimit, setTeamMemberLimit] = useState(org.team_member_limit);
  const [defaultNodeId, setDefaultNodeId] = useState(org.default_monitoring_node_id || '');
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
      const payload = { plan, monitor_limit: Number(monitorLimit), team_member_limit: Number(teamMemberLimit) };
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
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Plan</label>
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
        <div className="form-group">
          <label className="form-label">Default Monitoring Node</label>
          <select className="form-select" value={defaultNodeId} onChange={(e) => setDefaultNodeId(e.target.value)}>
            <option value="">-- Main Server (No specific node) --</option>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.region_code})</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
