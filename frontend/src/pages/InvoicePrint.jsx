import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { formatDateTime } from '../utils/format';

export default function InvoicePrint() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Add custom CSS for printing
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: auto; margin: 0mm; }
      body { background: white !important; color: black !important; font-family: 'Inter', sans-serif; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Using a custom endpoint or the new show method
    apiClient.get(`/v1/admin/invoices/${id}`)
      .then((res) => {
        setData(res.data);
        setTimeout(() => {
          window.print();
        }, 500);
      })
      .catch((err) => setError('Could not load invoice'));
  }, [id]);

  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  if (!data) return <div style={{ padding: 40 }}>Loading invoice...</div>;

  const { invoice, company } = data;
  const prefix = company.invoice_prefix || 'INV-';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', background: '#fff', color: '#333' }}>
      <div className="no-print" style={{ marginBottom: 20 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#2E4FA3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Print / Save PDF
        </button>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, color: '#2E4FA3' }}>{company.company_name || 'Your Company Name'}</h1>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 14, color: '#666' }}>
            {company.company_address || 'Company Address'}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 'bold' }}>
            GST/Tax ID: {company.company_gst || 'N/A'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: 24, color: '#333' }}>INVOICE</h2>
          <div style={{ fontSize: 14, marginTop: 4 }}><strong># {prefix}{invoice.invoice_number.replace('INV-', '')}</strong></div>
          <div style={{ fontSize: 14, marginTop: 4 }}>Date: {formatDateTime(invoice.created_at)}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>Status: <span style={{ color: invoice.status === 'paid' ? 'green' : 'red', textTransform: 'uppercase' }}>{invoice.status}</span></div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#666' }}>Bill To:</h3>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>{invoice.organization?.name}</div>
        <div style={{ fontSize: 14, color: '#555', marginTop: 4, whiteSpace: 'pre-wrap' }}>
          {invoice.organization?.address || 'No address provided'}
        </div>
        {invoice.organization?.billing_email && (
          <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>Email: {invoice.organization.billing_email}</div>
        )}
        {invoice.organization?.phone && (
          <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>Phone: {invoice.organization.phone}</div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '12px 8px', textAlign: 'left', color: '#333' }}>Description</th>
            <th style={{ padding: '12px 8px', textAlign: 'right', color: '#333' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '16px 8px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: 'bold' }}>Subscription Plan: {invoice.subscription?.plan?.name || 'Unknown Plan'}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                Period: {formatDateTime(invoice.subscription?.current_period_starts_at)} - {formatDateTime(invoice.subscription?.current_period_ends_at)}
              </div>
            </td>
            <td style={{ padding: '16px 8px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
              {invoice.amount} {invoice.currency?.toUpperCase()}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 18, fontWeight: 'bold', borderTop: '2px solid #333' }}>
            <span>Total</span>
            <span>{invoice.amount} {invoice.currency?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 60, textAlign: 'center', fontSize: 12, color: '#999', borderTop: '1px solid #eee', paddingTop: 20 }}>
        Thank you for your business. If you have any questions about this invoice, please contact us.
      </div>
    </div>
  );
}
