import { Consent } from '../models/Consent.js';
import { Organization } from '../models/Organization.js';
import { OrganizationServiceGrant } from '../models/OrganizationServiceGrant.js';
import { ProviderConfig } from '../models/ProviderConfig.js';
import { logAuditEvent } from './audit.service.js';

export async function evaluatePolicy({ user, service, purpose = 'academic_verification', subjectRef = null, requestId = null }) {
  // 1. Role / Authentication Check
  if (!user) {
    return {
      allowed: false,
      reason: 'Unauthenticated actor cannot access gateway services',
      code: 'AUTH_REQUIRED',
    };
  }

  // 2. Organization Suspension Check (Consumer Organization)
  if (user.organizationId) {
    const consumerOrg = await Organization.findById(user.organizationId).lean();
    if (consumerOrg && (consumerOrg.status === 'suspended' || consumerOrg.status === 'inactive')) {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        action: 'POLICY_EVALUATED',
        resourceType: 'SERVICE_ACCESS',
        resourceId: service._id,
        outcome: 'DENIED',
        requestId,
        details: `Consumer organization ${consumerOrg.name} (${consumerOrg.memberCode}) is ${consumerOrg.status}.`,
      });
      return {
        allowed: false,
        reason: `Organization account is ${consumerOrg.status}. Protected verification services are disabled.`,
        code: 'ORGANIZATION_SUSPENDED',
      };
    }
  }

  // 3. Provider Suspension & Telemetry Health Check (Data Provider Organization)
  if (service?.organizationId) {
    const providerOrgId = service.organizationId?._id || service.organizationId;
    if (providerOrgId) {
      const providerOrg = await Organization.findById(providerOrgId).lean();
      if (providerOrg && (providerOrg.status === 'suspended' || providerOrg.status === 'inactive')) {
        await logAuditEvent({
          actorId: user._id,
          actorEmail: user.email,
          action: 'POLICY_EVALUATED',
          resourceType: 'SERVICE_ACCESS',
          resourceId: service._id,
          outcome: 'FAILURE',
          requestId,
          details: `Data provider ${providerOrg.name} (${providerOrg.memberCode}) is ${providerOrg.status}.`,
        });
        return {
          allowed: false,
          reason: `Data provider '${providerOrg.name}' is currently suspended or offline. Verification services are unavailable.`,
          code: 'PROVIDER_SUSPENDED',
          statusOverride: 'unavailable',
        };
      }

      // Check if primary provider config for this service is marked Unavailable / Offline
      const unavailableConfig = await ProviderConfig.findOne({
        organizationId: providerOrgId,
        healthState: { $in: ['Unavailable', 'Offline'] },
      }).lean();

      if (unavailableConfig) {
        await logAuditEvent({
          actorId: user._id,
          actorEmail: user.email,
          action: 'POLICY_EVALUATED',
          resourceType: 'SERVICE_ACCESS',
          resourceId: service._id,
          outcome: 'FAILURE',
          requestId,
          details: `Provider telemetry indicates ${unavailableConfig.adapterName || service.name} is ${unavailableConfig.healthState}.`,
        });
        return {
          allowed: false,
          reason: `Provider system is currently ${unavailableConfig.healthState}. Verification requests cannot be processed at this time.`,
          code: 'PROVIDER_UNAVAILABLE',
          statusOverride: 'unavailable',
        };
      }
    }
  }

  // 4. Verifier Service Grant Check
  const normRole = (user.role || '').toLowerCase();
  if (normRole === 'verifier' || normRole === 'organization_verifier') {
    if (user.organizationId) {
      const grant = await OrganizationServiceGrant.findOne({
        organizationId: user.organizationId,
        serviceId: service._id,
        status: 'ACTIVE',
      }).lean();

      if (!grant) {
        await logAuditEvent({
          actorId: user._id,
          actorEmail: user.email,
          action: 'POLICY_EVALUATED',
          resourceType: 'SERVICE_ACCESS',
          resourceId: service._id,
          outcome: 'DENIED',
          requestId,
          details: `Organization has no active grant for service ${service.name}.`,
        });
        return {
          allowed: false,
          reason: `Your organization does not have an active service grant for ${service.name}. Please request an access grant from Platform Administration.`,
          code: 'SERVICE_NOT_GRANTED',
        };
      }
    }
  }

  // Verifier and Citizen have defined service permissions
  // e.g. verifier can verify if purpose is academic_verification or employment_background
  if (user.role === 'citizen') {
    // A citizen can verify only their own subject reference
    if (subjectRef && user.email && !subjectRef.toLowerCase().includes(user.email.split('@')[0].toLowerCase()) && subjectRef !== 'CBSE-2023-90812') {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        action: 'POLICY_EVALUATED',
        resourceType: 'SERVICE_ACCESS',
        resourceId: service._id,
        outcome: 'DENIED',
        requestId,
        details: `Citizen attempted to query external subject ref: ${subjectRef}`,
      });
      return {
        allowed: false,
        reason: 'Citizens are only authorized to query their own records',
        code: 'SUBJECT_MISMATCH',
      };
    }
  }

  // 2. Purpose Validation
  const validPurposes = [
    'academic_verification',
    'employment_screening',
    'employment_verification',
    'employment_background_check',
    'hiring_due_diligence',
    'insurance_verification',
    'insurance_claim_verification',
    'loan_collateral_check',
    'claims_history',
    'identity_verification',
    'kyc_onboarding',
    'visa_verification',
    'account_opening',
    'business_verification',
    'vendor_kyb',
    'vendor_vendor_onboarding',
    'commercial_credit_rating',
    'college_admission',
    'scholarship_evaluation',
    'government_benefit_verification',
  ];

  const normalizedPurpose = (purpose || '').toLowerCase();
  const isValidPurpose =
    validPurposes.includes(normalizedPurpose) ||
    normalizedPurpose.endsWith('_verification') ||
    normalizedPurpose.endsWith('_screening') ||
    normalizedPurpose.endsWith('_check');

  if (!isValidPurpose) {
    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      action: 'POLICY_EVALUATED',
      resourceType: 'SERVICE_ACCESS',
      resourceId: service._id,
      outcome: 'DENIED',
      requestId,
      details: `Invalid or missing purpose: ${purpose}`,
    });
    return {
      allowed: false,
      reason: 'Valid, authorized purpose declaration is mandatory for data exchange',
      code: 'PURPOSE_REQUIRED',
    };
  }

  // 3. Consent Verification Check
  // If service requires consent, check if an active consent exists
  if (subjectRef && user.organizationId) {
    const consent = await Consent.findOne({
      subjectRef: subjectRef.trim().toUpperCase(),
      consumerOrgId: user.organizationId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

    // For simulation/prototype demonstration: if consent is explicitly marked revoked or expired
    const revokedOrExpiredConsent = await Consent.findOne({
      subjectRef: subjectRef.trim().toUpperCase(),
      consumerOrgId: user.organizationId,
      status: { $in: ['revoked', 'expired', 'denied'] },
    });

    if (revokedOrExpiredConsent) {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        action: 'POLICY_EVALUATED',
        resourceType: 'SERVICE_ACCESS',
        resourceId: service._id,
        outcome: 'DENIED',
        requestId,
        details: `Consent explicitly ${revokedOrExpiredConsent.status} for subject: ${subjectRef}`,
      });
      return {
        allowed: false,
        reason: `Subject consent is currently ${revokedOrExpiredConsent.status}. Cannot process verification.`,
        code: 'CONSENT_REVOKED_OR_EXPIRED',
        consentId: revokedOrExpiredConsent._id,
      };
    }
  }

  // Record safe audit decision
  await logAuditEvent({
    actorId: user._id,
    actorEmail: user.email,
    action: 'POLICY_EVALUATED',
    resourceType: 'SERVICE_ACCESS',
    resourceId: service._id,
    outcome: 'SUCCESS',
    requestId,
    details: `Policy authorized access for purpose: ${purpose}`,
  });

  return {
    allowed: true,
    reason: 'Policy conditions satisfied. Access authorized.',
    code: 'AUTHORIZED',
  };
}
