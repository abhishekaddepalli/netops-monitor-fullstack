import { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import { teamApi } from '../api/team';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { timeAgo } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { key: 'org_admin', label: 'Org Admin' },
  { key: 'operator', label: 'Operator' },
  { key: 'read_only', label: 'Read Only' },
];

export default function Team() {
  const toast = useToast();
  const { isOrgAdmin, user } = useAuth();
  const [members, setMembers] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await teamApi.members();
      setMembers(data || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load team members.'));
      setMembers([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleRoleChange(member, role) {
    try {
      await teamApi.updateRole(member.id, role);
      toast.success(`${member.name}'s role updated.`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleRemove(member) {
    if (!window.confirm(`Remove ${member.name} from the organization?`)) return;
    try {
      await teamApi.remove(member.id);
      toast.success(`${member.name} removed.`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Team</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>{members ? `${members.length} members` : '...'}</div>
        </div>
        {isOrgAdmin && (
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Plus size={15} />Invite Member</button>
        )}
      </div>

      <div className="panel">
        {members === null ? (
          <div className="panel-body"><Skeleton height={200} /></div>
        ) : members.length === 0 ? (
          <div className="panel-body"><EmptyState icon={Users} title="No team members" /></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="mon-name">{m.name}</td>
                  <td className="mon-url">{m.email}</td>
                  <td>
                    {isOrgAdmin && m.email !== user?.email ? (
                      <select className="form-select" style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5 }} value={m.role} onChange={(e) => handleRoleChange(m, e.target.value)}>
                        {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                    ) : (
                      <span className="tag">{ROLES.find((r) => r.key === m.role)?.label || m.role}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--white-60)' }}>{timeAgo(m.last_login_at)}</td>
                  <td>
                    {isOrgAdmin && m.email !== user?.email && (
                      <button className="icon-btn-sm" onClick={() => handleRemove(m)} title="Remove"><Trash2 /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={() => { setShowInvite(false); load(); }} />}
    </>
  );
}

function InviteModal({ onClose, onInvited }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await teamApi.invite({ name, email, role });
      toast.success(`${name} invited as ${role.replace('_', ' ')}.`);
      onInvited();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not invite member.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Invite Team Member" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Inviting…' : 'Send invite'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="inv-name">Name</label>
          <input id="inv-name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="inv-email">Email</label>
          <input id="inv-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="inv-role">Role</label>
          <select id="inv-role" className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
