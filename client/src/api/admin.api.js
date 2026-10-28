import { apiClient } from './client';

export const adminApi = {
  listOrganizations: () => apiClient('/admin/organizations'),
  createOrganization: (data) => apiClient('/admin/organizations', { method: 'POST', body: data }),
  updateOrganization: (id, data) => apiClient(`/admin/organizations/${id}`, { method: 'PATCH', body: data }),
  listProviders: () => apiClient('/admin/providers'),
  createProvider: (data) => apiClient('/admin/providers', { method: 'POST', body: data }),
  listProviderRequests: (status) => apiClient(`/admin/provider-requests${status ? `?status=${status}` : ''}`),
  reviewProviderRequest: (id, data) => apiClient(`/admin/provider-requests/${id}/review`, { method: 'PATCH', body: data }),
  resetProviderPassword: (id, data = {}) => apiClient(`/admin/provider-requests/${id}/reset-password`, { method: 'POST', body: data }),
  listGrants: () => apiClient('/admin/grants'),
  createGrant: (data) => apiClient('/admin/grants', { method: 'POST', body: data }),
  updateGrant: (id, data) => apiClient(`/admin/grants/${id}`, { method: 'PATCH', body: data }),
  deleteGrant: (id) => apiClient(`/admin/grants/${id}`, { method: 'DELETE' }),
  listUsers: () => apiClient('/admin/users'),
  updateUser: (id, data) => apiClient(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  listProviderConfigs: () => apiClient('/admin/provider-configs'),
  updateProviderHealth: (id, data) => apiClient(`/admin/provider-configs/${id}`, { method: 'PATCH', body: data }),
  listAuditEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/admin/audit-events?${query}`);
  },
};
