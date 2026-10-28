import { apiClient } from './client';

export const educationApi = {
  verify: (data) => apiClient('/education/verify', { method: 'POST', body: data }),
  getByRequestId: (requestId) => apiClient(`/education/${requestId}`),
};
