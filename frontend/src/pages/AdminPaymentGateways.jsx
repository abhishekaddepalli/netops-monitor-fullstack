import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';

export default function AdminPaymentGateways() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [razorpayKey, setRazorpayKey] = useState('');
  const [razorpaySecret, setRazorpaySecret] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.getSettings();
      setSettings(data);
      setRazorpayKey(data.razorpay_key || '');
      setRazorpaySecret(data.razorpay_secret || '');
      setUpiId(data.upi_id || '');
      setUpiQrUrl(data.upi_qr_url || '');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load settings.'));
      setSettings({});
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.updateSettings({
        razorpay_key: razorpayKey,
        razorpay_secret: razorpaySecret,
        upi_id: upiId,
        upi_qr_url: upiQrUrl,
      });
      toast.success('Global settings updated successfully.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">Super Admin — Global Settings</div>
      </div>

      <div className="panel" style={{ maxWidth: 600 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Payment Gateways</div>
            <div className="panel-sub">Configure Stripe and Razorpay integrations for tenant subscriptions</div>
          </div>
        </div>
        <div className="panel-body">
          {settings === null ? (
            <Skeleton height={200} />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Razorpay Key ID</label>
                <input className="form-input" value={razorpayKey} onChange={(e) => setRazorpayKey(e.target.value)} placeholder="rzp_test_..." />
              </div>
              <div className="form-group">
                <label className="form-label">Razorpay Key Secret</label>
                <input type="password" className="form-input" value={razorpaySecret} onChange={(e) => setRazorpaySecret(e.target.value)} placeholder="..." />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

              <div className="form-group">
                <label className="form-label">UPI ID / VPA</label>
                <input className="form-input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="merchant@upi" />
              </div>
              <div className="form-group">
                <label className="form-label">UPI QR Code Image URL</label>
                <input className="form-input" value={upiQrUrl} onChange={(e) => setUpiQrUrl(e.target.value)} placeholder="https://example.com/qr.png" />
              </div>

              <div style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
