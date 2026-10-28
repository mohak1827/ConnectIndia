import { apiClient } from './client';

export const consentApi = {
  list: () => apiClient('/consents'),
  create: (consentData) => apiClient('/consents', { method: 'POST', body: consentData }),
  updateStatus: (id, status) => apiClient(`/consents/${id}`, { method: 'PATCH', body: { status } }),
  evaluatePolicy: (payload) => apiClient('/policy/evaluate', { method: 'POST', body: payload }),
};
