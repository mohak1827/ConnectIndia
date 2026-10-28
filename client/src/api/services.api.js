import { apiClient } from './client';

export const servicesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/services?${query}`);
  },
  getById: (id) => apiClient(`/services/${id}`),
  sandboxTest: (id, payload) => apiClient(`/services/${id}/sandbox`, { method: 'POST', body: payload }),
  create: (serviceData) => apiClient('/admin/services', { method: 'POST', body: serviceData }),
  update: (id, serviceData) => apiClient(`/admin/services/${id}`, { method: 'PATCH', body: serviceData }),
};
