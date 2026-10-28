import { OrganizationAccessRequest } from '../models/OrganizationAccessRequest.js';
import { ProviderAccessRequest } from '../models/ProviderAccessRequest.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { OrganizationServiceGrant } from '../models/OrganizationServiceGrant.js';
import { logAuditEvent } from '../services/audit.service.js';
import { generateSecurePassword } from '../utils/security.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

function generateReferenceNumber() {
  const prefix = 'CI-REQ';
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${random}`;
}

// POST /api/v1/access-requests — public, submit a new request
export async function submitAccessRequest(req, res, next) {
  try {
    const {
      organizationName,
      organizationType,
      officialEmail,
      contactPersonName,
      contactPerson,
      designation,
      contactPhone,
      website,
      reasonForAccess,
      justification,
      agreedToTerms,
      intendedServices,
      registrationNumber,
    } = req.body;

    const actualContactPerson = (contactPersonName || contactPerson || '').trim();
    const actualReason = (reasonForAccess || justification || '').trim();
    const actualDesignation = (designation || 'Authorized Representative').trim();

    // Validation
    const missing = [];
    if (!organizationName) missing.push('organizationName');
    if (!organizationType) missing.push('organizationType');
    if (!officialEmail) missing.push('officialEmail');
    if (!actualContactPerson) missing.push('contactPersonName');
    if (!actualReason) missing.push('reasonForAccess');
    if (!agreedToTerms) missing.push('agreedToTerms');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: `Required fields missing: ${missing.join(', ')}`,
          requestId: req.id,
        },
      });
    }

    // Check for existing pending request for this email to avoid spam
    const existingPending = await OrganizationAccessRequest.findOne({
      officialEmail: officialEmail.toLowerCase().trim(),
      status: { $in: ['PENDING', 'UNDER_REVIEW'] },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'REQUEST_ALREADY_PENDING',
          message:
            'A pending access request already exists for this email address. Please wait for its review or check your status using the reference number.',
          requestId: req.id,
        },
      });
    }

    const referenceNumber = generateReferenceNumber();

    const selectedServices = Array.isArray(intendedServices) && intendedServices.length > 0
      ? intendedServices
      : ['education', 'identity'];

    const accessRequest = new OrganizationAccessRequest({
      referenceNumber,
      organizationName: organizationName.trim(),
      organizationType,
      officialEmail: officialEmail.toLowerCase().trim(),
      contactPersonName: actualContactPerson,
      designation: actualDesignation,
      contactPhone: (contactPhone || '').trim(),
      website: website?.trim() || '',
      registrationNumber: registrationNumber?.trim() || '',
      reasonForAccess: actualReason,
      intendedServices: selectedServices,
      permittedServices: selectedServices,
      agreedToTerms: !!agreedToTerms,
      status: 'PENDING',
    });

    await accessRequest.save();

    return res.status(201).json({
      success: true,
      data: {
        referenceNumber,
        referenceCode: referenceNumber,
        organizationName: accessRequest.organizationName,
        officialEmail: accessRequest.officialEmail,
        contactPersonName: accessRequest.contactPersonName,
        organizationType: accessRequest.organizationType,
        intendedServices: accessRequest.intendedServices,
        status: 'PENDING',
        message:
          'Your organization access request has been submitted. You will be contacted at the provided email once reviewed.',
        submittedAt: accessRequest.createdAt,
        createdAt: accessRequest.createdAt,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/access-requests/status — public, check by ref OR email OR both (searches Organization and Provider requests)
export async function checkRequestStatus(req, res, next) {
  try {
    const { referenceNumber, referenceCode, email } = req.query;
    const ref = (referenceNumber || referenceCode || '').trim();
    const mail = (email || '').toLowerCase().trim();

    if (!ref && !mail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Either reference number or registered email is required.',
          requestId: req.id,
        },
      });
    }

    const query = {};
    if (ref && mail) {
      query.referenceNumber = ref;
      query.officialEmail = mail;
    } else if (ref) {
      query.referenceNumber = ref;
    } else {
      query.officialEmail = mail;
    }

    // 1. Search OrganizationAccessRequest
    const orgReq = await OrganizationAccessRequest.findOne(query).sort({ createdAt: -1 }).lean();

    if (orgReq) {
      return res.json({
        success: true,
        data: {
          _id: orgReq._id,
          id: orgReq._id,
          referenceNumber: orgReq.referenceNumber,
          referenceCode: orgReq.referenceNumber,
          type: 'ORGANIZATION',
          organizationName: orgReq.organizationName,
          organizationType: orgReq.organizationType,
          officialEmail: orgReq.officialEmail,
          contactPersonName: orgReq.contactPersonName,
          designation: orgReq.designation,
          contactPhone: orgReq.contactPhone,
          website: orgReq.website || orgReq.registrationNumber || '',
          registrationNumber: orgReq.registrationNumber || '',
          intendedServices: orgReq.intendedServices || orgReq.permittedServices || [],
          reasonForAccess: orgReq.reasonForAccess,
          status: orgReq.status,
          submittedAt: orgReq.createdAt,
          createdAt: orgReq.createdAt,
          reviewedAt: orgReq.reviewedAt || null,
          reviewNote: orgReq.status !== 'PENDING' ? orgReq.reviewNote : null,
          createdOrganizationId: orgReq.createdOrganizationId || null,
        },
        requestId: req.id,
      });
    }

    // 2. Search ProviderAccessRequest
    const provReq = await ProviderAccessRequest.findOne(query).sort({ createdAt: -1 }).lean();

    if (provReq) {
      return res.json({
        success: true,
        data: {
          _id: provReq._id,
          id: provReq._id,
          referenceNumber: provReq.referenceNumber,
          referenceCode: provReq.referenceNumber,
          type: 'PROVIDER',
          organizationName: provReq.providerName,
          providerName: provReq.providerName,
          organizationType: provReq.providerCategory,
          providerCategory: provReq.providerCategory,
          officialEmail: provReq.officialEmail,
          contactPersonName: provReq.contactPersonName,
          designation: provReq.designation,
          contactPhone: provReq.contactPhone,
          website: provReq.website || '',
          serviceOfferings: provReq.serviceOfferings,
          status: provReq.status,
          submittedAt: provReq.createdAt,
          createdAt: provReq.createdAt,
          reviewedAt: provReq.reviewedAt || null,
          reviewNote: provReq.status !== 'PENDING' ? provReq.reviewNote : null,
          createdOrganizationId: provReq.createdOrganizationId || null,
        },
        requestId: req.id,
      });
    }

    return res.status(404).json({
      success: false,
      error: {
        code: 'REQUEST_NOT_FOUND',
        message: 'No application found matching the provided reference number or email.',
        requestId: req.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/admin/access-requests — admin only
export async function listAccessRequests(req, res, next) {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = {};
    if (status && status !== 'all' && status !== 'undefined' && status !== 'null') query.status = status;
    if (search) {
      query.$or = [
        { organizationName: { $regex: search.trim(), $options: 'i' } },
        { officialEmail: { $regex: search.trim(), $options: 'i' } },
        { referenceNumber: { $regex: search.trim(), $options: 'i' } },
        { contactPersonName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total, pendingCount] = await Promise.all([
      OrganizationAccessRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OrganizationAccessRequest.countDocuments(query),
      OrganizationAccessRequest.countDocuments({ status: 'PENDING' }),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pendingCount,
        totalCount: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/admin/access-requests/:id/review — admin only
export async function reviewAccessRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`,
          requestId: req.id,
        },
      });
    }

    const request = await OrganizationAccessRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Access request not found.',
          requestId: req.id,
        },
      });
    }

    // Do not allow an organization to approve its own application
    if (req.user.organizationId && String(req.user.organizationId) === String(request.createdOrganizationId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SELF_APPROVAL_FORBIDDEN',
          message: 'An organization cannot review or approve its own application.',
          requestId: req.id,
        },
      });
    }

    request.status = status;
    request.reviewNote = reviewNote?.trim() || '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    await request.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'ACCESS_REQUEST_REVIEWED',
      resourceType: 'ORGANIZATION_REQUEST',
      resourceId: request._id,
      outcome: status === 'REJECTED' ? 'DENIED' : 'SUCCESS',
      requestId: req.id,
      details: `Request ${request.referenceNumber} status changed to ${status}. Note: ${reviewNote || 'none'}`,
    });

    res.json({
      success: true,
      data: { request },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/admin/access-requests/:id/activate — admin only
// Creates organization + user account after approval
export async function activateApprovedRequest(req, res, next) {
  try {
    const { id } = req.params;
    let { memberCode, initialPassword } = req.body;

    if (!memberCode) {
      memberCode = `ORG-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    }

    const passwordToUse = initialPassword && initialPassword.trim().length >= 8
      ? initialPassword.trim()
      : generateSecurePassword();

    const request = await OrganizationAccessRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Access request not found.',
          requestId: req.id,
        },
      });
    }

    if (request.status !== 'APPROVED') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_APPROVED',
          message: 'Request must be in APPROVED status before activation.',
          requestId: req.id,
        },
      });
    }

    if (request.createdOrganizationId) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_ACTIVATED',
          message: 'This request has already been activated.',
          requestId: req.id,
        },
      });
    }

    // Check memberCode uniqueness
    const existingOrg = await Organization.findOne({ memberCode: memberCode.trim().toUpperCase() });
    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'MEMBER_CODE_EXISTS',
          message: `An organization with member code ${memberCode} already exists.`,
          requestId: req.id,
        },
      });
    }

    // Map organization type to category
    const categoryMap = {
      'Insurance Company': 'Governance',
      'University or College': 'Education',
      'Employer': 'Verifier',
      'Hospital or Healthcare Organization': 'Healthcare',
      'Government Agency': 'Governance',
      'Business or Professional Organization': 'Verifier',
      'Other': 'Verifier',
    };

    // Create Organization
    const org = new Organization({
      name: request.organizationName,
      memberCode: memberCode.trim().toUpperCase(),
      category: categoryMap[request.organizationType] || 'Verifier',
      contactEmail: request.officialEmail,
      description: `Verified organization. Contact: ${request.contactPersonName} (${request.designation})`,
      status: 'active',
    });
    await org.save();

    // Hash password and create or update User
    const passwordHash = await bcrypt.hash(passwordToUse, 12);
    const defaultDisplayName = `${request.contactPersonName || 'Verifier'} (${request.organizationName || 'Organization'})`;
    let orgUser = await User.findOne({ email: request.officialEmail.toLowerCase() });
    if (orgUser) {
      orgUser.passwordHash = passwordHash;
      orgUser.role = 'verifier';
      orgUser.organizationId = org._id;
      orgUser.status = 'active';
      if (!orgUser.displayName) {
        orgUser.displayName = defaultDisplayName;
      }
      await orgUser.save();
    } else {
      orgUser = new User({
        email: request.officialEmail.toLowerCase(),
        passwordHash,
        displayName: defaultDisplayName,
        role: 'verifier',
        organizationId: org._id,
        status: 'active',
      });
      await orgUser.save();
    }

    // Link back to the request
    request.createdOrganizationId = org._id;
    await request.save();

    // Provision default service grants for the activated organization
    const servicesToGrant = request.intendedServices?.length
      ? request.intendedServices
      : (request.permittedServices?.length ? request.permittedServices : ['education', 'identity']);

    const matchedServices = await Service.find({
      $or: [
        { category: { $in: servicesToGrant.map((s) => new RegExp(`^${s}`, 'i')) } },
        { endpointAlias: { $in: servicesToGrant } },
        { adapterKey: { $in: servicesToGrant } },
      ],
    });

    for (const svc of matchedServices) {
      await OrganizationServiceGrant.findOneAndUpdate(
        { organizationId: org._id, serviceId: svc._id },
        {
          organizationId: org._id,
          serviceId: svc._id,
          status: 'ACTIVE',
          allowedPurposes: [
            'academic_verification',
            'employment_screening',
            'kyc_onboarding',
            'insurance_verification',
            'business_verification',
          ],
          grantedBy: req.user._id,
          grantedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'ORGANIZATION_ACTIVATED',
      resourceType: 'ORGANIZATION',
      resourceId: org._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Activated organization ${org.name} (${org.memberCode}) with user ${orgUser.email}`,
    });

    res.status(200).json({
      success: true,
      data: {
        organization: {
          _id: org._id,
          id: org._id,
          name: org.name,
          memberCode: org.memberCode,
          status: org.status,
        },
        user: {
          _id: orgUser._id,
          id: orgUser._id,
          email: orgUser.email,
          displayName: orgUser.displayName,
          role: orgUser.role,
        },
        account: {
          email: orgUser.email,
          initialPassword: passwordToUse,
          memberCode: org.memberCode,
        },
        message: 'Organization and user account created successfully.',
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
