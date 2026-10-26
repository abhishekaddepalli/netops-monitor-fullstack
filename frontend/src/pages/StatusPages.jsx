import { useEffect, useState, useCallback } from 'react';
import { Plus, Globe2, ExternalLink, Trash2 } from 'lucide-react';
import { statusPagesApi } from '../api/statusPages';
import { monitorsApi } from '../api/monitors';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function StatusPages() {
  const toast = useToast();
  const { isOrgAdmin } = useAuth();
  const [pages, setPages] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await statusPagesApi.list();
      setPages(data || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load status pages.'));
      setPages([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(page) {
    if (!window.confirm(`Delete status page "${page.name}"?`)) return;
    try {
      await statusPagesApi.remove(page.id);
      toast.success('Status page deleted.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Status Pages</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>Public-facing uptime pages for your customers</div>
        </div>
        {isOrgAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} />New Status Page
          </button>
        )}
      </div>

      <div className="panel">
        {pages === null ? (
          <div className="panel-body"><Skeleton height={200} /></div>
        ) : pages.length === 0 ? (
          <div className="panel-body">
            <EmptyState
              icon={Globe2}
              title="No status pages yet"
              subtitle="Create a public status page to keep your customers informed."
              action={isOrgAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create status page</button>}
            />
          </div>
        ) : (
          <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Name</th><th>URL</th><th>Components</th><th>Published</th><th></th></tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td className="mon-name">{p.name}</td>
                  <td>
                    <a className="mon-url" href={`/status/${p.slug}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      /status/{p.slug} <ExternalLink size={11} />
                    </a>
                  </td>
                  <td>{p.components_count ?? 0}</td>
                  <td><span className={`pill ${p.is_published ? 'pill-up' : 'pill-paused'}`}>{p.is_published ? 'Published' : 'Draft'}</span></td>
                  <td>
                    {isOrgAdmin && (
                      <button className="icon-btn-sm" onClick={() => handleDelete(p)} title="Delete"><Trash2 /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateStatusPageModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </>
  );
}

function CreateStatusPageModal({ onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [monitors, setMonitors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await monitorsApi.list({ per_page: 100 });
        setMonitors(data.data || []);
      } catch {
        setMonitors([]);
      }
    })();
  }, []);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await statusPagesApi.create({ name, component_monitor_ids: selected });
      toast.success('Status page created.');
      onCreated();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not create status page.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Status Page" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="sp-name">Name</label>
          <input id="sp-name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Status" required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Components (select monitors to show)</label>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--navy-border)', borderRadius: 9 }}>
            {monitors.map((m) => (
              <label key={m.id} className="checkbox-row" style={{ padding: '9px 13px', borderBottom: '1px solid var(--navy-border)' }}>
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                {m.name}
              </label>
            ))}
            {monitors.length === 0 && <div style={{ padding: 13, fontSize: 12.5, color: 'var(--white-40)' }}>No monitors available yet.</div>}
          </div>
        </div>
      </form>
    </Modal>
  );
}
