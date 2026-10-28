import { Organization } from '../models/Organization.js';
import { Service } from '../models/Service.js';
import { Transaction } from '../models/Transaction.js';
import { OrganizationServiceGrant } from '../models/OrganizationServiceGrant.js';
import { logAuditEvent } from '../services/audit.service.js';

export async function getOrgOverview(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;

    const org = orgId ? await Organization.findById(orgId).lean() : null;

    // Filter transactions by organization or actor
    const query = orgId ? { consumerOrgId: orgId } : { actorId: userId };

    const [
      grantsCount,
      totalServices,
      totalRequests,
      verifiedCount,
      mismatchCount,
      notFoundCount,
      deniedCount,
      recentRequests,
    ] = await Promise.all([
      orgId ? OrganizationServiceGrant.countDocuments({ organizationId: orgId, status: 'ACTIVE' }) : 0,
      Service.countDocuments({ status: 'active' }),
      Transaction.countDocuments(query),
      Transaction.countDocuments({ ...query, status: 'verified' }),
      Transaction.countDocuments({ ...query, status: 'mismatch' }),
      Transaction.countDocuments({ ...query, status: 'not_found' }),
      Transaction.countDocuments({ ...query, status: 'denied' }),
      Transaction.find(query).sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const accessibleServiceCount = grantsCount > 0 ? grantsCount : totalServices;

    res.json({
      success: true,
      data: {
        organization: org
          ? {
              name: org.name,
              memberCode: org.memberCode,
              category: org.category,
              contactEmail: org.contactEmail,
            }
          : {
              name: 'Independent Verifier',
              memberCode: 'INDEP-01',
              category: 'Verifier',
            },
        metrics: {
          accessibleServices: accessibleServiceCount,
          totalRequests,
          verified: verifiedCount,
          mismatch: mismatchCount,
          notFound: notFoundCount,
          denied: deniedCount,
          successRate: totalRequests > 0 ? Math.round((verifiedCount / totalRequests) * 100) : 0,
        },
        recentRequests,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrgServices(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const isVerifier = req.user.role === 'verifier' || req.user.role === 'organization_verifier';

    if (orgId) {
      // Check if explicit grants exist for this organization
      const grants = await OrganizationServiceGrant.find({ organizationId: orgId, status: 'ACTIVE' })
        .populate({
          path: 'serviceId',
          populate: { path: 'organizationId', select: 'name memberCode category' },
        })
        .lean();

      if (grants && grants.length > 0) {
        const services = grants
          .filter((g) => g.serviceId)
          .map((g) => ({
            ...g.serviceId,
            allowedPurposes: g.allowedPurposes,
            grantId: g._id,
          }));

        return res.json({
          success: true,
          data: { services, hasExplicitGrants: true },
          requestId: req.id,
        });
      }

      // If user is an organization verifier with zero active grants, they have no entitled services
      if (isVerifier) {
        return res.json({
          success: true,
          data: { services: [], hasExplicitGrants: true },
          requestId: req.id,
        });
      }
    }

    // Default to active services for admin or unassigned accounts
    const services = await Service.find({ status: { $in: ['active', 'beta'] } })
      .populate('organizationId', 'name memberCode category')
      .lean();

    res.json({
      success: true,
      data: { services, hasExplicitGrants: false },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrgGrants(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.json({
        success: true,
        data: { grants: [] },
        requestId: req.id,
      });
    }

    const grants = await OrganizationServiceGrant.find({ organizationId: orgId })
      .populate('serviceId', 'name category version status')
      .populate('grantedBy', 'displayName email')
      .lean();

    res.json({
      success: true,
      data: { grants },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrgHistory(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const userId = req.user._id;
    const { status, serviceType, page = 1, limit = 15 } = req.query;

    const query = orgId ? { consumerOrgId: orgId } : { actorId: userId };
    if (status && status !== 'all') query.status = status;
    if (serviceType && serviceType !== 'all') query.serviceType = serviceType;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrgProfile(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.json({
        success: true,
        data: {
          organization: {
            name: req.user.displayName,
            memberCode: 'VERIFIER-SELF',
            category: 'Verifier',
            contactEmail: req.user.email,
          },
        },
        requestId: req.id,
      });
    }

    const org = await Organization.findById(orgId).lean();
    res.json({
      success: true,
      data: { organization: org },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrgProfile(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORG_NOT_CONFIGURED',
          message: 'No associated organization found for this user account.',
          requestId: req.id,
        },
      });
    }

    const { contactEmail, description } = req.body;
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORG_NOT_FOUND',
          message: 'Organization not found.',
          requestId: req.id,
        },
      });
    }

    if (contactEmail && typeof contactEmail === 'string' && contactEmail.includes('@')) {
      org.contactEmail = contactEmail.toLowerCase().trim();
    }
    if (description !== undefined && typeof description === 'string') {
      org.description = description.trim();
    }

    await org.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'ORGANIZATION_PROFILE_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: org._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Organization profile updated for ${org.name} (${org.memberCode})`,
    });

    res.json({
      success: true,
      message: 'Organization profile updated successfully.',
      data: { organization: org },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
