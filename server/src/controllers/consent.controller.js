import { Consent } from '../models/Consent.js';
import { Service } from '../models/Service.js';
import { Organization } from '../models/Organization.js';
import { evaluatePolicy } from '../services/policy.service.js';
import { logAuditEvent } from '../services/audit.service.js';

export async function listConsents(req, res, next) {
  try {
    const userRole = req.user.role;
    const query = {};

    if (userRole === 'citizen') {
      // Citizen views consents related to their user ID or email identifier
      query.$or = [
        { subjectUserId: req.user._id },
        { subjectRef: { $regex: req.user.email.split('@')[0], $options: 'i' } },
        { subjectRef: 'CBSE-2023-90812' }, // Demo record association
      ];
    } else if (userRole === 'verifier' && req.user.organizationId) {
      query.consumerOrgId = req.user.organizationId;
    }
    // Admin sees all consents

    const consents = await Consent.find(query)
      .populate('consumerOrgId', 'name memberCode')
      .populate('serviceId', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { consents },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function createConsent(req, res, next) {
  try {
    const { subjectRef, consumerOrgId, serviceId, purpose, dataCategory, durationDays = 30 } = req.body;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(durationDays, 10));

    const consent = new Consent({
      subjectRef: subjectRef.trim().toUpperCase(),
      subjectUserId: req.user.role === 'citizen' ? req.user._id : null,
      consumerOrgId,
      serviceId,
      purpose,
      dataCategory: dataCategory || 'Academic Credentials',
      status: 'active',
      expiresAt,
    });

    await consent.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'CONSENT_GRANTED',
      resourceType: 'CONSENT',
      resourceId: consent._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Consent registered for subject: ${subjectRef} towards purpose: ${purpose}`,
    });

    res.status(201).json({
      success: true,
      data: { consent },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateConsentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'revoked', 'denied'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be active, revoked, or denied.',
          requestId: req.id,
        },
      });
    }

    const consent = await Consent.findById(id);
    if (!consent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONSENT_NOT_FOUND',
          message: 'Consent record not found.',
          requestId: req.id,
        },
      });
    }

    // Role check: Citizen can revoke their own consent, admin can revoke any
    if (req.user.role === 'citizen' && consent.subjectUserId && consent.subjectUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only manage your own consent records.',
          requestId: req.id,
        },
      });
    }

    consent.status = status;
    if (status === 'revoked') {
      consent.revokedAt = new Date();
    }
    await consent.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: status === 'revoked' ? 'CONSENT_REVOKED' : 'CONSENT_UPDATED',
      resourceType: 'CONSENT',
      resourceId: consent._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Consent status transitioned to '${status}'`,
    });

    res.json({
      success: true,
      data: { consent },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function evaluatePolicyEndpoint(req, res, next) {
  try {
    const { serviceId, purpose, subjectRef } = req.body;

    const service = await Service.findById(serviceId).populate('organizationId');
    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'Specified service does not exist in directory.',
          requestId: req.id,
        },
      });
    }

    const evaluation = await evaluatePolicy({
      user: req.user,
      service,
      purpose,
      subjectRef,
      requestId: req.id,
    });

    res.json({
      success: true,
      data: {
        evaluation,
        service: {
          id: service._id,
          name: service.name,
          provider: service.organizationId?.name,
        },
        disclaimer: 'Prototype policy evaluation simulator — strictly enforces purpose limitation & consent state.',
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
