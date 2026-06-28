import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { CreditCard } from 'lucide-react';
import { formatDateTime } from '../utils/format';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

export default function AdminInvoices() {
  const toast = useToast();
  const [invoices, setInvoices] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listInvoices({ search: search || undefined });
      setInvoices(data.data || []);
    } catch {
      toast.error('Could not load invoices.');
      setInvoices([]);
    }
  }, [search, toast]);

  const handleApprove = async (id) => {
    if (!confirm('Approve this invoice and activate subscription?')) return;
    try {
      await adminApi.approveInvoice(id);
      toast.success('Invoice approved!');
      load();
    } catch {
      toast.error('Failed to approve invoice.');
    }
  };

  const handleDeny = async (id) => {
    if (!confirm('Deny this invoice and cancel subscription?')) return;
    try {
      await adminApi.denyInvoice(id);
      toast.success('Invoice denied.');
      load();
    } catch {
      toast.error('Failed to deny invoice.');
    }
  };

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">Invoices & Payments</div>
      </div>
      
      <div className="panel">
        <div className="panel-head">
          <div className="search-box" style={{ maxWidth: 240 }}>
            <input placeholder="Search invoices or orgs..." value={search} onChange={(e) => setSearch(e.target.value)} onBlur={load} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
        </div>
        
        {invoices === null ? (
          <div className="panel-body"><Skeleton height={200} /></div>
        ) : invoices.length === 0 ? (
          <div className="panel-body"><EmptyState icon={CreditCard} title="No invoices found" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Organization</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 500 }}>{inv.organization?.name}</td>
                  <td>{inv.amount} {inv.currency?.toUpperCase()}</td>
                  <td>
                    <span className={`tag state-${inv.status === 'paid' ? 'resolved' : inv.status === 'void' ? 'critical' : 'investigating'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--white-40)' }}>{formatDateTime(inv.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {inv.receipt_path && (
                        <button className="btn btn-ghost btn-sm" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${inv.receipt_path}`, '_blank')} title="View Receipt">
                          <Eye size={16} />
                        </button>
                      )}
                      {inv.status === 'open' && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleApprove(inv.id)} title="Approve Payment" style={{ color: 'var(--green-400)' }}>
                            <CheckCircle size={16} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeny(inv.id)} title="Deny Payment" style={{ color: 'var(--red-400)' }}>
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
