import { InsurancePolicySample } from '../models/InsurancePolicySample.js';
import { Organization } from '../models/Organization.js';
import { ProviderConfig } from '../models/ProviderConfig.js';

/**
 * Mock Insurance Provider Adapter
 * Simulates insurance policy verification against fictional sample records.
 * 
 * ADAPTER BOUNDARY DOCUMENTATION:
 * To replace with a real insurance API provider:
 * 1. Implement authenticate() using provider's auth method (OAuth, API key, mTLS)
 * 2. Implement mapRequest() to translate the standard request to provider format
 * 3. Implement mapResponse() to normalize provider response to standard format
 * 4. Set baseUrl from environment variable (never hardcode)
 * 5. Implement provider-specific error codes and retry logic
 * 6. Handle provider-specific consent and authorization requirements
 * 7. Never call real provider without valid credentials and explicit authorization
 */
export class MockInsuranceProvider {
  getCapabilities() {
    return {
      serviceType: 'insurance',
      providerName: 'ConnectIndia Mock Insurance Registry',
      supportedTypes: ['Health', 'Life', 'Motor', 'Property', 'Travel', 'Commercial'],
      isMock: true,
      disclaimer: 'All results are generated from fictional sample data. Not a real insurance verification.',
    };
  }

  async getProviderStatus() {
    return {
      status: 'online',
      latencyAvgMs: 95,
      environment: 'mock',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify an insurance policy against fictional sample records.
   * @param {Object} request - { policyNumber, insurerCode, policyType, policyHolderRef }
   * @param {Object} context - { requestId }
   * @returns {Promise<StandardVerificationResult>}
   */
  async verify(request, context = {}) {
    const startTime = Date.now();

    // Simulate network latency (80–250ms)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 150) + 80));

    const { policyNumber, insurerCode, policyType, policyHolderRef } = request;
    const cleanPolicyNum = policyNumber?.trim().toUpperCase();

    // Simulate provider outage for special test codes
    if (cleanPolicyNum?.startsWith('OUTAGE') || cleanPolicyNum?.startsWith('TIMEOUT')) {
      return {
        status: 'UNAVAILABLE',
        providerName: 'ConnectIndia Mock Insurance Registry',
        providerIdentifier: 'mock_insurance_provider',
        latencyMs: Date.now() - startTime,
        errorCode: 'PROVIDER_TIMEOUT',
        explanation: 'Insurance registry provider is temporarily unavailable. Please retry later.',
        record: null,
        isMock: true,
      };
    }

    // Look up the policy record
    const policy = await InsurancePolicySample.findOne({ policyNumber: cleanPolicyNum }).lean();
    const latencyMs = Date.now() - startTime;

    if (!policy) {
      return {
        status: 'NOT_FOUND',
        providerName: 'ConnectIndia Mock Insurance Registry',
        providerIdentifier: 'mock_insurance_provider',
        latencyMs,
        errorCode: 'POLICY_NOT_FOUND',
        explanation: 'No insurance policy record found for the supplied policy number.',
        record: null,
        isMock: true,
      };
    }

    // Determine authoritative provider identity and check live adapter health
    let owningOrg = null;
    let providerName = policy.insurerName || 'ConnectIndia Mock Insurance Registry';
    let providerIdentifier = 'mock_insurance_provider';

    if (policy.organizationId) {
      owningOrg = await Organization.findById(policy.organizationId).lean();
      if (owningOrg) {
        providerName = policy.insurerName || owningOrg.name;
        providerIdentifier = owningOrg.memberCode || providerIdentifier;
      }

      const orgConfig = await ProviderConfig.findOne({
        organizationId: policy.organizationId,
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

    // Check insurer mismatch if provided
    if (insurerCode && policy.insurerCode && policy.insurerCode.trim().toLowerCase() !== insurerCode.trim().toLowerCase()) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'INSURER_MISMATCH',
        explanation: `Policy record found (${policy.policyNumber}) but insurer code '${policy.insurerCode}' does not match the submitted value '${insurerCode}'.`,
        record: null,
        isMock: true,
      };
    }

    // Check policy type mismatch if provided (normalize e.g. "Health" vs "Health Insurance")
    const normSubmitted = (policyType || '').trim().toLowerCase().replace(/\s*insurance$/i, '');
    const normRecord = (policy.policyType || '').trim().toLowerCase().replace(/\s*insurance$/i, '');
    if (normSubmitted && normRecord && normSubmitted !== normRecord) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'POLICY_TYPE_MISMATCH',
        explanation: `Policy record found but policy type '${policy.policyType}' does not match the submitted value '${policyType}'.`,
        record: null,
        isMock: true,
      };
    }

    // Check expired policy
    const now = new Date();
    if (policy.status === 'EXPIRED' || policy.coverageEndDate < now) {
      return {
        status: 'EXPIRED',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'POLICY_EXPIRED',
        explanation: `Insurance policy ${policy.policyNumber} is expired. Coverage ended on ${new Date(policy.coverageEndDate).toLocaleDateString('en-IN')}.`,
        record: {
          policyRef: policy.policyNumber,
          insurerName: policy.insurerName,
          insurerCode: policy.insurerCode,
          policyType: policy.policyType,
          policyStatus: policy.status,
          coverageStartDate: policy.coverageStartDate,
          coverageEndDate: policy.coverageEndDate,
          sumInsured: policy.sumInsured,
        },
        isMock: true,
      };
    }

    // Check cancelled/suspended
    if (['CANCELLED', 'LAPSED', 'SUSPENDED'].includes(policy.status)) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: `POLICY_${policy.status}`,
        explanation: `Insurance policy record found but has status: ${policy.status}.`,
        record: {
          policyRef: policy.policyNumber,
          insurerName: policy.insurerName,
          insurerCode: policy.insurerCode,
          policyType: policy.policyType,
          policyStatus: policy.status,
        },
        isMock: true,
      };
    }

    // Verified — ACTIVE policy
    return {
      status: 'VERIFIED',
      providerName,
      providerIdentifier,
      latencyMs,
      errorCode: null,
      explanation: `Insurance policy successfully verified. Record matches the authoritative policy issued by ${providerName}.`,
      record: {
        policyRef: policy.policyNumber,
        insurerName: policy.insurerName,
        insurerCode: policy.insurerCode,
        policyType: policy.policyType,
        policyStatus: policy.status,
        coverageStartDate: policy.coverageStartDate,
        coverageEndDate: policy.coverageEndDate,
        sumInsured: policy.sumInsured,
        premiumStatus: policy.premiumStatus,
        policyHolderName: policy.policyHolderName,
        policyHolderRef: policy.policyHolderRef || undefined,
      },
      isMock: true,
    };
  }
}

export const mockInsuranceProvider = new MockInsuranceProvider();
