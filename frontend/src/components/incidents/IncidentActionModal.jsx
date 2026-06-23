import { useState } from 'react';
import { X } from 'lucide-react';
import { incidentsApi } from '../../api/incidents';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function IncidentActionModal({ incident, actionType, onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState('');

  const isResolve = actionType === 'resolve';
  const title = isResolve ? 'Resolve Incident' : 'Acknowledge Incident';
  const label = isResolve ? 'Resolution Details' : 'Details of what happened (Root Cause)';
  const placeholder = isResolve ? 'How was this resolved? (e.g., Restarted the web server)' : 'What caused this? (e.g., Database connection pool exhausted)';

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isResolve) {
        await incidentsApi.resolve(incident.id, { resolution_notes: details });
        toast.success('Incident resolved successfully.');
      } else {
        await incidentsApi.acknowledge(incident.id, { root_cause: details });
        toast.success('Incident acknowledged.');
      }
      onSuccess();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--white-70)', marginBottom: 4 }}>
              Incident: <strong>{incident.title}</strong>
            </div>
            
            <div className="form-group">
              <label className="form-label">{label}</label>
              <textarea
                className="form-input"
                style={{ minHeight: 100 }}
                placeholder={placeholder}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                autoFocus
                required={isResolve} // Typically require notes for resolution
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : title}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
