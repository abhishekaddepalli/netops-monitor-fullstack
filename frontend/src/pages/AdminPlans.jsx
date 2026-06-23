import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { ListPlus, Plus, Pencil, Trash, CheckSquare, Square } from 'lucide-react';

const ALERT_TYPES = [
  { key: 'email', label: 'Email' },
  { key: 'slack', label: 'Slack' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'discord', label: 'Discord' },
  { key: 'teams', label: 'MS Teams' },
  { key: 'webhook', label: 'Webhooks' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'sms', label: 'SMS' },
];

export default function AdminPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listPlans();
      setPlans(data || []);
    } catch {
      toast.error('Could not load plans.');
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await adminApi.deletePlan(id);
      toast.success('Plan deleted.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Subscription Plans</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>{plans ? `${plans.length} plans` : '...'}</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Plan
          </button>
        </div>
      </div>

      <div className="panel">
        {plans === null ? (
          <div className="panel-body"><Skeleton height={240} /></div>
        ) : plans.length === 0 ? (
          <div className="panel-body"><EmptyState icon={ListPlus} title="No plans" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name / Key</th>
                <th>Price (INR)</th>
                <th>Monitors</th>
                <th>Team</th>
                <th>Interval (s)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="mon-name">{p.name}</div>
                    <div className="mon-meta">{p.key}</div>
                  </td>
                  <td>
                    <div>₹{p.price_inr_monthly}/mo</div>
                    <div className="mon-meta">Y: ₹{p.price_inr_yearly} | HY: ₹{p.price_inr_half_yearly}</div>
                  </td>
                  <td className="mon-metric">{p.monitor_limit === -1 ? 'Unlimited' : p.monitor_limit}</td>
                  <td className="mon-metric">{p.team_member_limit === -1 ? 'Unlimited' : p.team_member_limit}</td>
                  <td className="mon-metric">{p.check_interval_min_seconds}</td>
                  <td>
                    <button className="icon-btn" onClick={() => setEditPlan(p)} title="Edit"><Pencil size={15} /></button>
                    <button className="icon-btn" style={{ marginLeft: 8 }} onClick={() => handleDelete(p.id)} title="Delete"><Trash size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreatePlanModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}

      {editPlan && (
        <EditPlanModal plan={editPlan} onClose={() => setEditPlan(null)} onUpdated={() => { setEditPlan(null); load(); }} />
      )}
    </>
  );
}

function CreatePlanModal({ onClose, onCreated }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    key: '', name: '', monitor_limit: 10, team_member_limit: 2,
    check_interval_min_seconds: 60, status_page_limit: 1, price_inr_monthly: 0,
    price_inr_daily: 0, price_inr_half_yearly: 0, price_inr_yearly: 0,
    alert_limit_monthly: -1, api_request_limit_monthly: -1, integration_limit: -1,
    features: ['alert_email', 'alert_webhook']
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFeatureToggle = (key) => {
    const fKey = `alert_${key}`;
    setFormData(prev => {
      const features = prev.features || [];
      if (features.includes(fKey)) return { ...prev, features: features.filter(f => f !== fKey) };
      return { ...prev, features: [...features, fKey] };
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.createPlan(formData);
      toast.success('Plan created.');
      onCreated();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Plan" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
      </>
    }>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8 }}>General Settings</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Key (e.g. starter_monthly)</label>
            <input className="form-input" name="key" value={formData.key} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 8 }}>Pricing Tiers (INR)</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Daily</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_daily" value={formData.price_inr_daily} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_monthly" value={formData.price_inr_monthly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Half-Yearly</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_half_yearly" value={formData.price_inr_half_yearly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Yearly</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_yearly" value={formData.price_inr_yearly} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 8 }}>Limits & Features (-1 = Unlimited)</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Monitor Limit</label>
            <input type="number" className="form-input" name="monitor_limit" value={formData.monitor_limit} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Team Limit</label>
            <input type="number" className="form-input" name="team_member_limit" value={formData.team_member_limit} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Min Interval (s)</label>
            <input type="number" className="form-input" name="check_interval_min_seconds" value={formData.check_interval_min_seconds} onChange={handleChange} required />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Alert Limit (per mo)</label>
            <input type="number" className="form-input" name="alert_limit_monthly" value={formData.alert_limit_monthly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">API Requests (per mo)</label>
            <input type="number" className="form-input" name="api_request_limit_monthly" value={formData.api_request_limit_monthly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Integrations Limit</label>
            <input type="number" className="form-input" name="integration_limit" value={formData.integration_limit} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 8 }}>Allowed Alert Channels</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {ALERT_TYPES.map(type => {
            const isSelected = (formData.features || []).includes(`alert_${type.key}`);
            return (
              <label key={type.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: isSelected ? 'var(--white-90)' : 'var(--white-60)' }}>
                {isSelected ? <CheckSquare size={16} color="var(--primary-400)" /> : <Square size={16} />}
                <span style={{ fontSize: 13 }}>{type.label}</span>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => handleFeatureToggle(type.key)} 
                  style={{ display: 'none' }}
                />
              </label>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}

function EditPlanModal({ plan, onClose, onUpdated }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: plan.name, monitor_limit: plan.monitor_limit, team_member_limit: plan.team_member_limit,
    check_interval_min_seconds: plan.check_interval_min_seconds, status_page_limit: plan.status_page_limit,
    price_inr_monthly: plan.price_inr_monthly,
    price_inr_daily: plan.price_inr_daily || 0, price_inr_half_yearly: plan.price_inr_half_yearly || 0, price_inr_yearly: plan.price_inr_yearly || 0,
    alert_limit_monthly: plan.alert_limit_monthly ?? -1, api_request_limit_monthly: plan.api_request_limit_monthly ?? -1, integration_limit: plan.integration_limit ?? -1,
    features: plan.features || []
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFeatureToggle = (key) => {
    const fKey = `alert_${key}`;
    setFormData(prev => {
      const features = prev.features || [];
      if (features.includes(fKey)) return { ...prev, features: features.filter(f => f !== fKey) };
      return { ...prev, features: [...features, fKey] };
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.updatePlan(plan.id, formData);
      toast.success('Plan updated.');
      onUpdated();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit Plan: ${plan.key}`} onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
      </>
    }>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8 }}>General Settings</div>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 8 }}>Pricing Tiers (INR)</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Daily</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_daily" value={formData.price_inr_daily} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_monthly" value={formData.price_inr_monthly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Half-Yearly</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_half_yearly" value={formData.price_inr_half_yearly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Yearly</label>
            <input type="number" step="0.01" className="form-input" name="price_inr_yearly" value={formData.price_inr_yearly} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 8 }}>Limits & Features (-1 = Unlimited)</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Monitor Limit</label>
            <input type="number" className="form-input" name="monitor_limit" value={formData.monitor_limit} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Team Limit</label>
            <input type="number" className="form-input" name="team_member_limit" value={formData.team_member_limit} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Min Interval (s)</label>
            <input type="number" className="form-input" name="check_interval_min_seconds" value={formData.check_interval_min_seconds} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Alert Limit (per mo)</label>
            <input type="number" className="form-input" name="alert_limit_monthly" value={formData.alert_limit_monthly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">API Requests (per mo)</label>
            <input type="number" className="form-input" name="api_request_limit_monthly" value={formData.api_request_limit_monthly} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Integrations Limit</label>
            <input type="number" className="form-input" name="integration_limit" value={formData.integration_limit} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 8 }}>Allowed Alert Channels</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {ALERT_TYPES.map(type => {
            const isSelected = (formData.features || []).includes(`alert_${type.key}`);
            return (
              <label key={type.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: isSelected ? 'var(--white-90)' : 'var(--white-60)' }}>
                {isSelected ? <CheckSquare size={16} color="var(--primary-400)" /> : <Square size={16} />}
                <span style={{ fontSize: 13 }}>{type.label}</span>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => handleFeatureToggle(type.key)} 
                  style={{ display: 'none' }}
                />
              </label>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
