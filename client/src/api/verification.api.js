import { apiClient } from './client';

export const verificationApi = {
  /**
   * Unified verification call across all sectors
   * @param {string} serviceType - 'education' | 'insurance' | 'identity' | 'employment' | 'business'
   * @param {object} payload - sector-specific payload
   */
  verify: (serviceType, payload) =>
    apiClient(`/verify/${serviceType}`, {
      method: 'POST',
      body: payload,
    }),
};
