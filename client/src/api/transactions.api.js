import { apiClient } from './client';

export const transactionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/transactions?${query}`);
  },
  getSummary: () => apiClient('/transactions/summary'),
  exportCsv: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const result = await apiClient(`/transactions/export?${query}`);
    return result.blob;
  },
};
