import { IdentityDocumentSample } from '../models/IdentityDocumentSample.js';
import { Organization } from '../models/Organization.js';
import { ProviderConfig } from '../models/ProviderConfig.js';

/**
 * Mock Identity Document Provider Adapter
 * Simulates identity document verification against fictional records.
 * 
 * ADAPTER BOUNDARY DOCUMENTATION:
 * To replace with a real identity provider (e.g., UIDAI, DigiLocker, Passport Seva):
 * 1. Implement the provider's authentication (OTP, biometric, digital signature)
 * 2. Implement consent flow — real identity data REQUIRES explicit individual consent
 * 3. Map request to provider-specific API fields
 * 4. Map response from provider format to standard format
 * 5. Apply provider-specific rate limits and data minimization rules
 * 6. Store credentials ONLY in environment variables or secret manager
 * 7. NEVER use real Aadhaar, PAN, or passport numbers in test data
 * 
 * DISCLAIMER: This adapter uses completely fictional document references.
 * Do NOT represent these results as official identity verification.
 */
export class MockIdentityProvider {
  getCapabilities() {
    return {
      serviceType: 'identity',
      providerName: 'ConnectIndia Mock Identity Registry',
      supportedTypes: ['National ID', 'Passport', 'Driving License', 'Voter ID', 'Resident Permit'],
      isMock: true,
      disclaimer:
        'Fictional document references only. Not Aadhaar, PAN, or any official government ID. Not real identity verification.',
    };
  }

  async getProviderStatus() {
    return {
      status: 'online',
      latencyAvgMs: 110,
      environment: 'mock',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify a fictional identity document.
   * @param {Object} request - { documentRef, documentType, issuingAuthority, holderName, dateOfBirth }
   * @param {Object} context - { requestId }
   * @returns {Promise<StandardVerificationResult>}
   */
  async verify(request, context = {}) {
    const startTime = Date.now();

    // Simulate network latency (90–280ms)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 180) + 90));

    const { documentRef, documentType, issuingAuthority, holderName, dateOfBirth } = request;
    const cleanRef = documentRef?.trim().toUpperCase();

    // Simulate provider outage for special test codes
    if (cleanRef?.startsWith('OUTAGE') || cleanRef?.startsWith('TIMEOUT')) {
      return {
        status: 'UNAVAILABLE',
        providerName: 'ConnectIndia Mock Identity Registry',
        providerIdentifier: 'mock_identity_provider',
        latencyMs: Date.now() - startTime,
        errorCode: 'PROVIDER_TIMEOUT',
        explanation: 'Identity registry provider is temporarily unavailable. Please retry later.',
        record: null,
        isMock: true,
      };
    }

    // Look up the document record
    const doc = await IdentityDocumentSample.findOne({ documentRef: cleanRef }).lean();
    const latencyMs = Date.now() - startTime;

    if (!doc) {
      return {
        status: 'NOT_FOUND',
        providerName: 'ConnectIndia Mock Identity Registry',
        providerIdentifier: 'mock_identity_provider',
        latencyMs,
        errorCode: 'DOCUMENT_NOT_FOUND',
        explanation: 'No identity document record found for the supplied reference.',
        record: null,
        isMock: true,
      };
    }

    // Determine authoritative issuer organization and check live adapter health
    let owningOrg = null;
    let providerName = doc.issuingAuthority || 'ConnectIndia Mock Identity Registry';
    let providerIdentifier = 'mock_identity_provider';

    if (doc.organizationId) {
      owningOrg = await Organization.findById(doc.organizationId).lean();
      if (owningOrg) {
        providerName = doc.issuingAuthority || owningOrg.name;
        providerIdentifier = owningOrg.memberCode || providerIdentifier;
      }

      const orgConfig = await ProviderConfig.findOne({
        organizationId: doc.organizationId,
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

    // Check document type if provided
    if (documentType && doc.documentType !== documentType) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'DOCUMENT_TYPE_MISMATCH',
        explanation: 'Document record found but the document type does not match.',
        record: null,
        isMock: true,
      };
    }

    // Check holder name if provided
    if (holderName && doc.holderName.toLowerCase() !== holderName.trim().toLowerCase()) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'NAME_MISMATCH',
        explanation: 'Document record found but the holder name does not match the submitted value.',
        record: null,
        isMock: true,
      };
    }

    // Check date of birth if provided
    if (dateOfBirth && doc.dateOfBirth !== dateOfBirth.trim()) {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'DOB_MISMATCH',
        explanation: 'Document record found but the date of birth does not match.',
        record: null,
        isMock: true,
      };
    }

    // Check document validity
    const now = new Date();
    if (doc.status === 'REVOKED') {
      return {
        status: 'MISMATCH',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'DOCUMENT_REVOKED',
        explanation: 'The document record has been revoked by the issuing authority.',
        record: { documentRef: doc.documentRef, documentType: doc.documentType, status: doc.status },
        isMock: true,
      };
    }

    if (doc.status === 'EXPIRED' || doc.expiryDate < now) {
      return {
        status: 'EXPIRED',
        providerName,
        providerIdentifier,
        latencyMs,
        errorCode: 'DOCUMENT_EXPIRED',
        explanation: `Identity document expired on ${new Date(doc.expiryDate).toLocaleDateString('en-IN')}.`,
        record: {
          documentRef: doc.documentRef,
          documentType: doc.documentType,
          issuingAuthority: doc.issuingAuthority,
          status: doc.status,
          expiryDate: doc.expiryDate,
        },
        isMock: true,
      };
    }

    // Verified
    return {
      status: 'VERIFIED',
      providerName,
      providerIdentifier,
      latencyMs,
      errorCode: null,
      explanation: `Identity document successfully verified. Record matches authoritative issuer registry (${providerName}).`,
      record: {
        documentRef: doc.documentRef,
        documentType: doc.documentType,
        issuingAuthority: doc.issuingAuthority,
        holderName: doc.holderName,
        dateOfBirth: doc.dateOfBirth,
        gender: doc.gender,
        nationality: doc.nationality,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        status: doc.status,
      },
      isMock: true,
    };
  }
}

export const mockIdentityProvider = new MockIdentityProvider();
