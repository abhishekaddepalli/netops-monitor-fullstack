import { apiClient } from './client';

export const monitorsApi = {
  list: (params) => apiClient.get('/v1/monitors', { params }),
  get: (id) => apiClient.get(`/v1/monitors/${id}`),
  create: (payload) => apiClient.post('/v1/monitors', payload),
  update: (id, payload) => apiClient.patch(`/v1/monitors/${id}`, payload),
  remove: (id) => apiClient.delete(`/v1/monitors/${id}`),
  pause: (id) => apiClient.post(`/v1/monitors/${id}/pause`),
  resume: (id) => apiClient.post(`/v1/monitors/${id}/resume`),
  test: (id) => apiClient.post(`/v1/monitors/${id}/test`),
  checks: (id, params) => apiClient.get(`/v1/monitors/${id}/checks`, { params }),
  chartData: (id, range) => apiClient.get(`/v1/monitors/${id}/chart`, { params: { range } }),
  export: () => apiClient.get('/v1/monitors/export', { responseType: 'blob' }),
  importTemplate: () => apiClient.get('/v1/monitors/import-template', { responseType: 'blob' }),
  import: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post('/v1/monitors/import', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
  },
};
