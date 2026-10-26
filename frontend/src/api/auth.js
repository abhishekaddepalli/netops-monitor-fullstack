import { apiClient } from './client';

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  logout: () => apiClient.post('/v1/auth/logout'),
  me: () => apiClient.get('/v1/auth/me'),
  updateProfile: (data) => apiClient.patch('/v1/auth/profile', data),

  // 2FA Endpoints
  setup2Fa: () => apiClient.post('/v1/auth/2fa/setup'),
  enable2Fa: (code) => apiClient.post('/v1/auth/2fa/enable', { code }),
  disable2Fa: (payload) => apiClient.post('/v1/auth/2fa/disable', payload),
  getRecoveryCodes: (regenerate = false) => apiClient.get(`/v1/auth/2fa/recovery-codes${regenerate ? '?regenerate=1' : ''}`),
  verify2Fa: (payload) => apiClient.post('/auth/2fa/verify', payload),

  // Google OAuth
  getGoogleAuthUrl: () => apiClient.get('/auth/google/url'),
};
