import { apiClient as api } from './client';

export const getMaps = () => api.get('/network-maps').then(res => res.data);
export const getMap = (id) => api.get(`/network-maps/${id}`).then(res => res.data);
export const createMap = (data) => api.post('/network-maps', data).then(res => res.data);
export const updateMap = (id, data) => api.put(`/network-maps/${id}`, data).then(res => res.data);
export const deleteMap = (id) => api.delete(`/network-maps/${id}`).then(res => res.data);
