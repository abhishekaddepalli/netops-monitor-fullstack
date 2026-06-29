import { apiClient as api } from './client';

export const getMaps = () => api.get('/v1/network-maps').then(res => res.data);
export const getMap = (id) => api.get(`/v1/network-maps/${id}`).then(res => res.data);
export const createMap = (data) => api.post('/v1/network-maps', data).then(res => res.data);
export const updateMap = (id, data) => api.put(`/v1/network-maps/${id}`, data).then(res => res.data);
export const deleteMap = (id) => api.delete(`/v1/network-maps/${id}`).then(res => res.data);
