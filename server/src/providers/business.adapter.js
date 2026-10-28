import { BusinessRegistrationSample } from '../models/BusinessRegistrationSample.js';
import { Organization } from '../models/Organization.js';
import { ProviderConfig } from '../models/ProviderConfig.js';

/**
 * Mock Business Registration Provider Adapter
 * Simulates business registration verification against fictional MCA/GST records.
 *
 * ADAPTER BOUNDARY DOCUMENTATION:
 * To replace with a real business registry provider (MCA21, GST Portal, etc.):
 * 1. Obtain authorized API access from the respective ministry/department
 * 2. Implement authentication (API key, digital signature, OAuth)
 * 3. Map registration number or GSTIN to provider query format
 * 4. Map provider response to standard format
 * 5. Handle provider-specific errors (e.g., CIN not found, GSTIN cancelled)
 * 6. Apply rate limiting and respect provider-imposed quotas
 * 7. Store API secrets in environment variables, never in source code
 *
 * DISCLAIMER: All records in this adapter are completely fictional.
 * Do NOT represent these as actual government business registry lookups.
 */
export class MockBusinessProvider {
  getCapabilities() {
    return {
      serviceType: 'business',
      providerName: 'ConnectIndia Mock Business Registry',
      isMock: true,
      disclaimer: 'Fictional business records only. Not a real MCA21 or GST portal verification.',
    };
  }

  async getProviderStatus() {
    return {
      status: 'online',
      latencyAvgMs: 105,
      environment: 'mock',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify a business registration.
   * @param {Object} request - { registrationNumber, businessName, registrationType, state }
   * @param {Object} context - { requestId }
   * @returns {Promise<StandardVerificationResult>}
   */
  async verify(request, context = {}) {
    const startTime = Date.now();

    // Simulate network latency (85–230ms)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 145) + 85));

    const { registrationNumber, businessName, companyName, registrationType, state } = request;
    const cleanReg = registrationNumber?.trim().toUpperCase();
    const queryName = (businessName || companyName || '').trim();

    // Simulate provider outage
    if (cleanReg?.startsWith('OUTAGE') || cleanReg?.startsWith('TIMEOUT')) {
      return {
        status: 'UNAVAILABLE',
        providerName: 'ConnectIndia Mock Business Registry',
        providerIdentifier: 'mock_business_provider',
        latencyMs: Date.now() - startTime,
        errorCode: 'PROVIDER_TIMEOUT',
        explanation: 'Business registry provider is temporarily unavailable. Please retry later.',
        record: null,
        isMock: true,
      };
    }

    // Try matching by registration number, GSTIN, or CIN
    const biz = await BusinessRegistrationSample.findOne({
      $or: [{ registrationNumber: cleanReg }, { gstinNumber: cleanReg }, { cin: cleanReg }],
    }).lean();

    const latencyMs = Date.now() - startTime;

    if (!biz) {
      return {
        status: 'NOT_FOUND',
        providerName: 'ConnectIndia Mock Business Registry',
        providerIdentifier: 'mock_business_provider',
        latencyMs,
        errorCode: 'BUSINESS_NOT_FOUND',
        explanation: 'No business registration record found for the supplied registration number.',
        record: null,
        isMock: true,
      };
    }

    // Determine authoritative registry organization and check live adapter health
    let owningOrg = null;
    let providerName = biz.businessName || biz.companyName || 'ConnectIndia Mock Business Registry';
    let providerIdentifier = 'mock_business_provider';

    if (biz.organizationId) {
      owningOrg = await Organization.findById(biz.organizationId).lean();
      if (owningOrg) {
        providerName = biz.businessName || owningOrg.name;
        providerIdentifier = owningOrg.memberCode || providerIdentifier;
      }

      const orgConfig = await ProviderConfig.findOne({
        organizationId: biz.organizationId,
        healthState: { $in: ['Unavailable', 'Offline'] },
      }).lean();

      if (orgConfig || owningOrg?.status === 'suspended' || owningOrg?.status === 'inactive') {
        return {
          status: 'UNAVAILABLE',
          providerName,
          providerIdentifier,
          latencyMs,
          errorCode: 'PROVIDER_OFFLINE',
          explanation: `Authoritative provider '${providerName}' is currently Unavailable (Offline). Verification cannot be completed until the provider is restored Online.`,
          record: null,
          isMock: true,
        };
      }
    }

    // Check business name if provided (partial, case-insensitive)
    if (queryName && !biz.businessName.toLowerCase().includes(queryName.toLowerCase())) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'BUSINESS_NAME_MISMATCH',
        explanation: 'Business record found but the name does not match the submitted value.',
        record: null,
        isMock: true,
      };
    }

    // Check registration type if provided
    if (registrationType && biz.registrationType !== registrationType) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'REGISTRATION_TYPE_MISMATCH',
        explanation: 'Business record found but the registration type does not match.',
        record: null,
        isMock: true,
      };
    }

    // Check state if provided
    if (state && biz.state.toLowerCase() !== state.trim().toLowerCase()) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'STATE_MISMATCH',
        explanation: 'Business record found but the state of registration does not match.',
        record: null,
        isMock: true,
      };
    }

    // Handle inactive status
    if (['INACTIVE', 'STRUCK_OFF', 'DISSOLVED', 'AMALGAMATED'].includes(biz.status)) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: `BUSINESS_${biz.status}`,
        explanation: `Business registration record found but has status: ${biz.status}.`,
        record: {
          registrationNumber: biz.registrationNumber,
          businessName: biz.businessName,
          registrationType: biz.registrationType,
          status: biz.status,
        },
        isMock: true,
      };
    }

    // VERIFIED
    return {
      status: 'VERIFIED',
      providerName,
      providerIdentifier,
      latencyMs,
      errorCode: null,
      explanation: `Business registration successfully verified against authoritative registry (${providerName}).`,
      record: {
        registrationNumber: biz.registrationNumber,
        gstinNumber: biz.gstinNumber || null,
        businessName: biz.businessName,
        legalName: biz.legalName,
        registrationType: biz.registrationType,
        registrationDate: biz.registrationDate,
        status: biz.status,
        state: biz.state,
        natureOfBusiness: biz.natureOfBusiness,
        directorNames: biz.directorNames,
        cin: biz.cin || null,
      },
      isMock: true,
    };
  }
}

export const mockBusinessProvider = new MockBusinessProvider();
