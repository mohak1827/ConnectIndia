import { EmploymentRecordSample } from '../models/EmploymentRecordSample.js';
import { Organization } from '../models/Organization.js';
import { ProviderConfig } from '../models/ProviderConfig.js';

/**
 * Mock Employment Provider Adapter
 * Simulates employment record verification against fictional HR records.
 * 
 * ADAPTER BOUNDARY DOCUMENTATION:
 * To replace with a real employment verification provider:
 * 1. Implement employer-specific API authentication (API key, OAuth)
 * 2. Map employer code to provider-specific endpoint
 * 3. Handle consent requirements (employee must authorize disclosure)
 * 4. Map request fields to provider format (vary by employer/HRMS)
 * 5. Map provider response to standard format
 * 6. Handle provider-specific errors (employer not onboarded, record sealed, etc.)
 * 7. Apply data minimization — return only what is needed
 */
export class MockEmploymentProvider {
  getCapabilities() {
    return {
      serviceType: 'employment',
      providerName: 'ConnectIndia Mock Employment Registry',
      isMock: true,
      disclaimer: 'All results from fictional sample employment records. Not real HR records.',
    };
  }

  async getProviderStatus() {
    return {
      status: 'online',
      latencyAvgMs: 120,
      environment: 'mock',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify employment record.
   * @param {Object} request - { employeeRef, employerName, employmentPeriodStart, employmentPeriodEnd }
   * @param {Object} context - { requestId }
   * @returns {Promise<StandardVerificationResult>}
   */
  async verify(request, context = {}) {
    const startTime = Date.now();

    // Simulate network latency (100–260ms)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 160) + 100));

    const { employeeRef, employerName, employmentPeriodStart, employmentPeriodEnd } = request;
    const cleanRef = employeeRef?.trim().toUpperCase();

    // Simulate provider outage
    if (cleanRef?.startsWith('OUTAGE') || cleanRef?.startsWith('TIMEOUT')) {
      return {
        status: 'UNAVAILABLE',
        providerName: 'ConnectIndia Mock Employment Registry',
        providerIdentifier: 'mock_employment_provider',
        latencyMs: Date.now() - startTime,
        errorCode: 'PROVIDER_TIMEOUT',
        explanation: 'Employment registry provider is temporarily unavailable. Please retry later.',
        record: null,
        isMock: true,
      };
    }

    // Look up the record
    const rec = await EmploymentRecordSample.findOne({ employeeRef: cleanRef }).lean();
    const latencyMs = Date.now() - startTime;

    if (!rec) {
      return {
        status: 'NOT_FOUND',
        providerName: 'ConnectIndia Mock Employment Registry',
        providerIdentifier: 'mock_employment_provider',
        latencyMs,
        errorCode: 'RECORD_NOT_FOUND',
        explanation: 'No employment record found for the supplied employee reference.',
        record: null,
        isMock: true,
      };
    }

    // Determine authoritative employer organization and check live adapter health
    let owningOrg = null;
    let providerName = rec.employerName || 'ConnectIndia Mock Employment Registry';
    let providerIdentifier = 'mock_employment_provider';

    if (rec.organizationId) {
      owningOrg = await Organization.findById(rec.organizationId).lean();
      if (owningOrg) {
        providerName = rec.employerName || owningOrg.name;
        providerIdentifier = owningOrg.memberCode || providerIdentifier;
      }

      const orgConfig = await ProviderConfig.findOne({
        organizationId: rec.organizationId,
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

    // Check employer name if provided (case-insensitive)
    if (
      employerName &&
      !rec.employerName.toLowerCase().includes(employerName.trim().toLowerCase())
    ) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'EMPLOYER_MISMATCH',
        explanation: 'Employment record found but the employer name does not match.',
        record: null,
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
      explanation: `Employment record successfully verified against authoritative registry (${providerName}).`,
      record: {
        employeeRef: rec.employeeRef,
        employerName: rec.employerName,
        employeeName: rec.employeeName,
        designation: rec.designation,
        department: rec.department,
        employmentType: rec.employmentType,
        joiningDate: rec.joiningDate,
        relievingDate: rec.relievingDate,
        status: rec.status,
        lastWorkingDay: rec.lastWorkingDay,
      },
      isMock: true,
    };
  }
}

export const mockEmploymentProvider = new MockEmploymentProvider();
