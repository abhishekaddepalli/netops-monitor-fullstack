import { apiClient } from './client';

export const adminApi = {
  // Dashboard & Health
  getDashboardSummary: () => apiClient.get('/v1/admin/dashboard'),
  getServerHealth: () => apiClient.get('/v1/admin/server-health'),

  // Organizations
  listOrganizations: (params) => apiClient.get('/v1/admin/organizations', { params }),
  createOrganization: (payload) => apiClient.post('/v1/admin/organizations', payload),
  updateOrganization: (id, payload) => apiClient.patch(`/v1/admin/organizations/${id}`, payload),
  suspendOrganization: (id, payload) => apiClient.post(`/v1/admin/organizations/${id}/suspend`, payload),
  unsuspendOrganization: (id) => apiClient.post(`/v1/admin/organizations/${id}/unsuspend`),
  expireOrganization: (id) => apiClient.post(`/v1/admin/organizations/${id}/expire`),
  unexpireOrganization: (id) => apiClient.post(`/v1/admin/organizations/${id}/unexpire`),
  deleteOrganization: (id) => apiClient.delete(`/v1/admin/organizations/${id}`),
  exportOrganizations: () => apiClient.get('/v1/admin/organizations/export', { responseType: 'blob' }),
  importTemplateOrganizations: () => apiClient.get('/v1/admin/organizations/import-template', { responseType: 'blob' }),
  importOrganizations: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post('/v1/admin/organizations/import', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
  },

  // Plans
  listPlans: () => apiClient.get('/v1/admin/plans'),
  createPlan: (data) => apiClient.post('/v1/admin/plans', data),
  updatePlan: (id, data) => apiClient.patch(`/v1/admin/plans/${id}`, data),
  deletePlan: (id) => apiClient.delete(`/v1/admin/plans/${id}`),

  // Billing Plans
  billingPlans: {
    list: () => apiClient.get('/v1/admin/billing-plans'),
    create: (data) => apiClient.post('/v1/admin/billing-plans', data),
    update: (id, data) => apiClient.patch(`/v1/admin/billing-plans/${id}`, data),
    delete: (id) => apiClient.delete(`/v1/admin/billing-plans/${id}`),
  },

  // Monitoring Nodes
  listNodes: () => apiClient.get('/v1/admin/monitoring-nodes'),
  createNode: (data) => apiClient.post('/v1/admin/monitoring-nodes', data),
  updateNode: (id, data) => apiClient.patch(`/v1/admin/monitoring-nodes/${id}`, data),

  // Settings & Integrations
  getSettings: () => apiClient.get('/v1/admin/settings'),
  updateSettings: (data) => apiClient.patch('/v1/admin/settings', data),
  testIntegration: (provider, config) => apiClient.post(`/v1/admin/integrations/test/${provider}`, { config }),

  // Radius Integration Settings & Management
  getRadiusSettings: () => apiClient.get('/v1/admin/radius/settings'),
  updateRadiusSettings: (data) => apiClient.post('/v1/admin/radius/settings', data),

  // Notification Templates
  listNotificationTemplates: () => apiClient.get('/v1/admin/notification-templates'),
  updateNotificationTemplate: (id, data) => apiClient.patch(`/v1/admin/notification-templates/${id}`, data),
  upsertNotificationTemplate: (data) => apiClient.post('/v1/admin/notification-templates/upsert', data),
  resetNotificationTemplateDefault: (channel_type, event_type) => apiClient.post('/v1/admin/notification-templates/reset-default', { channel_type, event_type }),

  // Invoices & Logs
  listInvoices: (params) => apiClient.get('/v1/admin/invoices', { params }),
  approveInvoice: (id) => apiClient.post(`/v1/admin/invoices/${id}/approve`),
  denyInvoice: (id) => apiClient.post(`/v1/admin/invoices/${id}/deny`),
  sendInvoiceEmail: (id, email) => apiClient.post(`/v1/admin/invoices/${id}/send-email`, { email }),
  listAuditLogs: (params) => apiClient.get('/v1/admin/logs', { params }),
  deleteAuditLogs: (params) => apiClient.delete('/v1/admin/logs', { params }),
  exportAuditLogs: async (params) => {
    const response = await apiClient.get('/v1/admin/logs/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'audit_logs.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  },
};
