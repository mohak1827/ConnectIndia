import { apiClient } from './client';

export const authApi = {
  login: (credentials) => apiClient('/auth/login', { method: 'POST', body: credentials }),
  logout: () => apiClient('/auth/logout', { method: 'POST' }),
  getMe: () => apiClient('/auth/me'),
  updateProfile: (data) => apiClient('/auth/profile', { method: 'PUT', body: data }),
  changePassword: (data) => apiClient('/auth/change-password', { method: 'PUT', body: data }),
};
