import mongoose from 'mongoose';
import { Service } from '../models/Service.js';
import { Organization } from '../models/Organization.js';
import { Transaction } from '../models/Transaction.js';
import { ProviderConfig } from '../models/ProviderConfig.js';
import { OrganizationAccessRequest } from '../models/OrganizationAccessRequest.js';
import { ProviderAccessRequest } from '../models/ProviderAccessRequest.js';
import { OrganizationServiceGrant } from '../models/OrganizationServiceGrant.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { ImportJob } from '../models/ImportJob.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { InsurancePolicySample } from '../models/InsurancePolicySample.js';
import { IdentityDocumentSample } from '../models/IdentityDocumentSample.js';
import { EmploymentRecordSample } from '../models/EmploymentRecordSample.js';
import { BusinessRegistrationSample } from '../models/BusinessRegistrationSample.js';

function getProviderModel(category) {
  const cat = (category || '').toLowerCase();
  switch (cat) {
    case 'insurance':
      return InsurancePolicySample;
    case 'identity':
      return IdentityDocumentSample;
    case 'employment':
      return EmploymentRecordSample;
    case 'business':
      return BusinessRegistrationSample;
    case 'education':
    default:
      return AcademicRecord;
  }
}

export async function getDashboardSummary(req, res, next) {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    const userOrgId = req.user.organizationId;

    // Filter transaction metrics strictly based on role and organization
    let transactionQuery = {};
    if (userRole === 'verifier' || userRole === 'citizen') {
      if (userOrgId) {
        transactionQuery.consumerOrgId = new mongoose.Types.ObjectId(userOrgId);
      } else {
        transactionQuery.actorId = userId;
      }
    } else if (userRole === 'operator') {
      if (userOrgId) {
        transactionQuery.providerId = new mongoose.Types.ObjectId(userOrgId);
      }
    }
    // admin gets platform-wide transactionQuery = {}

    const [
      activeServicesCount,
      totalOrgsCount,
      totalTransactions,
      successfulTransactions,
      mismatchTransactions,
      notFoundTransactions,
      unavailableTransactions,
      deniedTransactions,
      latencyAgg,
    ] = await Promise.all([
      Service.countDocuments({ status: { $in: ['active', 'beta'] } }),
      Organization.countDocuments({ status: 'active' }),
      Transaction.countDocuments(transactionQuery),
      Transaction.countDocuments({ ...transactionQuery, status: 'verified' }),
      Transaction.countDocuments({ ...transactionQuery, status: 'mismatch' }),
      Transaction.countDocuments({ ...transactionQuery, status: 'not_found' }),
      Transaction.countDocuments({ ...transactionQuery, status: 'unavailable' }),
      Transaction.countDocuments({ ...transactionQuery, status: 'denied' }),
      Transaction.aggregate([
        { $match: transactionQuery },
        { $group: { _id: null, avgLatency: { $avg: '$latencyMs' } } },
      ]),
    ]);

    const successRate = totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 0;
    const avgLatencyMs = latencyAgg.length > 0 && latencyAgg[0].avgLatency ? Math.round(latencyAgg[0].avgLatency) : 0;

    let roleMetrics = {};

    if (userRole === 'admin') {
      const [
        pendingOrgRequests,
        pendingProvRequests,
        totalAllOrgs,
        approvedOrgs,
        suspendedOrgs,
        activeProviders,
        suspendedProviders,
        totalProviders,
        totalAudits,
        onlineConfigs,
        degradedConfigs,
        unavailableConfigs,
      ] = await Promise.all([
        OrganizationAccessRequest.countDocuments({ status: 'PENDING' }),
        ProviderAccessRequest.countDocuments({ status: 'PENDING' }),
        Organization.countDocuments(),
        Organization.countDocuments({ status: 'active' }),
        Organization.countDocuments({ status: 'suspended' }),
        Organization.countDocuments({ category: { $ne: 'Verifier' }, status: 'active' }),
        Organization.countDocuments({ category: { $ne: 'Verifier' }, status: 'suspended' }),
        Organization.countDocuments({ category: { $ne: 'Verifier' } }),
        AuditEvent.countDocuments(),
        ProviderConfig.countDocuments({ healthState: 'Online' }),
        ProviderConfig.countDocuments({ healthState: 'Degraded' }),
        ProviderConfig.countDocuments({ healthState: 'Unavailable' }),
      ]);

      roleMetrics = {
        totalOrganizations: totalAllOrgs,
        approvedOrganizations: approvedOrgs,
        suspendedOrganizations: suspendedOrgs,
        pendingOrgRequests,
        totalProviders,
        activeProviders,
        suspendedProviders,
        pendingProviderRequests: pendingProvRequests,
        totalAuditEvents: totalAudits,
        providerHealthSummary: {
          online: onlineConfigs,
          degraded: degradedConfigs,
          unavailable: unavailableConfigs,
        },
      };
    } else if (userRole === 'verifier') {
      const [assignedServicesCount, orgDoc] = await Promise.all([
        userOrgId ? OrganizationServiceGrant.countDocuments({ organizationId: userOrgId, status: 'ACTIVE' }) : 0,
        userOrgId ? Organization.findById(userOrgId).lean() : null,
      ]);

      roleMetrics = {
        assignedServices: assignedServicesCount,
        organizationStatus: orgDoc?.status || 'active',
        organizationName: orgDoc?.name || req.user.displayName || 'Authorized Verifier',
        memberCode: orgDoc?.memberCode || 'INDEP-01',
      };
    } else if (userRole === 'operator') {
      const providerOrg = userOrgId ? await Organization.findById(userOrgId).lean() : null;
      const model = getProviderModel(providerOrg?.category);

      const [recordCount, providerServicesCount, totalImports, failedImports, config] = await Promise.all([
        userOrgId ? model.countDocuments({ $or: [{ organizationId: userOrgId }, { organizationId: null }] }) : 0,
        userOrgId ? Service.countDocuments({ organizationId: userOrgId, status: 'active' }) : 0,
        userOrgId ? ImportJob.countDocuments({ providerId: userOrgId }) : 0,
        userOrgId ? ImportJob.countDocuments({ providerId: userOrgId, status: 'FAILED' }) : 0,
        userOrgId ? ProviderConfig.findOne({ organizationId: userOrgId }).lean() : null,
      ]);

      roleMetrics = {
        registryRecordCount: recordCount,
        activeServices: providerServicesCount,
        totalImports,
        failedImports,
        adapterStatus: config?.healthState || 'Online',
        adapterEnvironment: config?.environment || 'mock',
        providerName: providerOrg?.name || 'Authoritative Provider',
        providerCategory: providerOrg?.category || 'Education',
      };
    }

    const responseData = {
      role: userRole,
      metrics: {
        activeServices: activeServicesCount,
        totalRequests: totalTransactions,
        successRatePercent: successRate,
        averageLatencyMs: avgLatencyMs,
        outcomes: {
          verified: successfulTransactions,
          mismatch: mismatchTransactions,
          notFound: notFoundTransactions,
          unavailable: unavailableTransactions,
          denied: deniedTransactions,
        },
        ...roleMetrics,
      },
    };

    res.json({
      success: true,
      data: responseData,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicStats(req, res, next) {
  try {
    const [
      servicesCount,
      providersCount,
      orgsCount,
      academicCount,
      insuranceCount,
      identityCount,
      employmentCount,
      businessCount,
      totalTransactions,
      verifiedTransactions,
    ] = await Promise.all([
      Service.countDocuments({ status: { $in: ['active', 'beta'] } }),
      Organization.countDocuments({ category: { $ne: 'Verifier' }, status: 'active' }),
      Organization.countDocuments({ status: 'active' }),
      AcademicRecord.countDocuments(),
      InsurancePolicySample.countDocuments(),
      IdentityDocumentSample.countDocuments(),
      EmploymentRecordSample.countDocuments(),
      BusinessRegistrationSample.countDocuments(),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'verified' }),
    ]);

    const totalRecords = academicCount + insuranceCount + identityCount + employmentCount + businessCount;

    res.json({
      success: true,
      data: {
        servicesCount,
        providersCount,
        organizationsCount: orgsCount,
        registryRecordsCount: totalRecords,
        totalTransactions,
        verifiedTransactions,
        successRatePercent: totalTransactions > 0 ? Math.round((verifiedTransactions / totalTransactions) * 100) : 0,
        isSimulated: true,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardActivity(req, res, next) {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    const userOrgId = req.user.organizationId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    let query = {};
    if (userRole === 'citizen' || userRole === 'verifier') {
      query.actorId = userId;
    } else if (userRole === 'operator' && userOrgId) {
      query.providerId = userOrgId;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('requestId serviceName providerName status latencyMs createdAt summary')
      .lean();

    res.json({
      success: true,
      data: {
        recentActivity: transactions,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProviderHealth(req, res, next) {
  try {
    const configs = await ProviderConfig.find()
      .populate('organizationId', 'name memberCode category')
      .populate('serviceId', 'name category status')
      .lean();

    const healthList = configs.map((c) => ({
      id: c._id,
      organizationName: c.organizationId?.name || 'Unknown Provider',
      memberCode: c.organizationId?.memberCode || 'N/A',
      serviceName: c.serviceId?.name || 'General Endpoint',
      category: c.organizationId?.category || 'General',
      adapterType: c.adapterType,
      environment: c.environment,
      healthState: c.healthState,
      latencyAvgMs: c.latencyAvgMs,
      lastCheckedAt: c.lastCheckedAt,
      isSimulated: true,
    }));

    res.json({
      success: true,
      data: {
        providers: healthList,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
