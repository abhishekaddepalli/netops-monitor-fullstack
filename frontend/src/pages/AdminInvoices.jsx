import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { CreditCard } from 'lucide-react';
import { formatDateTime } from '../utils/format';

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
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 500 }}>{inv.organization?.name}</td>
                  <td>{inv.amount} {inv.currency?.toUpperCase()}</td>
                  <td>
                    <span className={`tag state-${inv.status === 'paid' ? 'resolved' : 'investigating'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--white-40)' }}>{formatDateTime(inv.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
