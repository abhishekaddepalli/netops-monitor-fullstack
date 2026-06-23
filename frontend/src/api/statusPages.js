import { apiClient } from './client';

export const statusPagesApi = {
  list: () => apiClient.get('/v1/status-pages'),
  create: (payload) => apiClient.post('/v1/status-pages', payload),
  update: (id, payload) => apiClient.patch(`/v1/status-pages/${id}`, payload),
  remove: (id) => apiClient.delete(`/v1/status-pages/${id}`),
  // Public endpoint — no auth required, used by the public status page route.
  publicShow: (slug, config) => apiClient.get(`/status-pages/public/${slug}`, config),
};
