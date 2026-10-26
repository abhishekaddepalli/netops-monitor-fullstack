import { useEffect, useState } from 'react';
import { Shield, Key, Mail, Building, Bell, User, Copy, Check, Download, RefreshCw, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { apiErrorMessage } from '../api/client';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { organizationsApi } from '../api/organizations';

export default function Settings() {
  const toast = useToast();
  const { user, organization, isOrgAdmin, refresh } = useAuth();
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">Settings</div>
      </div>

      <div className="row-2" style={{ marginBottom: 24 }}>
        <div className="panel" style={{ borderTop: '4px solid var(--chakra-500)' }}>
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, background: 'var(--navy-800)', borderRadius: 8, color: 'var(--white-80)' }}><Building size={18} /></div>
              <div>
                <div className="panel-title">Organization Profile</div>
                <div className="panel-sub" style={{ marginTop: 2 }}>Manage your workspace</div>
              </div>
            </div>
            {isOrgAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setShowEditOrg(true)}>Edit</button>}
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row label="Name" value={organization?.name} />
            <Row label="Billing Email" value={organization?.billing_email} />
            <Row label="Phone" value={organization?.phone} />
            <Row label="Address" value={organization?.address} />
            <Row label="Plan" value={organization?.plan} capitalize />
            <Row label="Monitor limit" value={organization?.monitor_limit} />
            <Row label="Team member limit" value={organization?.team_member_limit} />
            <Row label="Timezone" value={organization?.timezone} />
          </div>
        </div>

        <div className="panel" style={{ borderTop: '4px solid var(--green-500)' }}>
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, background: 'var(--navy-800)', borderRadius: 8, color: 'var(--white-80)' }}><User size={18} /></div>
              <div>
                <div className="panel-title">Your Account</div>
                <div className="panel-sub" style={{ marginTop: 2 }}>Manage your profile</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEditProfile(true)}>Edit</button>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row label="Name" value={user?.name} />
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={(user?.role || 'Member').replace('_', ' ')} capitalize />
          </div>
        </div>
      </div>

      <div className="panel" style={{ borderTop: '4px solid var(--saffron-500)' }}>
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'var(--navy-800)', borderRadius: 8, color: 'var(--white-80)' }}><Shield size={18} /></div>
            <div>
              <div className="panel-title">Security & Two-Factor Authentication</div>
              <div className="panel-sub" style={{ marginTop: 2 }}>Protect your account with an extra layer of security</div>
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--navy-900)', borderRadius: '12px', border: '1px solid var(--navy-border)' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Two-Factor Authentication (2FA)</div>
              <div style={{ color: 'var(--white-60)', fontSize: 14 }}>
                {user?.two_factor_enabled 
                  ? 'Two-factor authentication is currently enabled on your account.'
                  : 'Two-factor authentication adds an additional layer of security to your account by requiring more than just a password to log in.'}
              </div>
            </div>
            <button 
              className={user?.two_factor_enabled ? "btn btn-ghost" : "btn btn-primary"} 
              onClick={() => setShow2FA(true)}
              style={{ flexShrink: 0, marginLeft: 24 }}
            >
              {user?.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      </div>

      {show2FA && (
        <TwoFactorModal user={user} onClose={() => setShow2FA(false)} onRefresh={refresh} />
      )}

      {showEditOrg && (
        <EditOrganizationModal org={organization} onClose={() => setShowEditOrg(false)} />
      )}

      {showEditProfile && (
        <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} />
      )}
    </>
  );
}

function Row({ label, value, capitalize }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--white-40)', fontSize: 12.5 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: capitalize ? 'capitalize' : 'none' }}>{value ?? '—'}</span>
    </div>
  );
}

