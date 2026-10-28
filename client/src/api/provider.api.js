import { apiClient } from './client';

export const providerApi = {
  getOverview: () => apiClient('/provider/overview'),
  getProfile: () => apiClient('/provider/profile'),
  updateProfile: (data) => apiClient('/provider/profile', { method: 'PUT', body: data }),
  getServices: () => apiClient('/provider/services'),
  getRecords: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/provider/registry?${qs}`);
  },
  createRecord: (data) =>
    apiClient('/provider/registry', {
      method: 'POST',
      body: data,
    }),
  getRecord: (id, category) =>
    apiClient(`/provider/registry/${id}${category ? `?category=${category}` : ''}`),
  updateRecord: (id, data) =>
    apiClient(`/provider/registry/${id}`, {
      method: 'PUT',
      body: data,
    }),
  deleteRecord: (id, category) =>
    apiClient(`/provider/registry/${id}${category ? `?category=${category}` : ''}`, {
      method: 'DELETE',
    }),
  importCsv: (data) =>
    apiClient('/provider/registry/import', {
      method: 'POST',
      body: data,
    }),
  exportCsv: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/provider/registry/export?${qs}`);
  },
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/provider/transactions?${qs}`);
  },
  getHistory: () => apiClient('/provider/history'),
  getHealth: () => apiClient('/provider/health'),
};

