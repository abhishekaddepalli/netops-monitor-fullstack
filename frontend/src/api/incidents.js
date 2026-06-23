import { apiClient } from './client';

export const incidentsApi = {
  list: (params) => apiClient.get('/v1/incidents', { params }),
  get: (id) => apiClient.get(`/v1/incidents/${id}`),
  acknowledge: (id) => apiClient.post(`/v1/incidents/${id}/acknowledge`),
  resolve: (id, payload) => apiClient.post(`/v1/incidents/${id}/resolve`, payload),
  addUpdate: (id, payload) => apiClient.post(`/v1/incidents/${id}/updates`, payload),
};
