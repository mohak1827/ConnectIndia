import { Service } from '../models/Service.js';
import { Organization } from '../models/Organization.js';
import { getProvider, getProviderMeta } from '../providers/registry.js';
import { evaluatePolicy } from '../services/policy.service.js';
import { logTransaction } from '../services/transaction.service.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Shared verification workflow controller.
 * Handles authentication, authorization, consent, adapter dispatch,
 * transaction logging, and standardized response — for all 4 services.
 * 
 * The frontend sends: POST /api/v1/verify/:serviceType
 * This controller dispatches to the correct provider adapter via the registry.
 */
export async function runVerification(req, res, next) {
  try {
    const { serviceType } = req.params;
    const requestId = req.id;
    const startTime = Date.now();

    // 1. Resolve provider adapter from registry
    let providerAdapter;
    let providerMeta;
    try {
      providerAdapter = getProvider(serviceType);
      providerMeta = getProviderMeta(serviceType);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE_TYPE',
          message: `Unknown verification service: ${serviceType}. Supported: education, insurance, identity, employment, business`,
          requestId,
        },
      });
    }

    // 2. Find or create a service record for this service type
    const service = await Service.findOne({ adapterKey: providerMeta.adapterKey }).populate('organizationId');
    if (!service) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNCONFIGURED',
          message: `Service adapter '${providerMeta.adapterKey}' is not configured in the service registry.`,
          requestId,
        },
      });
    }

    // 3. Evaluate consent/policy — determine subjectRef from request body
    const subjectRef = req.body.policyNumber || req.body.documentRef ||
      req.body.employeeRef || req.body.registrationNumber || req.body.rollNumber || null;
    const purpose = req.body.purpose || `${serviceType}_verification`;

    const policyResult = await evaluatePolicy({
      user: req.user,
      service,
      purpose,
      subjectRef,
      requestId,
    });

    const providerOrg = service.organizationId;

    if (!policyResult.allowed) {
      const isUnavailable = policyResult.statusOverride === 'unavailable';
      const safeTxStatus = isUnavailable ? 'unavailable' : 'denied';
      const httpCode = isUnavailable ? 503 : 403;

      await logTransaction({
        requestId,
        actorId: req.user._id,
        actorEmail: req.user.email,
        consumerOrgId: req.user.organizationId || null,
        serviceId: service._id,
        serviceName: service.name,
        serviceType,
        providerId: providerOrg?._id,
        providerName: providerOrg?.name || providerMeta.displayName,
        consumerOrgName: req.user.organization?.name || 'Independent Verifier',
        status: safeTxStatus,
        latencyMs: Date.now() - startTime,
        errorCode: policyResult.code,
        summary: policyResult.reason,
      });

      return res.status(httpCode).json({
        success: false,
        status: isUnavailable ? 'UNAVAILABLE' : 'DENIED',
        data: {
          requestId,
          status: isUnavailable ? 'UNAVAILABLE' : 'DENIED',
          serviceType,
          provider: providerOrg?.name || providerMeta.displayName,
          checkedAt: new Date().toISOString(),
          explanation: policyResult.reason,
          disclaimer: 'Demo result — not an official government verification',
        },
        error: {
          code: policyResult.code,
          message: policyResult.reason,
          requestId,
        },
      });
    }

    // 4. Call the provider adapter
    const adapterResult = await providerAdapter.verify(req.body, { requestId });

    // 5. Normalize status to lowercase for storage consistency
    const normalizedStatus = adapterResult.status?.toLowerCase();
    const validStatuses = ['verified', 'mismatch', 'unavailable', 'denied', 'not_found', 'expired', 'invalid_input'];
    const safeStatus = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'unavailable';

    // 6. Log transaction
    const transaction = await logTransaction({
      requestId,
      actorId: req.user._id,
      actorEmail: req.user.email,
      consumerOrgId: req.user.organizationId || null,
      serviceId: service._id,
      serviceName: service.name,
      serviceType,
      providerId: providerOrg?._id,
      providerName: adapterResult.providerName || providerOrg?.name || providerMeta.displayName,
      consumerOrgName: req.user.organization?.name || 'Independent Verifier',
      status: safeStatus,
      latencyMs: adapterResult.latencyMs,
      errorCode: adapterResult.errorCode,
      summary: adapterResult.explanation,
    });

    // 7. Log audit event
    const outcomeMap = {
      verified: 'SUCCESS',
      mismatch: 'DENIED',
      not_found: 'DENIED',
      expired: 'DENIED',
      unavailable: 'FAILURE',
      denied: 'DENIED',
    };

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: `${serviceType.toUpperCase()}_VERIFY_REQUEST`,
      resourceType: 'VERIFICATION',
      resourceId: requestId,
      outcome: outcomeMap[safeStatus] || 'FAILURE',
      requestId,
      details: `${providerMeta.displayName} returned '${safeStatus}' in ${adapterResult.latencyMs}ms`,
    });

    // 8. Return standardized response
    const httpStatus = safeStatus === 'unavailable' ? 503 : 200;
    return res.status(httpStatus).json({
      success: safeStatus === 'verified',
      status: adapterResult.status,
      data: {
        requestId,
        transactionId: transaction?._id || null,
        serviceType,
        status: adapterResult.status,
        provider: adapterResult.providerName,
        providerIdentifier: adapterResult.providerIdentifier,
        checkedAt: new Date().toISOString(),
        latencyMs: adapterResult.latencyMs,
        explanation: adapterResult.explanation,
        record: adapterResult.record || null,
        isMock: adapterResult.isMock !== false,
        disclaimer: 'Demo result — not an official government verification. All records are fictional sample data.',
      },
    });
  } catch (error) {
    next(error);
  }
}
