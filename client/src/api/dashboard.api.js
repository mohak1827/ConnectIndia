import { apiClient } from './client';

export const dashboardApi = {
  getSummary: () => apiClient('/dashboard/summary'),
  getActivity: (limit = 10) => apiClient(`/dashboard/activity?limit=${limit}`),
  getProviderHealth: () => apiClient('/dashboard/providers/health'),
  getPublicStats: () => apiClient('/public/stats'),
};
