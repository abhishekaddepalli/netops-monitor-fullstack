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
        payment_method: method
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

      <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {plans === null ? (
           <Skeleton height={300} />
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="pricing-card" style={{ background: 'var(--bg-2)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
              <div className="plan-name" style={{ fontSize: 20, fontWeight: 600 }}>{plan.name}</div>
              <div className="plan-price" style={{ fontSize: 40, fontWeight: 800, margin: '16px 0' }}>₹{plan.price_inr_monthly}<span style={{ fontSize: 16, color: 'var(--white-60)' }}>/mo</span></div>
              <ul className="plan-features" style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                <li style={{ marginBottom: 12 }}><CheckCircle size={16} color="var(--green-400)" /> {plan.monitor_limit === -1 ? 'Unlimited' : plan.monitor_limit} Monitors</li>
                <li style={{ marginBottom: 12 }}><CheckCircle size={16} color="var(--green-400)" /> {plan.check_interval_min_seconds}s interval</li>
                <li style={{ marginBottom: 12 }}><CheckCircle size={16} color="var(--green-400)" /> {plan.team_member_limit === -1 ? 'Unlimited' : plan.team_member_limit} Team members</li>
              </ul>
              {currentSub?.plan_id === plan.id ? (
                <button className="btn btn-ghost" disabled style={{ width: '100%' }}>Current Plan</button>
              ) : (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowCheckout(plan)}>
                  Subscribe
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showCheckout && (
        <Modal title={`Subscribe to ${showCheckout.name}`} onClose={() => setShowCheckout(null)} footer={
          <button className="btn btn-ghost" onClick={() => setShowCheckout(null)}>Cancel</button>
        }>
          <div style={{ marginBottom: 24, fontSize: 15, color: 'var(--white-80)' }}>
            You are subscribing to the <strong>{showCheckout.name}</strong> plan for <strong>₹{showCheckout.price_inr_monthly}/month</strong>.
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
