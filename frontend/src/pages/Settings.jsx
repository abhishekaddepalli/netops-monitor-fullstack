import { useEffect, useState } from 'react';
import { Shield, Key, Mail, Building, Bell, User } from 'lucide-react';
import { apiErrorMessage } from '../api/client';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { organizationsApi } from '../api/organizations';

export default function Settings() {
  const toast = useToast();
  const { user, organization, isOrgAdmin } = useAuth();
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
        <TwoFactorModal user={user} onClose={() => setShow2FA(false)} />
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

function TwoFactorModal({ user, onClose }) {
  const toast = useToast();
  
  // As this is a frontend-only mock representation for the user's request:
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.error('2FA backend endpoints are currently being provisioned. Please try again later.');
    onClose();
  };

  return (
    <Modal title="Configure 2FA" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Enable Authenticator App</button>
      </>
    }>
      <div style={{ padding: '0 8px' }}>
        <p style={{ color: 'var(--white-80)', marginBottom: 20, lineHeight: 1.6 }}>
          To enable two-factor authentication, you will need to scan a QR code using an authenticator app like Google Authenticator, Authy, or 1Password.
        </p>
        <div style={{ background: 'var(--navy-900)', padding: 16, borderRadius: 12, border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Shield size={32} color="var(--saffron-500)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Authenticator App</div>
            <div style={{ color: 'var(--white-60)', fontSize: 13, marginTop: 4 }}>Use a mobile app to generate secure access codes.</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EditOrganizationModal({ org, onClose }) {
  const toast = useToast();
  const [name, setName] = useState(org.name);
  const [timezone, setTimezone] = useState(org.timezone || 'UTC');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await organizationsApi.update({ name, timezone });
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
