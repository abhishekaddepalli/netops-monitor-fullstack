import { apiClient } from './client';

export const organizationsApi = {
  update: (data) => apiClient.patch('/v1/organization', data),
};
