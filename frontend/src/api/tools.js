import { apiClient } from './client';

export const toolsApi = {
  ping: (data) => apiClient.post('/v1/tools/ping', data),
  dns: (data) => apiClient.post('/v1/tools/dns', data),
  port: (data) => apiClient.post('/v1/tools/port', data),
  ssl: (data) => apiClient.post('/v1/tools/ssl', data),
  whois: (data) => apiClient.post('/v1/tools/whois', data),
  traceroute: (data) => apiClient.post('/v1/tools/traceroute', data),
  ipinfo: (data) => apiClient.post('/v1/tools/ipinfo', data),
  headers: (data) => apiClient.post('/v1/tools/headers', data),
  blacklist: (data) => apiClient.post('/v1/tools/blacklist', data),
  ipreputation: (data) => apiClient.post('/v1/tools/ipreputation', data),
  networkDiscovery: (data) => apiClient.post('/v1/tools/network-discovery', data),
  snmpTest: (data) => apiClient.post('/v1/tools/snmp/test', data),
  getDiscoveryJobs: () => apiClient.get('/v1/discovery-jobs'),
  createDiscoveryJob: (data) => apiClient.post('/v1/discovery-jobs', data),
  deleteDiscoveryJob: (id) => apiClient.delete(`/v1/discovery-jobs/${id}`),
  toggleDiscoveryJob: (id) => apiClient.post(`/v1/discovery-jobs/${id}/toggle`),
};
