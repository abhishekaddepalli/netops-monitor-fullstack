import { apiClient } from './client';

export const alertChannelsApi = {
  list: () => apiClient.get('/v1/alert-channels'),
  create: (payload) => apiClient.post('/v1/alert-channels', payload),
  update: (id, payload) => apiClient.patch(`/v1/alert-channels/${id}`, payload),
  remove: (id) => apiClient.delete(`/v1/alert-channels/${id}`),
  test: (id) => apiClient.post(`/v1/alert-channels/${id}/test`),
  getTelegramBotInfo: () => apiClient.get('/v1/alert-channels/bot-info/telegram'),
  detectTelegramChat: () => apiClient.post('/v1/alert-channels/detect-telegram-chat'),
};
