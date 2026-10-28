import { apiClient } from './client';

export const orgApi = {
  getOverview: () => apiClient('/org/overview'),
  getServices: () => apiClient('/org/services'),
  getGrants: () => apiClient('/org/grants'),
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/org/history?${query}`);
  },
  getProfile: () => apiClient('/org/profile'),
  updateProfile: (data) => apiClient('/org/profile', { method: 'PUT', body: data }),
};
