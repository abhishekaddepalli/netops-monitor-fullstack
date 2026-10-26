import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { 
  ListPlus, Plus, Pencil, Trash, Check, Globe, EyeOff, ShieldCheck, 
  Layers, DollarSign, Sliders, BellRing, Activity, Wrench
} from 'lucide-react';

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
    if (!window.confirm('Delete this plan? Existing subscriptions might be affected.')) return;
    try {
      await adminApi.deletePlan(id);
      toast.success('Plan deleted successfully.');
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
          <div className="panel-sub" style={{ marginTop: 4 }}>
            {plans ? `${plans.length} total plans configured` : 'Loading plans...'}
          </div>
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
          <div className="panel-body"><EmptyState icon={ListPlus} title="No plans configured" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginTop: 16 }}>
            {plans.map((p) => {
              const featuresCount = Array.isArray(p.features) ? p.features.length : 0;
              return (
                <div key={p.id} style={{ 
                  background: 'var(--navy-800)', borderRadius: 16, padding: 24, 
                  border: '1px solid var(--navy-border)', display: 'flex', flexDirection: 'column', gap: 16,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative'
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{p.name}</h3>
                        {p.is_public === false && (
                          <span title="Hidden from public pricing" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 6px', borderRadius: 4, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <EyeOff size={11} /> Private
                          </span>
                        )}
                        {p.is_active === false && (
                          <span style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{p.key}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="icon-btn" onClick={() => setEditPlan(p)} title="Edit Plan"><Pencil size={15} /></button>
                      <button className="icon-btn" onClick={() => handleDelete(p.id)} title="Delete Plan" style={{ color: '#f87171' }}><Trash size={15} /></button>
                    </div>
                  </div>
                  
                  <div style={{ padding: '14px 0', borderTop: '1px solid var(--navy-700)', borderBottom: '1px solid var(--navy-700)' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary-400)', display: 'flex', alignItems: 'baseline' }}>
                      ₹{p.price_inr_monthly}<span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 4 }}>/mo</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--navy-600)', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>
                        Daily: ₹{p.price_inr_daily || 0}
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--navy-600)', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>
                        6Mo: ₹{p.price_inr_half_yearly || (p.price_inr_monthly * 6)}
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--navy-600)', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>
                        Year: ₹{p.price_inr_yearly || (p.price_inr_monthly * 12)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>MONITORS</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>
                        {p.monitor_limit === -1 ? 'Unlimited' : p.monitor_limit}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>TEAM MEMBERS</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>
                        {p.team_member_limit === -1 ? 'Unlimited' : p.team_member_limit}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>MIN CHECK INTERVAL</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.check_interval_min_seconds}s</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>STATUS PAGES</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {p.status_page_limit === -1 ? 'Unlimited' : (p.status_page_limit ?? 1)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--navy-700)', fontSize: 12, color: 'var(--white-50)' }}>
                    <span>{featuresCount} features enabled</span>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>Edit Details →</span>
                  </div>
                </div>
              );
            })}
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

