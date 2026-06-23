import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { Server, Plus, Pencil, Terminal } from 'lucide-react';
import { timeAgo } from '../utils/format';

export default function AdminNodes() {
  const toast = useToast();
  const [nodes, setNodes] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [showInstructions, setShowInstructions] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listNodes();
      setNodes(data || []);
    } catch {
      toast.error('Could not load nodes.');
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Monitoring Nodes</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>{nodes ? `${nodes.length} edge nodes` : '...'}</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-ghost" onClick={() => setShowInstructions(nodes?.[0] || { name: 'Example Node', key: '<YOUR_NODE_KEY>' })}>
            <Terminal size={16} /> Agent Setup Guide
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Register Node
          </button>
        </div>
      </div>

      <div className="panel">
        {nodes === null ? (
          <div className="panel-body"><Skeleton height={240} /></div>
        ) : nodes.length === 0 ? (
          <div className="panel-body"><EmptyState icon={Server} title="No nodes" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Node Name / Key</th>
                <th>Region</th>
                <th>Provider</th>
                <th>Monitors</th>
                <th>Last Heartbeat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div className="mon-name">{n.name}</div>
                    <div className="mon-meta">{n.key}</div>
                  </td>
                  <td>{n.region_code}</td>
                  <td>{n.provider || 'N/A'}</td>
                  <td className="mon-metric">{n.monitors_count ?? 0}</td>
                  <td>{n.last_heartbeat_at ? timeAgo(n.last_heartbeat_at) : 'Never'}</td>
                  <td>
                    <button className="icon-btn" onClick={() => setShowInstructions(n)} title="Setup Instructions" style={{ marginRight: 8 }}><Terminal size={15} color="var(--primary-400)" /></button>
                    <button className="icon-btn" onClick={() => setEditNode(n)} title="Edit"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <NodeModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />
      )}

      {editNode && (
        <NodeModal node={editNode} onClose={() => setEditNode(null)} onSaved={() => { setEditNode(null); load(); }} />
      )}

      {showInstructions && (
        <InstructionsModal node={showInstructions} onClose={() => setShowInstructions(null)} />
      )}
    </>
  );
}

function NodeModal({ node, onClose, onSaved }) {
  const toast = useToast();
  const isEditing = !!node;
  const [formData, setFormData] = useState({
    key: node?.key || '', name: node?.name || '', region_code: node?.region_code || '', provider: node?.provider || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await adminApi.updateNode(node.id, { name: formData.name, region_code: formData.region_code, provider: formData.provider });
        toast.success('Node updated.');
      } else {
        await adminApi.createNode(formData);
        toast.success('Node created.');
      }
      onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEditing ? 'Edit Node' : 'Register Node'} onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        {!isEditing && (
          <div className="form-group">
            <label className="form-label">Node Key (unique)</label>
            <input className="form-input" name="key" value={formData.key} onChange={handleChange} required placeholder="e.g. us-east-1-node" />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. AWS US East" />
        </div>
        <div className="form-group">
          <label className="form-label">Region Code</label>
          <input className="form-input" name="region_code" value={formData.region_code} onChange={handleChange} required placeholder="e.g. US" />
        </div>
        <div className="form-group">
          <label className="form-label">Provider</label>
          <input className="form-input" name="provider" value={formData.provider} onChange={handleChange} placeholder="e.g. AWS" />
        </div>
      </form>
    </Modal>
  );
}

function InstructionsModal({ node, onClose }) {
  const baseUrl = window.location.origin.replace(':3000', ':8000'); // point to laravel port locally
  return (
    <Modal title={`Setup Instructions: ${node.name}`} onClose={onClose} footer={
      <button className="btn btn-primary" onClick={onClose}>Close</button>
    }>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--white-60)', fontSize: 14, marginBottom: 12 }}>
          Deploy the NetOps Monitoring Agent on any external server without installing the full application. You only need Node.js installed.
        </p>
        <div style={{ background: 'var(--navy-900)', padding: 16, borderRadius: 6, border: '1px solid var(--border)' }}>
          <pre style={{ margin: 0, color: 'var(--white-90)', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {`# 1. Download the zero-dependency agent script\nwget ${baseUrl}/downloads/netops-agent.js\n\n# 2. Run the agent in the background\nnode netops-agent.js --url=${baseUrl} --key=${node.key}`}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
