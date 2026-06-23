import { apiClient } from './client';

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  logout: () => apiClient.post('/v1/auth/logout'),
  me: () => apiClient.get('/v1/auth/me'),
  updateProfile: (data) => apiClient.patch('/v1/auth/profile', data),
};
