import { apiClient } from './client';

export const teamApi = {
  members: () => apiClient.get('/v1/team/members'),
  invite: (payload) => apiClient.post('/v1/team/invite', payload),
  updateRole: (userId, role) => apiClient.patch(`/v1/team/members/${userId}/role`, { role }),
  remove: (userId) => apiClient.delete(`/v1/team/members/${userId}`),
  teams: () => apiClient.get('/v1/teams'),
  createTeam: (payload) => apiClient.post('/v1/teams', payload),
};
