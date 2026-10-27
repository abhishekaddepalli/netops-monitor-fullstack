import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { CreditCard, Eye, CheckCircle, XCircle, Printer, FileText, Download, ExternalLink, Calendar, Building, Hash, Mail } from 'lucide-react';
import { formatDateTime } from '../utils/format';

export default function AdminInvoices() {
  const toast = useToast();
  const [invoices, setInvoices] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [emailingId, setEmailingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.listInvoices({ 
        search: search || undefined,
        status: statusFilter || undefined
      });
      setInvoices(data.data || []);
    } catch {
      toast.error('Could not load invoices.');
      setInvoices([]);
    }
  }, [search, statusFilter, toast]);

  const handleApprove = async (id) => {
    if (!confirm('Approve this invoice and activate the subscription plan for this organization?')) return;
    setProcessingId(id);
    try {
      await adminApi.approveInvoice(id);
      toast.success('Invoice approved and subscription activated! Email sent.');
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
      load();
    } catch {
      toast.error('Failed to approve invoice.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (id) => {
    if (!confirm('Deny this invoice and cancel the pending subscription?')) return;
    setProcessingId(id);
    try {
      await adminApi.denyInvoice(id);
      toast.success('Invoice denied and subscription cancelled.');
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
      load();
    } catch {
      toast.error('Failed to deny invoice.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendEmail = async (id, customEmail = null) => {
    setEmailingId(id);
    try {
      toast.info('Sending invoice email...');
      const res = await adminApi.sendInvoiceEmail(id, customEmail);
      toast.success(res.data?.message || 'Invoice email dispatched successfully!');
    } catch (error) {
      toast.error('Failed to send invoice email.');
    } finally {
      setEmailingId(null);
    }
  };

  useEffect(() => { load(); }, [load]);

  const getStorageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || '';
    return `${base}/storage/${path}`;
  };

  return (
    <>
      <div className="detail-header">
        <div>
          <div className="detail-title">Invoices & Payment Receipts</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Review customer payments, verify manual UPI transfers, send invoice emails, and manage organization billing
          </div>
        </div>
      </div>
      
      <div className="panel">
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ maxWidth: 260 }}>
              <input 
                placeholder="Search invoices or orgs..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onBlur={load} 
                onKeyDown={(e) => e.key === 'Enter' && load()} 
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: '', label: 'All' },
                { key: 'open', label: 'Pending Approval' },
                { key: 'paid', label: 'Paid' },
                { key: 'void', label: 'Void / Denied' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`btn btn-sm ${statusFilter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {invoices === null ? (
          <div className="panel-body"><Skeleton height={200} /></div>
        ) : invoices.length === 0 ? (
          <div className="panel-body">
            <EmptyState 
              icon={CreditCard} 
              title="No invoices found" 
              description={statusFilter ? `No ${statusFilter} invoices found.` : "When organizations subscribe or upgrade, invoices will appear here."} 
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Organization</th>
                  <th>Amount</th>
                  <th>Method / Ref</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  const isOpen = inv.status === 'open';
                  const isVoid = inv.status === 'void';
                  const storageUrl = getStorageUrl(inv.receipt_path);

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-400)' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => setSelectedInvoice(inv)}>
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {inv.organization?.name || `Org #${inv.organization_id}`}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                        ₹{inv.amount}
                      </td>
                      <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--white-70)' }}>
                        {inv.provider_invoice_id || inv.subscription?.billing_provider || '—'}
                      </td>
                      <td>
                        <span className={`pill ${isPaid ? 'pill-up' : isOpen ? 'pill-paused' : 'pill-down'}`}>
                          {isPaid ? 'Paid' : isOpen ? 'Pending Approval' : isVoid ? 'Voided' : inv.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--white-50)', fontSize: 13 }}>
                        {formatDateTime(inv.created_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => setSelectedInvoice(inv)} 
                            title="View Invoice & Details"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={14} /> Details
                          </button>

                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => handleSendEmail(inv.id)} 
                            disabled={emailingId === inv.id}
                            title="Email Invoice to Organization"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary-400)' }}
                          >
                            <Mail size={14} /> {emailingId === inv.id ? '…' : 'Email'}
                          </button>

                          {storageUrl && (
                            <a 
                              href={storageUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-ghost btn-sm" 
                              title="View Payment Screenshot"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}
                            >
                              <ExternalLink size={14} /> Receipt
                            </a>
                          )}

                          {isOpen && (
                            <>
                              <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => handleApprove(inv.id)} 
                                disabled={processingId === inv.id}
                                title="Approve Payment" 
                                style={{ background: '#16a34a', borderColor: '#22c55e', color: '#fff' }}
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button 
                                className="btn btn-ghost btn-sm" 
                                onClick={() => handleDeny(inv.id)} 
                                disabled={processingId === inv.id}
                                title="Deny Payment" 
                                style={{ color: '#f87171' }}
                              >
                                <XCircle size={14} /> Deny
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail & Receipt Modal */}
      {selectedInvoice && (
        <Modal 
          title={`Invoice ${selectedInvoice.invoice_number}`} 
          onClose={() => setSelectedInvoice(null)} 
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={15} /> Print / PDF
                </button>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => handleSendEmail(selectedInvoice.id)}
                  disabled={emailingId === selectedInvoice.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary-400)' }}
                >
                  <Mail size={15} /> {emailingId === selectedInvoice.id ? 'Sending…' : 'Email Invoice'}
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: 10 }}>
                {selectedInvoice.status === 'open' && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-ghost" 
                      onClick={() => handleDeny(selectedInvoice.id)}
                      disabled={processingId === selectedInvoice.id}
                      style={{ color: '#f87171' }}
                    >
                      <XCircle size={15} /> Deny
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => handleApprove(selectedInvoice.id)}
                      disabled={processingId === selectedInvoice.id}
                      style={{ background: '#16a34a', borderColor: '#22c55e' }}
                    >
                      <CheckCircle size={15} /> Approve Payment
                    </button>
                  </>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedInvoice(null)}>
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Invoice Meta Card */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--navy-600)', 
              borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>INVOICE FOR</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                    {selectedInvoice.organization?.name || 'Customer Organization'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>TOTAL AMOUNT</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-400)', marginTop: 2 }}>
                    ₹{selectedInvoice.amount} <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedInvoice.currency || 'INR'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid var(--navy-700)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>STATUS</div>
                  <div style={{ marginTop: 3 }}>
                    <span className={`pill ${selectedInvoice.status === 'paid' ? 'pill-up' : selectedInvoice.status === 'open' ? 'pill-paused' : 'pill-down'}`}>
                      {selectedInvoice.status === 'paid' ? 'Paid' : selectedInvoice.status === 'open' ? 'Pending Approval' : selectedInvoice.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ISSUE DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginTop: 3 }}>
                    {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>PAYMENT / UTR REF</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: 3 }}>
                    {selectedInvoice.provider_invoice_id || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Preview Section */}
            {selectedInvoice.receipt_path ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>
                    Uploaded Payment Receipt / Screenshot
                  </div>
                  <a 
                    href={getStorageUrl(selectedInvoice.receipt_path)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--primary-400)' }}
                  >
                    <Download size={14} /> Open Full Size
                  </a>
                </div>
                <div style={{ 
                  borderRadius: 12, overflow: 'hidden', border: '1px solid var(--navy-600)', 
                  background: '#000', maxHeight: 360, display: 'flex', justifyContent: 'center', alignItems: 'center' 
                }}>
                  <img 
                    src={getStorageUrl(selectedInvoice.receipt_path)} 
                    alt="Receipt Screenshot" 
                    style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: 18, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 12, border: '1px dashed var(--navy-600)', textAlign: 'center', color: 'var(--white-50)', fontSize: 13 }}>
                No manual receipt uploaded. Payment processed automatically via payment gateway.
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
