import { apiClient } from './client';

export const dashboardApi = {
  summary: () => apiClient.get('/v1/dashboard/summary'),
  responseTimeSeries: (params) => apiClient.get('/v1/dashboard/response-time-series', { params }),
};