function TwoFactorModal({ user, onClose, onRefresh }) {
  const toast = useToast();
  const [loading, setLoading] = useState(!user?.two_factor_enabled);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  
  // Disable mode states
  const [disableMode, setDisableMode] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  
  // Recovery codes view mode
  const [viewingRecovery, setViewingRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  useEffect(() => {
    if (!user?.two_factor_enabled) {
      loadSetupData();
    }
  }, [user]);

  async function loadSetupData() {
    setLoading(true);
    try {
      const { data } = await authApi.setup2Fa();
      setSetupData(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not initiate 2FA setup.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e) {
    if (e) e.preventDefault();
    if (!code || code.trim().length < 6) {
      return toast.error('Please enter the 6-digit verification code from your authenticator app.');
    }
    setSubmitting(true);
    try {
      await authApi.enable2Fa(code.trim());
      toast.success('Two-Factor Authentication has been successfully activated!');
      if (onRefresh) await onRefresh();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to verify 2FA code.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(e) {
    if (e) e.preventDefault();
    if (!disablePassword && !disableCode) {
      return toast.error('Please enter your account password or a 2FA code.');
    }
    setSubmitting(true);
    try {
      await authApi.disable2Fa({ password: disablePassword, code: disableCode });
      toast.success('Two-Factor Authentication has been disabled.');
      if (onRefresh) await onRefresh();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to disable 2FA.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadRecoveryCodes(regenerate = false) {
    setLoadingRecovery(true);
    try {
      const { data } = await authApi.getRecoveryCodes(regenerate);
      setRecoveryCodes(data.recovery_codes || []);
      setViewingRecovery(true);
      if (regenerate) {
        toast.success('New recovery codes generated.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load recovery codes.'));
    } finally {
      setLoadingRecovery(false);
    }
  }

  const handleCopyKey = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success('Secret key copied to clipboard.');
    }
  };

  const handleCopyCodes = (codes) => {
    if (codes && codes.length) {
      navigator.clipboard.writeText(codes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
      toast.success('Recovery codes copied to clipboard.');
    }
  };

  const handleDownloadCodes = (codes) => {
    const text = "NetOps Monitor - 2FA Emergency Recovery Codes\n" +
      "Generated: " + new Date().toISOString() + "\n" +
      "Keep these codes safe. Each code can be used once if you lose access to your authenticator app.\n\n" +
      codes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netops-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Recovery codes downloaded.');
  };

  // -------------------------------------------------------------
  // Mode A: User already has 2FA enabled -> Manage & Disable view
  // -------------------------------------------------------------
  if (user?.two_factor_enabled) {
    return (
      <Modal 
        title="Manage Two-Factor Authentication" 
        onClose={onClose} 
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            {disableMode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setDisableMode(false)}>Back</button>
                <button className="btn btn-danger" onClick={handleDisable} disabled={submitting}>
                  {submitting ? 'Disabling...' : 'Confirm Disable 2FA'}
                </button>
              </div>
            ) : (
              <button className="btn btn-danger" onClick={() => setDisableMode(true)}>
                Disable 2FA
              </button>
            )}
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active status banner */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Shield size={36} color="#34d399" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#34d399' }}>2FA is Active & Protecting Your Account</div>
              <div style={{ color: 'var(--white-70)', fontSize: 13, marginTop: 4 }}>
                Authenticator app verification is required whenever you sign in with password.
              </div>
            </div>
          </div>

          {!disableMode && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-90)', marginBottom: 8 }}>Emergency Recovery Codes</div>
              <p style={{ color: 'var(--white-60)', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
                If you ever lose access to your authenticator phone or tablet, single-use recovery codes allow you to regain account access.
              </p>
              
              {viewingRecovery ? (
                <div style={{ background: 'var(--navy-900)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {recoveryCodes.map((c, idx) => (
                      <div key={idx} style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, textAlign: 'center', color: '#38bdf8', letterSpacing: 1 }}>
                        {c}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleCopyCodes(recoveryCodes)}>
                      {copiedCodes ? <Check size={14} color="#34d399" /> : <Copy size={14} />} {copiedCodes ? 'Copied' : 'Copy All'}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleDownloadCodes(recoveryCodes)}>
                      <Download size={14} /> Download (.txt)
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleLoadRecoveryCodes(true)} disabled={loadingRecovery} style={{ marginLeft: 'auto' }}>
                      <RefreshCw size={14} className={loadingRecovery ? 'spin' : ''} /> Regenerate Codes
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-ghost" onClick={() => handleLoadRecoveryCodes(false)} disabled={loadingRecovery} style={{ background: 'var(--navy-800)' }}>
                  <Key size={16} /> {loadingRecovery ? 'Loading...' : 'View / Regenerate Recovery Codes'}
                </button>
              )}
            </div>
          )}

          {disableMode && (
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                <AlertTriangle size={18} /> Confirm Disabling 2FA
              </div>
              <p style={{ color: 'var(--white-70)', fontSize: 13, marginBottom: 16 }}>
                Disabling two-factor authentication makes your account less secure. Please enter your account password or current 2FA code to verify this action.
              </p>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Account Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={disablePassword} 
                  onChange={(e) => setDisablePassword(e.target.value)} 
                  placeholder="Enter your current password"
                />
              </div>
              <div style={{ textAlign: 'center', margin: '8px 0', color: 'var(--white-40)', fontSize: 12 }}>— OR —</div>
              <div className="form-group">
                <label className="form-label">6-Digit Authenticator Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  className="form-input" 
                  value={disableCode} 
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))} 
                  placeholder="e.g. 123456"
                  style={{ letterSpacing: 4, fontFamily: 'monospace', fontSize: 16 }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // -------------------------------------------------------------
  // Mode B: User is enabling 2FA -> Step-by-step Setup View
  // -------------------------------------------------------------
  return (
    <Modal 
      title="Setup Two-Factor Authentication" 
      onClose={onClose} 
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEnable} disabled={submitting || !code || code.length < 6}>
            {submitting ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          <div style={{ color: 'var(--white-70)', fontSize: 14 }}>Generating secure authenticator credentials...</div>
        </div>
      ) : setupData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Step 1: Scan QR or copy Secret */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--white-100)', marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', width: 22, height: 22, background: 'var(--primary-500)', color: '#fff', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>1</span>
              Scan QR Code with Authenticator App
            </div>
            <p style={{ color: 'var(--white-60)', fontSize: 13, marginBottom: 16 }}>
              Open Google Authenticator, Microsoft Authenticator, Authy, or 1Password on your phone and scan the QR code below.
            </p>

            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', background: 'var(--navy-900)', border: '1px solid var(--navy-border)', padding: 16, borderRadius: 12 }}>
              {/* QR Code */}
              <div style={{ background: '#ffffff', padding: 8, borderRadius: 8, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <img src={setupData.qr_url} alt="2FA QR Code" width={160} height={160} style={{ display: 'block', imageRendering: 'pixelated' }} />
              </div>

              {/* Secret Key Manual Entry */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, color: 'var(--white-60)', marginBottom: 4 }}>Can't scan? Enter key manually:</div>
                <div style={{ 
                  background: 'var(--navy-800)', 
                  border: '1px solid var(--navy-600)', 
                  padding: '10px 14px', 
                  borderRadius: 8, 
                  fontFamily: 'monospace', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#38bdf8', 
                  letterSpacing: 2,
                  marginBottom: 8,
                  wordBreak: 'break-all'
                }}>
                  {setupData.formatted_secret || setupData.secret}
                </div>
                <button 
                  type="button" 
                  className="btn btn-sm btn-ghost" 
                  onClick={handleCopyKey} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {copiedKey ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  {copiedKey ? 'Copied Secret Key' : 'Copy Secret Key'}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Emergency Recovery Codes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--white-100)', marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', width: 22, height: 22, background: 'var(--primary-500)', color: '#fff', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>2</span>
              Save Emergency Recovery Codes
            </div>
            <p style={{ color: 'var(--white-60)', fontSize: 13, marginBottom: 12 }}>
              Store these single-use recovery codes in a secure password manager. They allow logging in if you lose phone access.
            </p>

            <div style={{ background: 'var(--navy-900)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
                {setupData.recovery_codes.map((c, idx) => (
                  <div key={idx} style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', padding: '6px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, textAlign: 'center', color: '#cbd5e1', letterSpacing: 1 }}>
                    {c}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => handleCopyCodes(setupData.recovery_codes)}>
                  {copiedCodes ? <Check size={14} color="#34d399" /> : <Copy size={14} />} {copiedCodes ? 'Copied' : 'Copy All Codes'}
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => handleDownloadCodes(setupData.recovery_codes)}>
                  <Download size={14} /> Download File (.txt)
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Enter 6-digit verification code */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--white-100)', marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', width: 22, height: 22, background: 'var(--primary-500)', color: '#fff', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>3</span>
              Enter 6-Digit Code to Activate
            </div>
            <form onSubmit={handleEnable}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
                <input 
                  type="text" 
                  maxLength={6} 
                  autoFocus
                  className="form-input" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} 
                  placeholder="000000"
                  style={{ 
                    maxWidth: 200, 
                    fontSize: 22, 
                    fontWeight: 700, 
                    letterSpacing: 6, 
                    textAlign: 'center', 
                    fontFamily: 'monospace',
                    padding: '10px 14px',
                    borderColor: code.length === 6 ? 'var(--primary-400)' : 'var(--navy-600)'
                  }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || code.length < 6}
                  style={{ height: 46 }}
                >
                  {submitting ? 'Verifying...' : 'Activate 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--danger)', padding: 20 }}>
          Could not load 2FA setup configuration. Please close and try again.
        </div>
      )}
    </Modal>
  );
}

function EditOrganizationModal({ org, onClose }) {
  const toast = useToast();
  const [name, setName] = useState(org.name || '');
  const [billingEmail, setBillingEmail] = useState(org.billing_email || '');
  const [phone, setPhone] = useState(org.phone || '');
  const [address, setAddress] = useState(org.address || '');
  const [timezone, setTimezone] = useState(org.timezone || 'UTC');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await organizationsApi.update({ 
        name, timezone, billing_email: billingEmail, phone, address 
      });
      toast.success('Organization updated. Refresh to see changes.');
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Organization" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Billing Email</label>
          <input type="email" className="form-input" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Timezone</label>
          <input className="form-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
        </div>
      </form>
    </Modal>
  );
}

function EditProfileModal({ user, onClose }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name, email };
      if (password) {
        payload.password = password;
        payload.password_confirmation = passwordConfirm;
      }
      await authApi.updateProfile(payload);
      toast.success('Profile updated. Refresh to see changes.');
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Profile" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group" style={{ marginTop: 20 }}>
          <label className="form-label">New Password (leave blank to keep current)</label>
          <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {password && (
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
          </div>
        )}
      </form>
    </Modal>
  );
}
