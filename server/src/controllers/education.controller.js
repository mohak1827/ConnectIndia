import { Service } from '../models/Service.js';
import { Organization } from '../models/Organization.js';
import { Transaction } from '../models/Transaction.js';
import { educationAdapter } from '../providers/education.adapter.js';
import { evaluatePolicy } from '../services/policy.service.js';
import { logTransaction } from '../services/transaction.service.js';
import { logAuditEvent } from '../services/audit.service.js';

export async function verifyAcademicRecord(req, res, next) {
  try {
    const {
      rollNumber,
      examYear,
      candidateName,
      dob,
      course,
      purpose = 'academic_verification',
      simulateOutage = false,
    } = req.body;

    const requestId = req.id;

    // 1. Input format validation
    if (!rollNumber || !examYear || !candidateName) {
      const missing = [];
      if (!rollNumber) missing.push('rollNumber');
      if (!examYear) missing.push('examYear');
      if (!candidateName) missing.push('candidateName');

      await logTransaction({
        requestId,
        actorId: req.user._id,
        actorEmail: req.user.email,
        serviceId: (await Service.findOne({ adapterKey: 'education_adapter' }))?._id,
        serviceName: 'Academic Record Verification',
        providerId: (await Organization.findOne({ memberCode: 'IN-CBSE-01' }))?._id,
        providerName: 'Central Board of Secondary Education',
        consumerOrgName: req.user.organization?.name || 'Self-Service Consumer',
        status: 'invalid_input',
        latencyMs: 5,
        errorCode: 'MISSING_FIELDS',
        summary: `Missing mandatory fields: ${missing.join(', ')}`,
      });

      return res.status(400).json({
        success: false,
        status: 'invalid_input',
        error: {
          code: 'INVALID_INPUT',
          message: `Check the submitted details. Missing required fields: ${missing.join(', ')}`,
          requestId,
        },
      });
    }

    // 2. Locate service and provider records
    const service = await Service.findOne({ adapterKey: 'education_adapter' }).populate('organizationId');
    if (!service) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNCONFIGURED',
          message: 'Academic verification adapter service configuration is missing.',
          requestId,
        },
      });
    }

    // 3. Evaluate Policy & Consent
    const policyResult = await evaluatePolicy({
      user: req.user,
      service,
      purpose,
      subjectRef: rollNumber,
      requestId,
    });

    if (!policyResult.allowed) {
      const isUnavailable = policyResult.statusOverride === 'unavailable';
      const safeTxStatus = isUnavailable ? 'unavailable' : 'denied';
      const httpCode = isUnavailable ? 503 : 403;

      await logTransaction({
        requestId,
        actorId: req.user._id,
        actorEmail: req.user.email,
        serviceId: service._id,
        serviceName: service.name,
        providerId: service.organizationId?._id || service.organizationId,
        providerName: service.organizationId?.name || 'Central Board of Secondary Education',
        consumerOrgName: req.user.organization?.name || 'Authorized Consumer',
        status: safeTxStatus,
        latencyMs: 12,
        errorCode: policyResult.code,
        summary: policyResult.reason,
      });

      return res.status(httpCode).json({
        success: false,
        status: isUnavailable ? 'unavailable' : 'denied',
        data: {
          requestId,
          status: isUnavailable ? 'unavailable' : 'denied',
          provider: service.organizationId?.name || 'Central Board of Secondary Education',
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

    // 4. Call provider adapter (Mock CBSE Issuer)
    const adapterResult = await educationAdapter.verify({
      rollNumber,
      examYear,
      candidateName,
      dob,
      course,
      simulateOutage,
    });

    // 5. Store transaction metadata (safe, minimal)
    const transaction = await logTransaction({
      requestId,
      actorId: req.user._id,
      actorEmail: req.user.email,
      serviceId: service._id,
      serviceName: service.name,
      providerId: service.organizationId._id,
      providerName: service.organizationId.name,
      consumerOrgName: req.user.organization?.name || 'Independent Verifier',
      status: adapterResult.status,
      latencyMs: adapterResult.latencyMs,
      errorCode: adapterResult.errorCode,
      summary: adapterResult.explanation,
    });

    // 6. Record audit event
    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'EDUCATION_VERIFY_REQUEST',
      resourceType: 'VERIFICATION',
      resourceId: requestId,
      outcome: adapterResult.status === 'verified' ? 'SUCCESS' : adapterResult.status === 'unavailable' ? 'FAILURE' : 'DENIED',
      requestId,
      details: `Verification returned status '${adapterResult.status}' with latency ${adapterResult.latencyMs}ms`,
    });

    // 7. Return normalized payload with clear prototype disclaimer
    return res.status(adapterResult.status === 'unavailable' ? 503 : 200).json({
      success: adapterResult.status === 'verified',
      status: adapterResult.status,
      data: {
        requestId,
        status: adapterResult.status,
        provider: adapterResult.providerName,
        checkedAt: new Date().toISOString(),
        latencyMs: adapterResult.latencyMs,
        explanation: adapterResult.explanation,
        disclaimer: 'Demo result — not an official government verification',
        record: adapterResult.record,
        transactionId: transaction?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getVerificationByRequestId(req, res, next) {
  try {
    const { requestId } = req.params;
    const transaction = await Transaction.findOne({ requestId })
      .populate('serviceId', 'name category version')
      .populate('providerId', 'name memberCode')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: `No transaction found for request ID: ${requestId}`,
          requestId: req.id,
        },
      });
    }

    // Role check: Only the actor, their organization, the provider, or admin can read the request result
    const isOwner = transaction.actorId?.toString() === req.user._id?.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'PLATFORM_ADMIN';
    const isConsumerOrg = req.user.organizationId && transaction.consumerOrgId &&
      transaction.consumerOrgId.toString() === req.user.organizationId.toString();
    const isProviderOrg = (req.user.providerId || req.user.organizationId) && transaction.providerId &&
      transaction.providerId.toString() === (req.user.providerId || req.user.organizationId).toString();

    if (!isOwner && !isAdmin && !isConsumerOrg && !isProviderOrg) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to view this verification record.',
          requestId: req.id,
        },
      });
    }

    res.json({
      success: true,
      data: {
        transaction,
        disclaimer: 'Demo result — not an official government verification',
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
