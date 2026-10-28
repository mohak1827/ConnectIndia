import { apiClient } from './client';

export const accessRequestApi = {
  // Public
  submit: (formData) =>
    apiClient('/access-requests', {
      method: 'POST',
      body: formData,
    }),

  submitProvider: (formData) =>
    apiClient('/provider-requests', {
      method: 'POST',
      body: formData,
    }),

  checkStatus: (query) => {
    const params = new URLSearchParams(query);
    return apiClient(`/access-requests/status?${params.toString()}`);
  },

  // Admin
  list: (params = {}) => {
    const cleanParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        cleanParams[k] = v;
      }
    }
    const searchParams = new URLSearchParams(cleanParams);
    const qs = searchParams.toString();
    return apiClient(`/access-requests${qs ? `?${qs}` : ''}`);
  },

  review: (id, reviewData) =>
    apiClient(`/access-requests/${id}/review`, {
      method: 'PATCH',
      body: reviewData,
    }),

  activate: (id, activationData) =>
    apiClient(`/access-requests/${id}/activate`, {
      method: 'POST',
      body: activationData,
    }),
};
