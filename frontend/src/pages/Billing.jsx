import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { CreditCard, CheckCircle, Upload } from 'lucide-react';

export default function Billing() {
  const toast = useToast();
  const [plans, setPlans] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showCheckout, setShowCheckout] = useState(null); // stores the plan to checkout
  const [submitting, setSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly', 'half_yearly', 'yearly'
  const [showUpiFlow, setShowUpiFlow] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    // Fetch public plans
    apiClient.get('/plans').then(({ data }) => setPlans(data)).catch(() => {});
    // Fetch current subscription
    apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription)).catch(() => {});
    // Fetch settings to get UPI info
    apiClient.get('/global-settings').then(({ data }) => setSettings(data)).catch(() => {});
  }, []);

  useEffect(() => {
    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  async function handleSubscribe(method) {
    setSubmitting(true);
    try {
      let res;
      if (method === 'upi') {
        const formData = new FormData();
        formData.append('plan_key', showCheckout.key);
        formData.append('payment_method', method);
        formData.append('billing_cycle', billingCycle);
        formData.append('utr_number', utrNumber);
        if (receiptFile) formData.append('receipt_file', receiptFile);
        
        res = await apiClient.post('/v1/billing/subscribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await apiClient.post('/v1/billing/subscribe', {
          plan_key: showCheckout.key,
          payment_method: method,
          billing_cycle: billingCycle
        });
      }

      if (method === 'razorpay') {
        const { razorpay_order_id, razorpay_key } = res.data;
        if (!razorpay_key) throw new Error('Razorpay is not configured on the server.');

        const options = {
          key: razorpay_key,
          amount: showCheckout.price_inr_monthly * 100,
          currency: 'INR',
          name: 'NetOps Monitor',
          description: `Subscription to ${showCheckout.name}`,
          order_id: razorpay_order_id,
          handler: async function (response) {
            try {
              await apiClient.post('/v1/billing/razorpay/verify', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });
              toast.success('Payment successful! Subscription activated.');
              setShowCheckout(null);
              apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription));
            } catch (err) {
              toast.error('Payment verification failed.');
            }
          },
          theme: { color: '#2E4FA3' },
          modal: {
            ondismiss: async function() {
              try {
                await apiClient.post('/v1/billing/cancel-draft');
                apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription));
              } catch (e) {}
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async function (response){
          toast.error('Payment failed.');
          try {
            await apiClient.post('/v1/billing/cancel-draft');
            apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription));
          } catch (e) {}
        });
        rzp.open();
      } else {
        toast.success(method === 'upi' ? 'Invoice generated! Pending admin approval.' : 'Subscription successful!');
        setShowCheckout(null);
        apiClient.get('/v1/billing/current').then(({ data }) => setCurrentSub(data.subscription));
      }
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

      {/* Hero Banner for Current Subscription */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 32, 39, 0) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 24, padding: '32px 40px', marginBottom: 40,
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ color: 'var(--primary-400)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 13 }}>Current Subscription</div>
        {currentSub ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{currentSub.plan?.name || 'Unknown Plan'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                Your plan is currently <span style={{ color: currentSub.status === 'active' ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>{currentSub.status === 'trialing' ? 'Pending Approval' : currentSub.status}</span>.
              </div>
            </div>
            {currentSub.status === 'active' && (
              <div style={{ display: 'flex', gap: 24, background: 'rgba(0,0,0,0.2)', padding: '16px 24px', borderRadius: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Monitors Used</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{currentSub.organization?.monitors_count || 0} / {currentSub.plan?.monitor_limit === -1 ? '∞' : currentSub.plan?.monitor_limit}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Free Plan</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>You are on the free tier. Upgrade to unlock more monitors and features.</div>
          </div>
        )}
      </div>

      {/* Animated Segmented Control */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <div style={{ 
          display: 'flex', background: 'var(--navy-800)', borderRadius: 30, padding: 6, 
          border: '1px solid var(--navy-600)', position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            position: 'absolute', top: 6, bottom: 6,
            left: billingCycle === 'monthly' ? 6 : billingCycle === 'half_yearly' ? '33.33%' : '66.66%',
            width: 'calc(33.33% - 8px)',
            background: 'var(--primary-500)',
            borderRadius: 24, transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            boxShadow: '0 2px 8px rgba(56, 189, 248, 0.4)'
          }} />
          
          <button 
            style={{ 
              position: 'relative', zIndex: 1, padding: '10px 24px', minWidth: 140,
              background: 'transparent', border: 'none', color: billingCycle === 'monthly' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'color 0.3s'
            }}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            style={{ 
              position: 'relative', zIndex: 1, padding: '10px 24px', minWidth: 140,
              background: 'transparent', border: 'none', color: billingCycle === 'half_yearly' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'color 0.3s'
            }}
            onClick={() => setBillingCycle('half_yearly')}
          >
            6 Months
          </button>
          <button 
            style={{ 
              position: 'relative', zIndex: 1, padding: '10px 24px', minWidth: 140,
              background: 'transparent', border: 'none', color: billingCycle === 'yearly' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'color 0.3s'
            }}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, paddingBottom: 40 }}>
        {plans === null ? (
           <Skeleton height={400} />
        ) : (
          plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_inr_monthly : (billingCycle === 'half_yearly' ? plan.price_inr_half_yearly : plan.price_inr_yearly);
            const isRecommended = plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('starter');
            
            return (
              <div key={plan.id} style={{ 
                background: isRecommended ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, var(--navy-800) 100%)' : 'var(--navy-800)', 
                padding: '40px 32px', 
                borderRadius: 24, 
                border: isRecommended ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                position: 'relative',
                transform: isRecommended ? 'scale(1.02)' : 'none',
                boxShadow: isRecommended ? '0 20px 40px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex', flexDirection: 'column'
              }}>
                {isRecommended && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-500)', color: '#fff', padding: '6px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1, boxShadow: '0 4px 12px rgba(56,189,248,0.3)' }}>RECOMMENDED</div>
                )}
                <div style={{ fontSize: 24, fontWeight: 700, color: isRecommended ? 'var(--primary-400)' : 'var(--text-main)', marginBottom: 8 }}>{plan.name}</div>
                <div style={{ fontSize: 48, fontWeight: 800, margin: '16px 0', display: 'flex', alignItems: 'baseline', gap: 4, color: 'var(--text-main)' }}>
                  ₹{price}
                  <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500 }}>/{billingCycle === 'monthly' ? 'mo' : (billingCycle === 'half_yearly' ? '6mo' : 'yr')}</span>
                </div>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 40px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-secondary)' }}><CheckCircle size={20} color="var(--primary-400)" /> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{plan.monitor_limit === -1 ? 'Unlimited' : plan.monitor_limit}</span> Monitors</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-secondary)' }}><CheckCircle size={20} color="var(--primary-400)" /> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{plan.check_interval_min_seconds}s</span> interval frequency</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-secondary)' }}><CheckCircle size={20} color="var(--primary-400)" /> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{plan.team_member_limit === -1 ? 'Unlimited' : plan.team_member_limit}</span> Team members</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-secondary)' }}><CheckCircle size={20} color="var(--primary-400)" /> <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{plan.status_page_limit === -1 ? 'Unlimited' : plan.status_page_limit}</span> Status pages</li>
                </ul>

                {currentSub?.plan_id === plan.id || (price === 0 && (!currentSub || currentSub.status !== 'active')) ? (
                  <button className="btn btn-ghost" disabled style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--white-60)' }}>Current Plan</button>
                ) : price === 0 ? (
                  <button className="btn btn-ghost" disabled style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 12, opacity: 0.5 }}>Free Plan</button>
                ) : (
                  <button className={`btn ${isRecommended ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 12, background: isRecommended ? '' : 'var(--navy-700)' }} onClick={() => setShowCheckout(plan)}>
                    Subscribe Now
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCheckout && (
        <Modal title={`Subscribe to ${showCheckout.name}`} onClose={() => { setShowCheckout(null); setShowUpiFlow(false); setUtrNumber(''); setReceiptFile(null); }} footer={
          !showUpiFlow && <button className="btn btn-ghost" onClick={() => { setShowCheckout(null); setShowUpiFlow(false); setUtrNumber(''); setReceiptFile(null); }}>Cancel</button>
        }>
          <div style={{ marginBottom: 24, fontSize: 15, color: 'var(--white-80)' }}>
            You are subscribing to the <strong>{showCheckout.name}</strong> plan ({billingCycle}) for <strong>₹{billingCycle === 'monthly' ? showCheckout.price_inr_monthly : (billingCycle === 'half_yearly' ? showCheckout.price_inr_half_yearly : showCheckout.price_inr_yearly)}</strong>.
          </div>
          
          {showUpiFlow ? (
            <div className="panel" style={{ padding: 40, border: '2px dashed var(--navy-600)', background: 'var(--navy-800)', cursor: 'pointer' }} onClick={() => document.getElementById('receipt-upload').click()}>
              <div style={{ textAlign: 'center', color: 'var(--white-100)' }}>
                <Upload size={32} style={{ margin: '0 auto 12px auto', color: 'var(--primary-400)' }} />
                Please scan the QR code below or use the UPI ID to pay.
              </div>
              
              {settings?.upi_qr_url && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src={settings.upi_qr_url} alt="UPI QR" style={{ width: 200, height: 200, borderRadius: 8, background: '#fff', padding: 8 }} />
                </div>
              )}
              
              <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: 'var(--primary-400)' }}>
                {settings?.upi_id || 'UPI ID not configured'}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--white-80)', fontWeight: 500 }}>Transaction Receipt / UTR Number <span style={{color: '#f87171'}}>*</span></label>
                <input 
                  type="text" 
                  className="input" 
                  value={utrNumber} 
                  onChange={(e) => setUtrNumber(e.target.value)} 
                  placeholder="Enter 12-digit UTR or Transaction ID"
                  style={{ padding: '12px', fontSize: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, color: 'var(--white-80)', fontWeight: 500 }}>Payment Screenshot / Receipt <span style={{color: '#f87171'}}>*</span></label>
                <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 12, padding: '24px', textAlign: 'center', background: receiptFile ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', cursor: 'pointer' }}>
                  <input 
                    id="receipt-upload"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  {receiptFile ? (
                    <div style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                      <CheckCircle size={24} style={{ marginBottom: 8 }} />
                      <div>{receiptFile.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--white-60)', marginTop: 4 }}>Click to change file</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontWeight: 500, color: 'var(--white-100)' }}>Click or drag to upload receipt</div>
                      <div style={{ fontSize: 12, color: 'var(--white-60)' }}>PNG, JPG, PDF (max 2MB)</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowUpiFlow(false)}>Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSubscribe('upi')} disabled={submitting || !utrNumber.trim() || !receiptFile}>Submit Payment</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-primary" onClick={() => handleSubscribe('razorpay')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', fontSize: 16, padding: '12px', background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', border: '1px solid #4ca1af' }}>
                <CreditCard size={20} /> Pay with Razorpay
              </button>
              <button className="btn btn-ghost" onClick={() => setShowUpiFlow(true)} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', background: 'var(--bg-2)' }}>
                 Pay Manually with UPI / QR
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