function PlanFormFields({ formData, setFormData, handleChange, handleFeatureToggle, activeTab, setActiveTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--navy-700)', paddingBottom: 10, overflowX: 'auto' }}>
        {[
          { key: 'general', label: 'General & Visibility', icon: Layers },
          { key: 'pricing', label: 'Pricing Tiers', icon: DollarSign },
          { key: 'limits', label: 'Resource Limits', icon: Sliders },
          { key: 'channels', label: 'Alert Channels', icon: BellRing },
          { key: 'monitors', label: 'Monitor Types', icon: Activity },
          { key: 'tools', label: 'Diagnostic Tools', icon: Wrench },
        ].map(t => {
          const Icon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: isSelected ? 'var(--primary-600)' : 'rgba(255,255,255,0.04)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Plan Display Name <span style={{ color: '#f87171' }}>*</span></label>
              <input className="form-input" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Starter, Professional, Enterprise" required />
            </div>
            {'key' in formData && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Plan Key (Identifier) <span style={{ color: '#f87171' }}>*</span></label>
                <input className="form-input" name="key" value={formData.key} onChange={handleChange} placeholder="e.g. starter, pro_yearly" required />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 8 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12,
              background: 'var(--navy-800)', border: '1px solid var(--navy-600)', cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={formData.is_public !== false} 
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary-500)' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>Show on Public Pricing Page</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Visible to customers in the billing subscription catalog</div>
              </div>
            </label>

            <label style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12,
              background: 'var(--navy-800)', border: '1px solid var(--navy-600)', cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={formData.is_active !== false} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--primary-500)' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>Plan Active</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Allows organizations to select and renew this plan</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab: Pricing */}
      {activeTab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Configure recurring prices in Indian Rupees (INR). Set 0 for free plans.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Monthly Price (₹) <span style={{ color: '#f87171' }}>*</span></label>
              <input type="number" step="0.01" min="0" className="form-input" name="price_inr_monthly" value={formData.price_inr_monthly} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Primary monthly billing rate</div>
            </div>
            <div className="form-group">
              <label className="form-label">Daily Price (₹)</label>
              <input type="number" step="0.01" min="0" className="form-input" name="price_inr_daily" value={formData.price_inr_daily} onChange={handleChange} />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>For short trials or micro-billing</div>
            </div>
            <div className="form-group">
              <label className="form-label">6 Months (₹)</label>
              <input type="number" step="0.01" min="0" className="form-input" name="price_inr_half_yearly" value={formData.price_inr_half_yearly} onChange={handleChange} />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Semi-annual tier</div>
            </div>
            <div className="form-group">
              <label className="form-label">Yearly Price (₹)</label>
              <input type="number" step="0.01" min="0" className="form-input" name="price_inr_yearly" value={formData.price_inr_yearly} onChange={handleChange} />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Annual discounted tier</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Limits */}
      {activeTab === 'limits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--primary-300)' }}>
            💡 <strong>Tip:</strong> Enter <strong>-1</strong> in any limit field to grant <strong>Unlimited</strong> quota for that resource.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Monitor Limit</label>
              <input type="number" className="form-input" name="monitor_limit" value={formData.monitor_limit} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Total active monitors (-1 = ∞)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Team Members Limit</label>
              <input type="number" className="form-input" name="team_member_limit" value={formData.team_member_limit} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Team seats allowed (-1 = ∞)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Fastest Check Interval (s)</label>
              <input type="number" min="5" className="form-input" name="check_interval_min_seconds" value={formData.check_interval_min_seconds} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Minimum interval e.g. 30, 60</div>
            </div>
            <div className="form-group">
              <label className="form-label">Status Pages Limit</label>
              <input type="number" className="form-input" name="status_page_limit" value={formData.status_page_limit} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Public status pages (-1 = ∞)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Alert Limit</label>
              <input type="number" className="form-input" name="alert_limit_monthly" value={formData.alert_limit_monthly} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Alert dispatches/mo (-1 = ∞)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly API Limit</label>
              <input type="number" className="form-input" name="api_request_limit_monthly" value={formData.api_request_limit_monthly} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>API requests/mo (-1 = ∞)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Integrations Limit</label>
              <input type="number" className="form-input" name="integration_limit" value={formData.integration_limit} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>Third-party channels (-1 = ∞)</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Alert Channels */}
      {activeTab === 'channels' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Select which notification channels organizations on this plan can configure:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {ALERT_TYPES.map(type => {
              const fKey = `alert_${type.key}`;
              const isSelected = (formData.features || []).includes(fKey);
              return (
                <div 
                  key={type.key} 
                  onClick={() => handleFeatureToggle(fKey)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--navy-800)', 
                    padding: '12px 16px', borderRadius: 12,
                    border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                    transition: 'all 0.2s ease', userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                    position: 'relative', transition: 'background 0.25s'
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.25s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                    {type.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Monitor Types */}
      {activeTab === 'monitors' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Select which monitor protocol types this plan is permitted to create:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {MONITOR_TYPES.map(type => {
              const fKey = `monitor_${type.key}`;
              const isSelected = (formData.features || []).includes(fKey);
              return (
                <div 
                  key={type.key} 
                  onClick={() => handleFeatureToggle(fKey)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--navy-800)', 
                    padding: '12px 16px', borderRadius: 12,
                    border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                    transition: 'all 0.2s ease', userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                    position: 'relative', transition: 'background 0.25s'
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.25s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                    {type.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Diagnostic Tools */}
      {activeTab === 'tools' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Select which network diagnostic & discovery tools users on this plan can run:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {DIAGNOSTIC_TOOLS.map(type => {
              const fKey = `tool_${type.key}`;
              const isSelected = (formData.features || []).includes(fKey);
              return (
                <div 
                  key={type.key} 
                  onClick={() => handleFeatureToggle(fKey)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--navy-800)', 
                    padding: '12px 16px', borderRadius: 12,
                    border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                    transition: 'all 0.2s ease', userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    background: isSelected ? 'var(--primary-500)' : 'var(--navy-600)',
                    position: 'relative', transition: 'background 0.25s'
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: isSelected ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.25s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                    {type.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    key: '', name: '', monitor_limit: 10, team_member_limit: 2,
    check_interval_min_seconds: 60, status_page_limit: 1, price_inr_monthly: 0,
    price_inr_daily: 0, price_inr_half_yearly: 0, price_inr_yearly: 0,
    alert_limit_monthly: -1, api_request_limit_monthly: -1, integration_limit: -1,
    is_public: true, is_active: true,
    features: ['alert_email', 'alert_webhook', 'monitor_ping', 'monitor_http', 'tool_ping', 'tool_dns']
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
    if (e) e.preventDefault();
    if (!formData.name.trim() || !formData.key.trim()) {
      setActiveTab('general');
      toast.error('Plan Name and Key are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price_inr_monthly: Number(formData.price_inr_monthly) || 0,
        price_inr_daily: Number(formData.price_inr_daily) || 0,
        price_inr_half_yearly: Number(formData.price_inr_half_yearly) || 0,
        price_inr_yearly: Number(formData.price_inr_yearly) || 0,
        monitor_limit: Number(formData.monitor_limit),
        team_member_limit: Number(formData.team_member_limit),
        check_interval_min_seconds: Number(formData.check_interval_min_seconds) || 60,
        status_page_limit: Number(formData.status_page_limit),
        alert_limit_monthly: Number(formData.alert_limit_monthly),
        api_request_limit_monthly: Number(formData.api_request_limit_monthly),
        integration_limit: Number(formData.integration_limit),
      };
      await adminApi.createPlan(payload);
      toast.success('Plan created successfully!');
      onCreated();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Subscription Plan" onClose={onClose} maxWidth="800px" footer={
      <>
        <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Creating Plan...' : 'Create Plan'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <PlanFormFields 
          formData={formData} 
          setFormData={setFormData}
          handleChange={handleChange} 
          handleFeatureToggle={handleFeatureToggle}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </form>
    </Modal>
  );
}

function EditPlanModal({ plan, onClose, onUpdated }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: plan.name, 
    monitor_limit: plan.monitor_limit, 
    team_member_limit: plan.team_member_limit,
    check_interval_min_seconds: plan.check_interval_min_seconds, 
    status_page_limit: plan.status_page_limit ?? 1,
    price_inr_monthly: plan.price_inr_monthly,
    price_inr_daily: plan.price_inr_daily || 0, 
    price_inr_half_yearly: plan.price_inr_half_yearly || 0, 
    price_inr_yearly: plan.price_inr_yearly || 0,
    alert_limit_monthly: plan.alert_limit_monthly ?? -1, 
    api_request_limit_monthly: plan.api_request_limit_monthly ?? -1, 
    integration_limit: plan.integration_limit ?? -1,
    is_public: plan.is_public !== false,
    is_active: plan.is_active !== false,
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
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      setActiveTab('general');
      toast.error('Plan Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        price_inr_monthly: Number(formData.price_inr_monthly) || 0,
        price_inr_daily: Number(formData.price_inr_daily) || 0,
        price_inr_half_yearly: Number(formData.price_inr_half_yearly) || 0,
        price_inr_yearly: Number(formData.price_inr_yearly) || 0,
        monitor_limit: Number(formData.monitor_limit),
        team_member_limit: Number(formData.team_member_limit),
        check_interval_min_seconds: Number(formData.check_interval_min_seconds) || 60,
        status_page_limit: Number(formData.status_page_limit),
        alert_limit_monthly: Number(formData.alert_limit_monthly),
        api_request_limit_monthly: Number(formData.api_request_limit_monthly),
        integration_limit: Number(formData.integration_limit),
        is_public: Boolean(formData.is_public),
        is_active: Boolean(formData.is_active),
        features: formData.features || []
      };
      await adminApi.updatePlan(plan.id, payload);
      toast.success('Plan updated successfully!');
      onUpdated();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit Plan: ${plan.name} (${plan.key})`} onClose={onClose} maxWidth="800px" footer={
      <>
        <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <PlanFormFields 
          formData={formData} 
          setFormData={setFormData}
          handleChange={handleChange} 
          handleFeatureToggle={handleFeatureToggle}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </form>
    </Modal>
  );
}
