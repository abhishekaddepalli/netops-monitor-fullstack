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

const MONITOR_TYPES = [
  { key: 'ping', label: 'Ping / ICMP' },
  { key: 'http', label: 'HTTP / HTTPS' },
  { key: 'keyword', label: 'Keyword Check' },
  { key: 'port', label: 'TCP / UDP Port' },
  { key: 'dns', label: 'DNS Record' },
  { key: 'ssl', label: 'SSL Certificate' },
  { key: 'snmp', label: 'SNMP Monitor' },
];

const DIAGNOSTIC_TOOLS = [
  { key: 'ping', label: 'Ping' },
  { key: 'dns', label: 'DNS Lookup' },
  { key: 'port', label: 'Port Scanner' },
  { key: 'ssl', label: 'SSL Checker' },
  { key: 'whois', label: 'WHOIS' },
  { key: 'traceroute', label: 'Traceroute' },
  { key: 'ipinfo', label: 'IP Info' },
  { key: 'headers', label: 'HTTP Headers' },
  { key: 'blacklist', label: 'Blacklist Check' },
  { key: 'ipreputation', label: 'IP Reputation' },
  { key: 'snmp', label: 'SNMP Walk' },
  { key: 'network-discovery', label: 'Network Discovery' },
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

      <div style={{ paddingBottom: 32 }}>
        {plans === null ? (
          <Skeleton height={240} />
        ) : plans.length === 0 ? (
          <div className="panel-body"><EmptyState icon={ListPlus} title="No plans" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginTop: 16 }}>
            {plans.map((p) => (
              <div key={p.id} style={{ 
                background: 'var(--navy-800)', borderRadius: 16, padding: 24, 
                border: '1px solid var(--navy-border)', display: 'flex', flexDirection: 'column', gap: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform 0.2s', cursor: 'default'
              }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>{p.name}</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.key}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="icon-btn" onClick={() => setEditPlan(p)} title="Edit"><Pencil size={15} /></button>
                    <button className="icon-btn" onClick={() => handleDelete(p.id)} title="Delete"><Trash size={15} /></button>
                  </div>
                </div>
                
                <div style={{ padding: '16px 0', borderTop: '1px solid var(--navy-700)', borderBottom: '1px solid var(--navy-700)' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-400)', display: 'flex', alignItems: 'baseline' }}>
                    ₹{p.price_inr_monthly}<span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 4 }}>/mo</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--navy-600)', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}>
                      Y: ₹{p.price_inr_yearly}
                    </span>
                    <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--navy-600)', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}>
                      HY: ₹{p.price_inr_half_yearly}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monitors</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.monitor_limit === -1 ? 'Unlimited' : p.monitor_limit}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Team Limit</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.team_member_limit === -1 ? 'Unlimited' : p.team_member_limit}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Min Interval</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.check_interval_min_seconds}s</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>API / Alerts</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.api_request_limit_monthly === -1 ? 'Unl.' : p.api_request_limit_monthly} / {p.alert_limit_monthly === -1 ? 'Unl.' : p.alert_limit_monthly}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

  const handleFeatureToggle = (fKey) => {
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {ALERT_TYPES.map(type => {
            const fKey = `alert_${type.key}`;
            const isSelected = (formData.features || []).includes(fKey);
            return (
              <div 
                key={type.key} 
                onClick={() => handleFeatureToggle(fKey)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: 'var(--navy-800)', padding: '12px 16px', borderRadius: 12,
                  border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                  position: 'relative', transition: 'background 0.3s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s ease, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 24 }}>Allowed Monitors</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {MONITOR_TYPES.map(type => {
            const fKey = `monitor_${type.key}`;
            const isSelected = (formData.features || []).includes(fKey);
            return (
              <div 
                key={type.key} 
                onClick={() => handleFeatureToggle(fKey)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: 'var(--navy-800)', padding: '12px 16px', borderRadius: 12,
                  border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                  position: 'relative', transition: 'background 0.3s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s ease, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 24 }}>Allowed Diagnostic Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {DIAGNOSTIC_TOOLS.map(type => {
            const fKey = `tool_${type.key}`;
            const isSelected = (formData.features || []).includes(fKey);
            return (
              <div 
                key={type.key} 
                onClick={() => handleFeatureToggle(fKey)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: 'var(--navy-800)', padding: '12px 16px', borderRadius: 12,
                  border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                  position: 'relative', transition: 'background 0.3s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s ease, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </div>
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

  const handleFeatureToggle = (fKey) => {
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {ALERT_TYPES.map(type => {
            const fKey = `alert_${type.key}`;
            const isSelected = (formData.features || []).includes(fKey);
            return (
              <div 
                key={type.key} 
                onClick={() => handleFeatureToggle(fKey)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: 'var(--navy-800)', padding: '12px 16px', borderRadius: 12,
                  border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                  position: 'relative', transition: 'background 0.3s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s ease, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 24 }}>Allowed Monitors</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {MONITOR_TYPES.map(type => {
            const fKey = `monitor_${type.key}`;
            const isSelected = (formData.features || []).includes(fKey);
            return (
              <div 
                key={type.key} 
                onClick={() => handleFeatureToggle(fKey)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: 'var(--navy-800)', padding: '12px 16px', borderRadius: 12,
                  border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                  position: 'relative', transition: 'background 0.3s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s ease, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ fontWeight: 600, color: 'var(--white-90)', borderBottom: '1px solid var(--navy-600)', paddingBottom: 8, marginTop: 24 }}>Allowed Diagnostic Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {DIAGNOSTIC_TOOLS.map(type => {
            const fKey = `tool_${type.key}`;
            const isSelected = (formData.features || []).includes(fKey);
            return (
              <div 
                key={type.key} 
                onClick={() => handleFeatureToggle(fKey)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: 'var(--navy-800)', padding: '12px 16px', borderRadius: 12,
                  border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                  position: 'relative', transition: 'background 0.3s'
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s ease, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                  {type.label}
                </span>
              </div>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
