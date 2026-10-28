import bcrypt from 'bcryptjs';
import { Organization } from '../models/Organization.js';
import { Service } from '../models/Service.js';
import { ProviderConfig } from '../models/ProviderConfig.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { OrganizationAccessRequest } from '../models/OrganizationAccessRequest.js';
import { ProviderAccessRequest } from '../models/ProviderAccessRequest.js';
import { OrganizationServiceGrant } from '../models/OrganizationServiceGrant.js';
import { logAuditEvent } from '../services/audit.service.js';
import { generateSecurePassword } from '../utils/security.js';

// ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

export async function listOrganizations(req, res, next) {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: { organizations: orgs },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrganization(req, res, next) {
  try {
    const { name, memberCode, category, contactEmail, description } = req.body;

    const existing = await Organization.findOne({ memberCode: memberCode.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ORGANIZATION_EXISTS',
          message: `An organization with member code ${memberCode} already exists.`,
          requestId: req.id,
        },
      });
    }

    const org = new Organization({
      name,
      memberCode: memberCode.trim().toUpperCase(),
      category,
      contactEmail,
      description,
      status: 'active',
    });

    await org.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'ORGANIZATION_REGISTERED',
      resourceType: 'ORGANIZATION',
      resourceId: org._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Registered organization: ${org.name} (${org.memberCode})`,
    });

    res.status(201).json({
      success: true,
      data: { organization: org },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);

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

    const { name, category, contactEmail, status, description } = req.body;
    if (name) org.name = name;
    if (category) org.category = category;
    if (contactEmail) org.contactEmail = contactEmail;
    if (status) {
      org.status = status;
      // Cascade status change to all users associated with this organization
      if (status === 'suspended') {
        await User.updateMany({ organizationId: org._id }, { status: 'suspended' });
      } else if (status === 'active') {
        await User.updateMany({ organizationId: org._id }, { status: 'active' });
      }
    }
    if (description !== undefined) org.description = description;

    await org.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: org._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated organization ${org.memberCode}`,
    });

    res.json({
      success: true,
      data: { organization: org },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PROVIDERS ──────────────────────────────────────────────────────────────

export async function listProviders(req, res, next) {
  try {
    // Return organizations that act as data providers (category != 'Verifier')
    const providers = await Organization.find({ category: { $ne: 'Verifier' } })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { providers },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProvider(req, res, next) {
  try {
    const { name, memberCode, category, contactEmail, description } = req.body;

    const existing = await Organization.findOne({ memberCode: memberCode.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROVIDER_EXISTS',
          message: `A provider with code ${memberCode} already exists.`,
          requestId: req.id,
        },
      });
    }

    const provider = new Organization({
      name,
      memberCode: memberCode.trim().toUpperCase(),
      category: category || 'Education',
      contactEmail,
      description,
      status: 'active',
    });

    await provider.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'PROVIDER_REGISTERED',
      resourceType: 'PROVIDER',
      resourceId: provider._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Registered provider: ${provider.name} (${provider.memberCode})`,
    });

    res.status(201).json({
      success: true,
      data: { provider },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PROVIDER ACCESS APPLICATIONS (ONBOARDING) ──────────────────────────────

export async function createProviderRequest(req, res, next) {
  try {
    const {
      providerName,
      providerCategory,
      officialEmail,
      contactPersonName,
      designation,
      contactPhone,
      website = '',
      serviceOfferings,
      technicalContactEmail = '',
      agreedToTerms,
    } = req.body;

    if (!providerName || !providerCategory || !officialEmail || !contactPersonName || !serviceOfferings) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'All mandatory provider onboarding fields must be supplied.',
          requestId: req.id,
        },
      });
    }

    const referenceNumber = `CI-PRV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const application = new ProviderAccessRequest({
      referenceNumber,
      providerName: providerName.trim(),
      providerCategory,
      officialEmail: officialEmail.trim().toLowerCase(),
      contactPersonName: contactPersonName.trim(),
      designation: designation || 'System Administrator',
      contactPhone: contactPhone || 'N/A',
      website: website.trim(),
      serviceOfferings: serviceOfferings.trim(),
      technicalContactEmail: technicalContactEmail.trim().toLowerCase(),
      agreedToTerms: Boolean(agreedToTerms),
      status: 'PENDING',
    });

    await application.save();

    res.status(201).json({
      success: true,
      data: {
        _id: application._id,
        id: application._id,
        referenceNumber,
        status: 'PENDING',
        message: 'Provider onboarding application submitted successfully. Pending Administrator approval.',
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function listProviderRequests(req, res, next) {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all' && status !== 'undefined' && status !== 'null') query.status = status;

    const [requests, pendingCount, totalCount] = await Promise.all([
      ProviderAccessRequest.find(query)
        .sort({ createdAt: -1 })
        .populate('reviewedBy', 'displayName email')
        .lean(),
      ProviderAccessRequest.countDocuments({ status: 'PENDING' }),
      ProviderAccessRequest.countDocuments(),
    ]);

    res.json({
      success: true,
      data: { requests, pendingCount, totalCount },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewProviderRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewNote, initialPassword } = req.body;

    const allowedStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${allowedStatuses.join(', ')}`,
          requestId: req.id,
        },
      });
    }

    const app = await ProviderAccessRequest.findById(id);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Provider application not found.',
          requestId: req.id,
        },
      });
    }

    // Prevent self-approval
    if (status === 'APPROVED' && req.user.email?.toLowerCase() === app.officialEmail?.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SELF_APPROVAL_FORBIDDEN',
          message: 'Applicants cannot approve their own provider onboarding application.',
          requestId: req.id,
        },
      });
    }

    app.status = status;
    app.reviewNote = reviewNote || '';
    app.reviewedBy = req.user._id;
    app.reviewedAt = new Date();

    let accountDetails = null;

    if (status === 'APPROVED') {
      const passwordToUse = initialPassword && initialPassword.trim().length >= 8
        ? initialPassword.trim()
        : generateSecurePassword();
      const passwordHash = await bcrypt.hash(passwordToUse, 10);

      let providerOrg = app.createdOrganizationId
        ? await Organization.findById(app.createdOrganizationId)
        : null;

      if (!providerOrg) {
        // Create new Provider Organization
        const memberCode = `PRV-${Date.now().toString(36).slice(-4).toUpperCase()}`;
        providerOrg = new Organization({
          name: app.providerName,
          memberCode,
          category: app.providerCategory,
          contactEmail: app.officialEmail,
          description: app.serviceOfferings,
          status: 'active',
        });
        await providerOrg.save();
        app.createdOrganizationId = providerOrg._id;
      }

      // Create or update provider operator user account
      let operatorUser = await User.findOne({ email: app.officialEmail.toLowerCase() });
      const defaultDisplayName = `${app.contactPersonName || 'Operator'} (${app.providerName || 'Provider'})`;
      if (operatorUser) {
        operatorUser.passwordHash = passwordHash;
        operatorUser.role = 'operator';
        operatorUser.organizationId = providerOrg._id;
        operatorUser.providerId = providerOrg._id;
        operatorUser.status = 'active';
        if (!operatorUser.displayName) {
          operatorUser.displayName = defaultDisplayName;
        }
        await operatorUser.save();
      } else {
        operatorUser = new User({
          email: app.officialEmail.toLowerCase(),
          passwordHash,
          displayName: defaultDisplayName,
          role: 'operator',
          organizationId: providerOrg._id,
          providerId: providerOrg._id,
          status: 'active',
        });
        await operatorUser.save();
      }

      accountDetails = {
        email: app.officialEmail,
        initialPassword: passwordToUse,
        memberCode: providerOrg.memberCode,
        providerName: app.providerName,
        operatorName: app.contactPersonName,
      };

      // Provision initial ProviderConfig if services exist for this category
      const matchedServices = await Service.find({
        category: { $regex: new RegExp(app.providerCategory, 'i') },
      });
      for (const svc of matchedServices) {
        await ProviderConfig.findOneAndUpdate(
          { serviceId: svc._id, organizationId: providerOrg._id },
          {
            serviceId: svc._id,
            organizationId: providerOrg._id,
            adapterType: svc.adapterKey,
            environment: 'mock',
            healthState: 'Online',
          },
          { upsert: true, new: true }
        );
      }
    }

    await app.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: `PROVIDER_REQUEST_${status}`,
      resourceType: 'PROVIDER_ACCESS_REQUEST',
      resourceId: app._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Provider application ${app.referenceNumber} set to ${status}. Note: ${reviewNote || 'None'}`,
    });

    res.json({
      success: true,
      data: { request: app, account: accountDetails },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetProviderPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const app = await ProviderAccessRequest.findById(id);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Provider application not found.',
          requestId: req.id,
        },
      });
    }

    const passwordToUse = newPassword && newPassword.trim().length >= 8
      ? newPassword.trim()
      : generateSecurePassword();
    const passwordHash = await bcrypt.hash(passwordToUse, 10);

    let user = await User.findOne({ email: app.officialEmail.toLowerCase() });
    let providerOrg = app.createdOrganizationId ? await Organization.findById(app.createdOrganizationId) : null;

    if (!providerOrg) {
      const memberCode = `PRV-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      providerOrg = new Organization({
        name: app.providerName,
        memberCode,
        category: app.providerCategory,
        contactEmail: app.officialEmail,
        description: app.serviceOfferings,
        status: 'active',
      });
      await providerOrg.save();
      app.createdOrganizationId = providerOrg._id;
      await app.save();
    }

    const defaultDisplayName = `${app.contactPersonName || 'Operator'} (${app.providerName || 'Provider'})`;
    if (!user) {
      user = new User({
        email: app.officialEmail.toLowerCase(),
        passwordHash,
        displayName: defaultDisplayName,
        role: 'operator',
        organizationId: providerOrg._id,
        providerId: providerOrg._id,
        status: 'active',
      });
      await user.save();
    } else {
      user.passwordHash = passwordHash;
      user.status = 'active';
      user.role = 'operator';
      user.organizationId = providerOrg._id;
      user.providerId = providerOrg._id;
      if (!user.displayName) {
        user.displayName = defaultDisplayName;
      }
      await user.save();
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'PROVIDER_PASSWORD_RESET',
      resourceType: 'USER',
      resourceId: user._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Administrator generated/reset credentials for provider operator ${user.email}`,
    });

    res.json({
      success: true,
      data: {
        account: {
          email: user.email,
          initialPassword: passwordToUse,
          newPassword: passwordToUse,
          memberCode: providerOrg.memberCode,
          providerName: app.providerName,
          operatorName: app.contactPersonName,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// ─── ORGANIZATION SERVICE GRANTS ────────────────────────────────────────────

export async function listGrants(req, res, next) {
  try {
    const rawGrants = await OrganizationServiceGrant.find()
      .populate('organizationId', 'name memberCode category status')
      .populate('serviceId', 'name category version status')
      .populate('grantedBy', 'displayName email')
      .sort({ createdAt: -1 })
      .lean();

    // Only return active, valid grants where both organization and service exist
    const grants = rawGrants.filter((g) => g.serviceId && g.organizationId);

    res.json({
      success: true,
      data: { grants },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function createGrant(req, res, next) {
  try {
    const { organizationId, serviceId, allowedPurposes, notes } = req.body;

    const existing = await OrganizationServiceGrant.findOne({ organizationId, serviceId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'GRANT_EXISTS',
          message: 'This organization is already granted access to this service.',
          requestId: req.id,
        },
      });
    }

    const grant = new OrganizationServiceGrant({
      organizationId,
      serviceId,
      allowedPurposes: allowedPurposes || [
        'academic_verification',
        'employment_screening',
        'insurance_verification',
        'identity_verification',
        'business_verification',
      ],
      grantedBy: req.user._id,
      status: 'ACTIVE',
      notes: notes || '',
    });

    await grant.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'SERVICE_GRANT_CREATED',
      resourceType: 'SERVICE_GRANT',
      resourceId: grant._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Granted service ${serviceId} to organization ${organizationId}`,
    });

    res.status(201).json({
      success: true,
      data: { grant },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGrant(req, res, next) {
  try {
    const { id } = req.params;
    const { status, allowedPurposes, notes } = req.body;

    const grant = await OrganizationServiceGrant.findById(id);
    if (!grant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GRANT_NOT_FOUND',
          message: 'Service grant record not found.',
          requestId: req.id,
        },
      });
    }

    if (status) grant.status = status;
    if (allowedPurposes) grant.allowedPurposes = allowedPurposes;
    if (notes !== undefined) grant.notes = notes;

    await grant.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'SERVICE_GRANT_UPDATED',
      resourceType: 'SERVICE_GRANT',
      resourceId: grant._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated service grant status to ${status || grant.status}`,
    });

    res.json({
      success: true,
      data: { grant },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGrant(req, res, next) {
  try {
    const { id } = req.params;
    const grant = await OrganizationServiceGrant.findByIdAndDelete(id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GRANT_NOT_FOUND',
          message: 'Service grant record not found.',
          requestId: req.id,
        },
      });
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'SERVICE_GRANT_REVOKED',
      resourceType: 'SERVICE_GRANT',
      resourceId: id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Revoked service grant ${id}`,
    });

    res.json({
      success: true,
      data: { message: 'Grant successfully revoked.' },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// ─── USER MANAGEMENT ────────────────────────────────────────────────────────

export async function listUsers(req, res, next) {
  try {
    const users = await User.find()
      .populate('organizationId', 'name memberCode category')
      .populate('providerId', 'name memberCode category')
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { users },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, status, displayName, organizationId, providerId, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Platform user not found.',
          requestId: req.id,
        },
      });
    }

    if (role) user.role = role;
    if (status) user.status = status;
    if (displayName) user.displayName = displayName;
    if (organizationId !== undefined) user.organizationId = organizationId;
    if (providerId !== undefined) user.providerId = providerId;
    if (password && typeof password === 'string' && password.trim().length >= 8) {
      user.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'USER_ACCOUNT_UPDATED',
      resourceType: 'USER',
      resourceId: user._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated user ${user.email} (role: ${user.role}, status: ${user.status})`,
    });

    res.json({
      success: true,
      data: { user: { id: user._id, email: user.email, role: user.role, status: user.status } },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// ─── GLOBAL PLATFORM OVERVIEW METRICS ───────────────────────────────────────

export async function getAdminOverviewMetrics(req, res, next) {
  try {
    const [
      activeProviders,
      registeredServices,
      approvedOrgs,
      pendingOrgRequests,
      pendingPrvRequests,
      totalTransactions,
      verifiedTransactions,
      mismatchTransactions,
      notFoundTransactions,
      deniedTransactions,
      recentActivity,
    ] = await Promise.all([
      Organization.countDocuments({ category: { $ne: 'Verifier' }, status: 'active' }),
      Service.countDocuments({ status: { $in: ['active', 'beta'] } }),
      Organization.countDocuments({ status: 'active' }),
      OrganizationAccessRequest.countDocuments({ status: 'PENDING' }),
      ProviderAccessRequest.countDocuments({ status: 'PENDING' }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'verified' }),
      Transaction.countDocuments({ status: 'mismatch' }),
      Transaction.countDocuments({ status: 'not_found' }),
      Transaction.countDocuments({ status: 'denied' }),
      Transaction.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const totalApplicationsPending = pendingOrgRequests + pendingPrvRequests;

    res.json({
      success: true,
      data: {
        metrics: {
          activeProviders,
          registeredServices,
          approvedOrganizations: approvedOrgs,
          pendingApplications: totalApplicationsPending,
          pendingOrgApplications: pendingOrgRequests,
          pendingProviderApplications: pendingPrvRequests,
          totalVerificationRequests: totalTransactions,
          successRate: totalTransactions > 0 ? Math.round((verifiedTransactions / totalTransactions) * 100) : 100,
          distribution: {
            verified: verifiedTransactions,
            mismatch: mismatchTransactions,
            notFound: notFoundTransactions,
            denied: deniedTransactions,
          },
        },
        recentActivity,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

// ─── PROVIDER CONFIG & AUDIT EVENTS ─────────────────────────────────────────

export async function listProviderConfigs(req, res, next) {
  try {
    const configs = await ProviderConfig.find()
      .populate('organizationId', 'name memberCode category')
      .populate('serviceId', 'name category status endpointAlias')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { providerConfigs: configs },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProviderHealth(req, res, next) {
  try {
    const { id } = req.params;
    const { healthState, environment } = req.body;

    const config = await ProviderConfig.findById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONFIG_NOT_FOUND',
          message: 'Provider configuration record not found.',
          requestId: req.id,
        },
      });
    }

    if (healthState) config.healthState = healthState;
    if (environment) config.environment = environment;
    config.lastCheckedAt = new Date();

    await config.save();

    // Cascading health state to Provider Organization and Operator user accounts:
    // If setting to Unavailable (Offline): suspend organization and block operator logins and operations!
    // If setting to Online: reactivate organization and allow operator logins and operations!
    if (config.organizationId) {
      if (healthState === 'Unavailable') {
        await Organization.findByIdAndUpdate(config.organizationId, { status: 'suspended' });
        await ProviderConfig.updateMany({ organizationId: config.organizationId }, { healthState: 'Unavailable', lastCheckedAt: new Date() });
        await User.updateMany(
          { $or: [{ organizationId: config.organizationId }, { providerId: config.organizationId }] },
          { status: 'suspended' }
        );
      } else if (healthState === 'Online') {
        await Organization.findByIdAndUpdate(config.organizationId, { status: 'active' });
        await ProviderConfig.updateMany({ organizationId: config.organizationId }, { healthState: 'Online', lastCheckedAt: new Date() });
        await User.updateMany(
          { $or: [{ organizationId: config.organizationId }, { providerId: config.organizationId }] },
          { status: 'active' }
        );
      }
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: healthState === 'Unavailable' ? 'PROVIDER_SET_OFFLINE' : 'PROVIDER_SET_ONLINE',
      resourceType: 'PROVIDER_CONFIG',
      resourceId: config._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated health state to '${healthState}' with cascading organization and operator status sync`,
    });

    res.json({
      success: true,
      data: { providerConfig: config },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAuditEvents(req, res, next) {
  try {
    const { actorEmail, action, resourceType, outcome, page = 1, limit = 20 } = req.query;

    const query = {};
    if (actorEmail) query.actorEmail = { $regex: actorEmail.trim(), $options: 'i' };
    if (action && action !== 'all') query.action = action;
    if (resourceType && resourceType !== 'all') query.resourceType = resourceType;
    if (outcome && outcome !== 'all') query.outcome = outcome;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      AuditEvent.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      AuditEvent.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        auditEvents: events,
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
