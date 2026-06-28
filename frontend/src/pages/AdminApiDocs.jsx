import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import { Code, Key, Copy, CheckCircle } from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';

export default function AdminApiDocs() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then(({ data }) => {
      setApiKey(data.radius_api_key || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!confirm('Generating a new API Key will invalidate the old one. Continue?')) return;
    setGenerating(true);
    const newKey = 'rad_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      await adminApi.updateSettings({ radius_api_key: newKey });
      setApiKey(newKey);
      toast.success('New Radius API Key generated!');
    } catch {
      toast.error('Failed to generate key.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Skeleton height={400} />;

  return (
    <>
      <div className="detail-header">
        <div className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Code color="var(--primary-400)" /> Radius API Integration
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div className="panel-title">Integration Credentials</div>
        </div>
        <div className="panel-body">
          <p style={{ color: 'var(--white-70)', marginBottom: 16 }}>
            Use this API key to authenticate requests from your Radius server. This allows you to programmatically create organizations, assign plans, and manage users.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="text" 
                className="input" 
                value={apiKey || 'No key generated yet'} 
                readOnly 
                style={{ fontFamily: 'var(--font-mono)', paddingRight: 48, background: 'var(--navy-900)' }}
              />
              {apiKey && (
                <button 
                  onClick={copyToClipboard}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: copied ? 'var(--green-400)' : 'var(--white-50)', cursor: 'pointer' }}
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              <Key size={16} style={{ marginRight: 8 }} /> {apiKey ? 'Regenerate Key' : 'Generate Key'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">API Documentation</div>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: 'var(--navy-900)', padding: 20, borderRadius: 12, border: '1px solid var(--navy-700)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'var(--white-90)' }}>1. Provision a New Organization & User</h3>
            <p style={{ color: 'var(--white-70)', fontSize: 14, marginBottom: 16 }}>
              Creates a new organization, assigns a billing plan, and creates the initial admin user.
            </p>
            <div style={{ background: 'var(--bg-1)', padding: '4px 12px', borderRadius: 4, display: 'inline-block', marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 13, border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--primary-400)', fontWeight: 'bold' }}>POST</span> {import.meta.env.VITE_API_BASE_URL}/radius/provision
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--white-60)' }}>Headers</div>
            <pre style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 13, color: 'var(--white-80)', margin: '0 0 16px 0' }}>
              Authorization: Bearer YOUR_RADIUS_API_KEY
            </pre>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--white-60)' }}>Body (JSON)</div>
            <pre style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 13, color: 'var(--green-400)', margin: 0, fontFamily: 'var(--font-mono)' }}>
{JSON.stringify({
  "org_name": "Acme Corp",
  "plan_key": "pro",
  "admin_name": "John Doe",
  "admin_email": "john@acme.com",
  "admin_password": "securepassword123"
}, null, 2)}
            </pre>
          </div>

          <div style={{ background: 'var(--navy-900)', padding: 20, borderRadius: 12, border: '1px solid var(--navy-700)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'var(--white-90)' }}>2. Suspend / Unsuspend Organization</h3>
            <p style={{ color: 'var(--white-70)', fontSize: 14, marginBottom: 16 }}>
              Toggle the suspension status of an organization. Suspended organizations cannot log in or run monitors.
            </p>
            <div style={{ background: 'var(--bg-1)', padding: '4px 12px', borderRadius: 4, display: 'inline-block', marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 13, border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--orange-400)', fontWeight: 'bold' }}>POST</span> {import.meta.env.VITE_API_BASE_URL}/radius/suspend
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--white-60)' }}>Body (JSON)</div>
            <pre style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 13, color: 'var(--green-400)', margin: 0, fontFamily: 'var(--font-mono)' }}>
{JSON.stringify({
  "org_id": 123,
  "action": "suspend" // or "unsuspend"
}, null, 2)}
            </pre>
          </div>

        </div>
      </div>
    </>
  );
}
