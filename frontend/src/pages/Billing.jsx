import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { 
  CreditCard, CheckCircle, Upload, Receipt, FileText, ExternalLink, 
  Clock, Shield, ArrowRight, Printer, Copy, Check, Info, Sparkles 
} from 'lucide-react';

export default function Billing() {
  const toast = useToast();
  const [plans, setPlans] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showCheckout, setShowCheckout] = useState(null); // stores the plan to checkout
  const [submitting, setSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly', 'half_yearly', 'yearly'
  const [showUpiFlow, setShowUpiFlow] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const loadData = () => {
    // Fetch public plans
    apiClient.get('/plans').then(({ data }) => setPlans(data || [])).catch(() => setPlans([]));
    
    // Fetch current subscription and organization usage info
    apiClient.get('/v1/billing/current').then(({ data }) => {
      setCurrentSub(data.subscription || null);
      setCurrentPlan(data.plan || null);
      setCurrentOrg(data.organization || null);
    }).catch(() => {});

    // Fetch organization invoices
    apiClient.get('/v1/billing/invoices').then(({ data }) => setInvoices(data || [])).catch(() => setInvoices([]));
    
    // Fetch global settings to get UPI info & payment credentials
    apiClient.get('/global-settings').then(({ data }) => setSettings(data || {})).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const getPlanPrice = (plan, cycle) => {
    if (!plan) return 0;
    if (cycle === 'daily') return Number(plan.price_inr_daily) || 0;
    if (cycle === 'half_yearly') return Number(plan.price_inr_half_yearly) || (Number(plan.price_inr_monthly) * 6);
    if (cycle === 'yearly') return Number(plan.price_inr_yearly) || (Number(plan.price_inr_monthly) * 12);
    return Number(plan.price_inr_monthly) || 0;
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  async function handleSubscribe(method) {
    if (!showCheckout) return;
    setSubmitting(true);
    try {
      let res;
      if (method === 'upi') {
        if (!utrNumber.trim()) {
          toast.error('Please enter your 12-digit UTR or Transaction ID.');
          setSubmitting(false);
          return;
        }
        if (!receiptFile) {
          toast.error('Please upload your payment screenshot/receipt.');
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('plan_key', showCheckout.key);
        formData.append('payment_method', method);
        formData.append('billing_cycle', billingCycle);
        formData.append('utr_number', utrNumber.trim());
        formData.append('receipt_file', receiptFile);
        
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

        const calculatedPrice = getPlanPrice(showCheckout, billingCycle);

        const options = {
          key: razorpay_key,
          amount: calculatedPrice * 100, // paise
          currency: 'INR',
          name: settings?.app_name || 'NetOps Monitor',
          description: `Subscription to ${showCheckout.name} (${billingCycle})`,
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
              setShowUpiFlow(false);
              loadData();
            } catch (err) {
              toast.error(apiErrorMessage(err, 'Payment verification failed.'));
            }
          },
          theme: { color: settings?.primary_color || '#2E4FA3' },
          modal: {
            ondismiss: async function() {
              try {
                await apiClient.post('/v1/billing/cancel-draft');
                loadData();
              } catch (e) {}
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async function (response){
          toast.error(response?.error?.description || 'Payment failed.');
          try {
            await apiClient.post('/v1/billing/cancel-draft');
            loadData();
          } catch (e) {}
        });
        rzp.open();
      } else {
        toast.success('Invoice submitted! Your payment is pending admin approval.');
        setShowCheckout(null);
        setShowUpiFlow(false);
        setUtrNumber('');
        setReceiptFile(null);
        loadData();
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const getStorageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || '';
    return `${base}/storage/${path}`;
  };

  const activePlanName = currentSub?.plan?.name || currentPlan?.name || (currentOrg?.plan ? currentOrg.plan.toUpperCase() : 'Free Plan');
  const monitorLimit = currentPlan?.monitor_limit ?? (currentOrg?.monitor_limit ?? 10);
  const teamLimit = currentPlan?.team_member_limit ?? (currentOrg?.team_member_limit ?? 2);

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Subscription & Billing</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Manage your organization plan, billing frequency, and invoices
          </div>
        </div>
      </div>

      {/* Hero Banner for Current Subscription */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 32, 60, 0.4) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 36,
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary-400)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 12 }}>
            <Sparkles size={16} /> Current Subscription Plan
          </div>
          {currentSub?.status === 'trialing' && (
            <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} /> Payment Verification Pending
            </span>
          )}
          {currentSub?.status === 'active' && (
            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={13} /> Active Subscription
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
              {activePlanName}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Organization: <strong style={{ color: 'var(--text-main)' }}>{currentOrg?.name || 'Your Team'}</strong>
              {currentSub?.current_period_ends_at && (
                <span> • Renews on {new Date(currentSub.current_period_ends_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--navy-600)', padding: '12px 20px', borderRadius: 12, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Monitors Used</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                {currentOrg?.monitors_count || 0} / {monitorLimit === -1 ? '∞' : monitorLimit}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--navy-600)', padding: '12px 20px', borderRadius: 12, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Team Seats</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                {currentOrg?.team_members_count || 1} / {teamLimit === -1 ? '∞' : teamLimit}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cycle Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36, gap: 8 }}>
        <div style={{ 
          display: 'flex', background: 'var(--navy-800)', borderRadius: 30, padding: 5, 
          border: '1px solid var(--navy-600)', position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            position: 'absolute', top: 5, bottom: 5,
            left: billingCycle === 'monthly' ? 5 : billingCycle === 'half_yearly' ? '33.33%' : '66.66%',
            width: 'calc(33.33% - 7px)',
            background: 'var(--primary-500)',
            borderRadius: 24, transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            boxShadow: '0 2px 10px rgba(56, 189, 248, 0.4)'
          }} />
          
          <button 
            type="button"
            style={{ 
              position: 'relative', zIndex: 1, padding: '10px 24px', minWidth: 130,
              background: 'transparent', border: 'none', color: billingCycle === 'monthly' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'color 0.3s'
            }}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            type="button"
            style={{ 
              position: 'relative', zIndex: 1, padding: '10px 24px', minWidth: 130,
              background: 'transparent', border: 'none', color: billingCycle === 'half_yearly' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'color 0.3s'
            }}
            onClick={() => setBillingCycle('half_yearly')}
          >
            6 Months
          </button>
          <button 
            type="button"
            style={{ 
              position: 'relative', zIndex: 1, padding: '10px 24px', minWidth: 130,
              background: 'transparent', border: 'none', color: billingCycle === 'yearly' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'color 0.3s'
            }}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly (Save)
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--white-50)' }}>
          Choose your billing frequency. Annual plans include extended uptime retention.
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 24, paddingBottom: 40 }}>
        {plans === null ? (
          <Skeleton height={380} />
        ) : plans.length === 0 ? (
          <div className="panel" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--white-60)' }}>
            No subscription plans currently active.
          </div>
        ) : (
          plans.filter(p => p.is_public !== false).map((plan) => {
            const price = getPlanPrice(plan, billingCycle);
            const isCurrent = currentSub?.plan_id === plan.id || (!currentSub && currentOrg?.plan === plan.key);
            const isFeatured = (plan?.name || '').toLowerCase().includes('pro') || (plan?.name || '').toLowerCase().includes('enterprise');

            return (
              <div key={plan.id} style={{ 
                background: isFeatured ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, var(--navy-800) 100%)' : 'var(--navy-800)', 
                padding: '36px 30px', 
                borderRadius: 20, 
                border: isCurrent ? '2px solid var(--primary-400)' : isFeatured ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                position: 'relative',
                boxShadow: isFeatured ? '0 16px 40px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column'
              }}>
                {isFeatured && (
                  <div style={{ 
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', 
                    background: 'var(--primary-500)', color: '#fff', padding: '4px 16px', borderRadius: 16, 
                    fontSize: 11, fontWeight: 800, letterSpacing: 0.8, boxShadow: '0 4px 12px rgba(56,189,248,0.4)' 
                  }}>
                    POPULAR CHOICE
                  </div>
                )}

                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                  {plan.name}
                </div>
                
                <div style={{ fontSize: 44, fontWeight: 800, margin: '14px 0', display: 'flex', alignItems: 'baseline', gap: 4, color: 'var(--text-main)' }}>
                  ₹{price}
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    /{billingCycle === 'monthly' ? 'mo' : (billingCycle === 'half_yearly' ? '6mo' : 'yr')}
                  </span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 32px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={18} color="var(--primary-400)" />
                    <span><strong style={{ color: 'var(--text-main)' }}>{plan.monitor_limit === -1 ? 'Unlimited' : plan.monitor_limit}</strong> Active Monitors</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={18} color="var(--primary-400)" />
                    <span><strong style={{ color: 'var(--text-main)' }}>{plan.check_interval_min_seconds}s</strong> Fastest Check Interval</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={18} color="var(--primary-400)" />
                    <span><strong style={{ color: 'var(--text-main)' }}>{plan.team_member_limit === -1 ? 'Unlimited' : plan.team_member_limit}</strong> Team Members</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={18} color="var(--primary-400)" />
                    <span><strong style={{ color: 'var(--text-main)' }}>{plan.status_page_limit === -1 ? 'Unlimited' : (plan.status_page_limit ?? 1)}</strong> Status Pages</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={18} color="var(--primary-400)" />
                    <span><strong style={{ color: 'var(--text-main)' }}>{plan.alert_limit_monthly === -1 ? 'Unlimited' : plan.alert_limit_monthly}</strong> Alerts / month</span>
                  </li>
                </ul>

                {isCurrent ? (
                  <button className="btn btn-ghost" disabled style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'var(--white-70)', fontWeight: 600 }}>
                    Current Plan
                  </button>
                ) : price === 0 ? (
                  <button className="btn btn-ghost" disabled style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12, opacity: 0.6 }}>
                    Included Tier
                  </button>
                ) : (
                  <button 
                    className={`btn ${isFeatured ? 'btn-primary' : 'btn-ghost'}`} 
                    style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12, background: isFeatured ? '' : 'var(--navy-700)', fontWeight: 700 }} 
                    onClick={() => { setShowCheckout(plan); setShowUpiFlow(false); }}
                  >
                    Subscribe ({billingCycle === 'monthly' ? 'Monthly' : billingCycle === 'half_yearly' ? '6 Months' : 'Yearly'})
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Invoices & Payment History */}
      <div className="panel" style={{ marginTop: 20, marginBottom: 40 }}>
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={18} color="var(--primary-400)" /> Invoices & Payment History
            </div>
            <div className="panel-sub">Official billing statements, payment receipts, and approval tracking</div>
          </div>
        </div>
        <div className="panel-body">
          {invoices === null ? (
            <Skeleton height={140} />
          ) : invoices.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--white-60)' }}>
              <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <div>No invoices generated yet. Your receipts will appear here automatically upon upgrade or renewal.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Plan & Billing Cycle</th>
                    <th>Amount</th>
                    <th>Payment Method / Ref</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const isOpen = inv.status === 'open';
                    const storageUrl = getStorageUrl(inv.receipt_path);

                    return (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-400)' }}>
                          <span style={{ cursor: 'pointer' }} onClick={() => setViewInvoice(inv)}>
                            {inv.invoice_number || `INV-${inv.id}`}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {inv.subscription?.plan?.name || 'Subscription'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--white-50)', textTransform: 'capitalize' }}>
                            {inv.subscription?.billing_cycle || 'Monthly'}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                          ₹{inv.amount}
                        </td>
                        <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--white-70)' }}>
                          {inv.provider_invoice_id || inv.subscription?.billing_provider || '—'}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--white-60)' }}>
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`pill ${isPaid ? 'pill-up' : isOpen ? 'pill-paused' : 'pill-down'}`}>
                            {isPaid ? 'Paid' : isOpen ? 'Pending Approval' : inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              onClick={() => setViewInvoice(inv)}
                              title="View Invoice Statement"
                            >
                              View
                            </button>
                            {storageUrl && (
                              <a 
                                href={storageUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="btn btn-sm btn-ghost"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary-400)' }}
                                title="Download payment screenshot"
                              >
                                <ExternalLink size={13} /> Screenshot
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <Modal 
          title={`Subscribe to ${showCheckout.name}`} 
          onClose={() => { setShowCheckout(null); setShowUpiFlow(false); setUtrNumber(''); setReceiptFile(null); }} 
          maxWidth="640px"
          footer={
            !showUpiFlow && (
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => { setShowCheckout(null); setShowUpiFlow(false); setUtrNumber(''); setReceiptFile(null); }}
              >
                Cancel
              </button>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>SELECTED TIER</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>{showCheckout.name}</div>
                <div style={{ fontSize: 13, color: 'var(--white-60)' }}>Frequency: <span style={{ textTransform: 'capitalize', color: 'var(--primary-400)', fontWeight: 600 }}>{billingCycle}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>AMOUNT DUE</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary-400)', marginTop: 2 }}>
                  ₹{getPlanPrice(showCheckout, billingCycle)}
                </div>
              </div>
            </div>

            {showUpiFlow ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ textAlign: 'center', background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                    Scan QR code or send payment to UPI ID:
                  </div>

                  {settings?.upi_qr_url ? (
                    <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block' }}>
                      <img src={settings.upi_qr_url} alt="UPI QR" style={{ width: 180, height: 180, display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px dashed var(--navy-600)', color: 'var(--white-50)', fontSize: 13 }}>
                      QR code image not uploaded by admin. Please pay using the UPI ID below.
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--navy-600)' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                      {settings?.upi_id || 'UPI ID not configured'}
                    </span>
                    {settings?.upi_id && (
                      <button 
                        type="button" 
                        onClick={() => copyToClipboard(settings.upi_id)} 
                        className="icon-btn-sm" 
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">12-Digit UTR / Transaction Ref <span style={{ color: '#f87171' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={utrNumber} 
                    onChange={(e) => setUtrNumber(e.target.value)} 
                    placeholder="e.g. 428938192837 or UPI Reference ID" 
                    required 
                  />
                  <div style={{ fontSize: 11, color: 'var(--white-40)', marginTop: 4 }}>
                    Found in your bank / UPI payment success screen
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Screenshot / Receipt <span style={{ color: '#f87171' }}>*</span></label>
                  <div 
                    onClick={() => document.getElementById('receipt-file-picker').click()}
                    style={{ 
                      position: 'relative', border: '2px dashed var(--navy-600)', borderRadius: 12, 
                      padding: '24px 16px', textAlign: 'center', background: receiptFile ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)', 
                      cursor: 'pointer', transition: 'all 0.2s' 
                    }}
                  >
                    <input 
                      id="receipt-file-picker"
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                      style={{ display: 'none' }}
                    />
                    {receiptFile ? (
                      <div style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                        <CheckCircle size={28} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                        <div>{receiptFile.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--white-50)', marginTop: 4 }}>Click to choose a different file</div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--white-70)' }}>
                        <Upload size={28} style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--primary-400)' }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Click to upload payment receipt screenshot</div>
                        <div style={{ fontSize: 12, color: 'var(--white-40)', marginTop: 4 }}>PNG, JPG, PDF up to 5MB</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowUpiFlow(false)} disabled={submitting}>
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }} 
                    onClick={() => handleSubscribe('upi')} 
                    disabled={submitting || !utrNumber.trim() || !receiptFile}
                  >
                    {submitting ? 'Submitting Receipt...' : 'Submit Payment'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={() => handleSubscribe('razorpay')} 
                  disabled={submitting} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', 
                    fontSize: 16, padding: '16px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)', 
                    border: 'none', color: '#fff', fontWeight: 700 
                  }}
                >
                  <CreditCard size={20} /> Pay with Razorpay (Cards, UPI, NetBanking)
                </button>

                <button 
                  type="button"
                  className="btn btn-ghost" 
                  onClick={() => setShowUpiFlow(true)} 
                  disabled={submitting} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', 
                    fontSize: 15, padding: '14px', borderRadius: 12,
                    background: 'var(--navy-800)', border: '1px solid var(--navy-600)', fontWeight: 600 
                  }}
                >
                  Pay Manually with UPI / QR Code Transfer
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Invoice Details View Modal */}
      {viewInvoice && (
        <Modal 
          title={`Invoice ${viewInvoice.invoice_number}`} 
          onClose={() => setViewInvoice(null)} 
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={15} /> Print / Save PDF
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setViewInvoice(null)}>
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--navy-600)', 
              borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>INVOICE NUMBER</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginTop: 2 }}>
                    {viewInvoice.invoice_number}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>TOTAL PAID / DUE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                    ₹{viewInvoice.amount}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid var(--navy-700)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>PLAN & CYCLE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                    {viewInvoice.subscription?.plan?.name || 'Subscription'} ({viewInvoice.subscription?.billing_cycle || 'Monthly'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>STATUS</div>
                  <div style={{ marginTop: 2 }}>
                    <span className={`pill ${viewInvoice.status === 'paid' ? 'pill-up' : viewInvoice.status === 'open' ? 'pill-paused' : 'pill-down'}`}>
                      {viewInvoice.status === 'paid' ? 'Paid' : viewInvoice.status === 'open' ? 'Pending Approval' : viewInvoice.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>PAYMENT REF</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 2 }}>
                    {viewInvoice.provider_invoice_id || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                    {new Date(viewInvoice.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {viewInvoice.receipt_path && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Your Uploaded Receipt Screenshot</div>
                  <a 
                    href={getStorageUrl(viewInvoice.receipt_path)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--primary-400)' }}
                  >
                    View Original
                  </a>
                </div>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--navy-600)', background: '#000', maxHeight: 280, display: 'flex', justifyContent: 'center' }}>
                  <img src={getStorageUrl(viewInvoice.receipt_path)} alt="Receipt" style={{ maxHeight: 280, objectFit: 'contain' }} />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
