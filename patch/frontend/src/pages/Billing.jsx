import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { CreditCard, CheckCircle } from 'lucide-react';

export default function Billing() {
  const toast = useToast();
  const [plans, setPlans] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showCheckout, setShowCheckout] = useState(null); // stores the plan to checkout
  const [submitting, setSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly', 'half_yearly', 'yearly'

  useEffect(() => {
    // Fetch public plans
    apiClient.get('/plans').then(({ data }) => setPlans(data)).catch(() => {});
    // Fetch current subscription
    apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription)).catch(() => {});
    // Fetch settings to get UPI info (public endpoint needed, or we just fetch it if needed. 
    // Wait, let's fetch settings via a dedicated or public settings route. Actually, for now, let's assume UPI is enabled.
  }, []);

  async function handleSubscribe(method) {
    setSubmitting(true);
    try {
      await apiClient.post('/v1/billing/subscribe', {
        plan_key: showCheckout.key,
        payment_method: method,
        billing_cycle: billingCycle
      });
      toast.success('Subscription successful!');
      setShowCheckout(null);
      // Reload sub
      apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">Billing & Plans</div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div className="panel-title">Current Subscription</div>
        </div>
        <div className="panel-body">
          {currentSub ? (
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{currentSub.plan?.name || 'Unknown Plan'}</div>
              <div style={{ color: 'var(--white-60)' }}>
                Status: <span className={`tag state-${currentSub.status === 'active' ? 'resolved' : 'investigating'}`}>{currentSub.status}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--white-60)' }}>You are currently on the Free plan.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', background: 'var(--navy-800)', borderRadius: 24, padding: 4, border: '1px solid var(--navy-border)' }}>
          <button 
            className={`btn ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ borderRadius: 20, padding: '6px 20px', minHeight: 36 }}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`btn ${billingCycle === 'half_yearly' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ borderRadius: 20, padding: '6px 20px', minHeight: 36 }}
            onClick={() => setBillingCycle('half_yearly')}
          >
            Half-Yearly (Save 10%)
          </button>
          <button 
            className={`btn ${billingCycle === 'yearly' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ borderRadius: 20, padding: '6px 20px', minHeight: 36 }}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {plans === null ? (
           <Skeleton height={300} />
        ) : (
          plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_inr_monthly : (billingCycle === 'half_yearly' ? plan.price_inr_half_yearly : plan.price_inr_yearly);
            const isRecommended = plan.name.toLowerCase().includes('pro');
            
            return (
              <div key={plan.id} className="pricing-card" style={{ 
                background: isRecommended ? 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%)' : 'var(--bg-2)', 
                padding: 32, 
                borderRadius: 16, 
                border: isRecommended ? '2px solid var(--primary-500)' : '1px solid var(--border)',
                position: 'relative',
                transform: isRecommended ? 'scale(1.02)' : 'none',
                boxShadow: isRecommended ? '0 12px 24px rgba(0,0,0,0.2)' : 'none',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                {isRecommended && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-500)', color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>RECOMMENDED</div>
                )}
                <div className="plan-name" style={{ fontSize: 22, fontWeight: 700, color: isRecommended ? 'var(--primary-300)' : 'var(--white-90)' }}>{plan.name}</div>
                <div className="plan-price" style={{ fontSize: 48, fontWeight: 800, margin: '16px 0', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  ₹{price}
                  <span style={{ fontSize: 16, color: 'var(--white-60)', fontWeight: 500 }}>/{billingCycle === 'monthly' ? 'mo' : (billingCycle === 'half_yearly' ? '6mo' : 'yr')}</span>
                </div>
                
                <ul className="plan-features" style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                  <li style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}><CheckCircle size={18} color="var(--primary-400)" /> {plan.monitor_limit === -1 ? 'Unlimited' : plan.monitor_limit} Monitors</li>
                  <li style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}><CheckCircle size={18} color="var(--primary-400)" /> {plan.check_interval_min_seconds}s interval frequency</li>
                  <li style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}><CheckCircle size={18} color="var(--primary-400)" /> {plan.team_member_limit === -1 ? 'Unlimited' : plan.team_member_limit} Team members</li>
                  <li style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}><CheckCircle size={18} color="var(--primary-400)" /> {plan.status_page_limit === -1 ? 'Unlimited' : plan.status_page_limit} Status pages</li>
                </ul>

                {currentSub?.plan_id === plan.id ? (
                  <button className="btn btn-ghost" disabled style={{ width: '100%', padding: '12px', fontSize: 16, borderRadius: 8 }}>Current Plan</button>
                ) : (
                  <button className={`btn ${isRecommended ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', padding: '12px', fontSize: 16, borderRadius: 8, background: isRecommended ? '' : 'var(--navy-800)' }} onClick={() => setShowCheckout(plan)}>
                    Subscribe Now
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCheckout && (
        <Modal title={`Subscribe to ${showCheckout.name}`} onClose={() => setShowCheckout(null)} footer={
          <button className="btn btn-ghost" onClick={() => setShowCheckout(null)}>Cancel</button>
        }>
          <div style={{ marginBottom: 24, fontSize: 15, color: 'var(--white-80)' }}>
            You are subscribing to the <strong>{showCheckout.name}</strong> plan ({billingCycle}) for <strong>₹{billingCycle === 'monthly' ? showCheckout.price_inr_monthly : (billingCycle === 'half_yearly' ? showCheckout.price_inr_half_yearly : showCheckout.price_inr_yearly)}</strong>.
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => handleSubscribe('stripe')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
              <CreditCard size={18} /> Pay with Stripe
            </button>
            <button className="btn btn-ghost" onClick={() => handleSubscribe('razorpay')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
              <CreditCard size={18} /> Pay with Razorpay
            </button>
            <button className="btn btn-primary" onClick={() => handleSubscribe('upi')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
               Pay with UPI / QR
            </button>
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--white-40)', textAlign: 'center' }}>
            Note: Choosing UPI will generate an invoice that must be paid manually by scanning the admin's QR code.
          </div>
        </Modal>
      )}
    </>
  );
}
