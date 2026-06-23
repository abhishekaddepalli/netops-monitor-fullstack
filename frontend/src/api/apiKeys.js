import { apiClient } from './client';

export const apiKeysApi = {
  list: () => apiClient.get('/v1/api-keys'),
  create: (payload) => apiClient.post('/v1/api-keys', payload),
  remove: (id) => apiClient.delete(`/v1/api-keys/${id}`),
};
