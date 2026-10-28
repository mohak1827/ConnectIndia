import mongoose from 'mongoose';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { InsurancePolicySample } from '../models/InsurancePolicySample.js';
import { IdentityDocumentSample } from '../models/IdentityDocumentSample.js';
import { EmploymentRecordSample } from '../models/EmploymentRecordSample.js';
import { BusinessRegistrationSample } from '../models/BusinessRegistrationSample.js';
import { Service } from '../models/Service.js';
import { Organization } from '../models/Organization.js';
import { Transaction } from '../models/Transaction.js';
import { ImportJob } from '../models/ImportJob.js';
import { ProviderConfig } from '../models/ProviderConfig.js';
import { logAuditEvent } from '../services/audit.service.js';

function getModelAndMeta(category) {
  const cat = (category || '').toLowerCase();
  switch (cat) {
    case 'insurance':
      return {
        model: InsurancePolicySample,
        idField: 'policyNumber',
        category: 'Insurance',
        defaultStatus: 'ACTIVE',
      };
    case 'identity':
      return {
        model: IdentityDocumentSample,
        idField: 'documentRef',
        category: 'Identity',
        defaultStatus: 'VALID',
      };
    case 'employment':
      return {
        model: EmploymentRecordSample,
        idField: 'employeeRef',
        category: 'Employment',
        defaultStatus: 'CURRENTLY_EMPLOYED',
      };
    case 'business':
      return {
        model: BusinessRegistrationSample,
        idField: 'registrationNumber',
        category: 'Business',
        defaultStatus: 'ACTIVE',
      };
    case 'education':
    default:
      return {
        model: AcademicRecord,
        idField: 'rollNumber',
        category: 'Education',
        defaultStatus: 'PASS',
      };
  }
}

async function resolveProviderOrg(user) {
  const orgId = user.providerId || user.organizationId;
  if (!orgId) return null;
  return Organization.findById(orgId).lean();
}

/**
 * GET /api/v1/provider/overview
 * Returns real database counts for the provider operator's dashboard
 */
export async function getProviderOverview(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;

    if (!providerOrgId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PROVIDER_ORG_REQUIRED',
          message: 'No associated provider organization found for this operator account.',
          requestId: req.id,
        },
      });
    }

    const { model, category } = getModelAndMeta(providerOrg.category);

    // Count records owned by this provider org (or without organizationId if seeded legacy)
    const [
      recordCount,
      servicesCount,
      transactionCount,
      recentImports,
      configs,
    ] = await Promise.all([
      model.countDocuments({
        $or: [{ organizationId: providerOrgId }, { organizationId: null }],
      }),
      Service.countDocuments({ organizationId: providerOrgId, status: 'active' }),
      Transaction.countDocuments({ providerId: providerOrgId }),
      ImportJob.find({ providerId: providerOrgId }).sort({ createdAt: -1 }).limit(5).lean(),
      ProviderConfig.find({ organizationId: providerOrgId }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        provider: {
          name: providerOrg.name,
          memberCode: providerOrg.memberCode,
          category: providerOrg.category,
        },
        metrics: {
          recordCount,
          activeServices: servicesCount,
          totalTransactions: transactionCount,
          recentImportsCount: recentImports.length,
          adapterStatus: configs[0]?.healthState || 'Online',
          environment: configs[0]?.environment || 'mock',
        },
        recentImports,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/services
 * Returns services exposed by this provider
 */
export async function getProviderServices(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;

    const services = await Service.find({ organizationId: providerOrgId }).lean();
    res.json({
      success: true,
      data: { services },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/registry
 * List, search, filter, and paginate registry records for the operator
 */
export async function listRegistryRecords(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const isOperator = req.user.role === 'operator' || req.user.role === 'provider_operator';
    const requestedCategory = isOperator && providerOrg?.category
      ? providerOrg.category
      : (req.query.category || providerOrg?.category || 'Education');
    const { model, idField, category } = getModelAndMeta(requestedCategory);

    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {
      $or: [{ organizationId: providerOrgId }, { organizationId: null }],
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      if (category === 'Education') {
        query.$and = [
          {
            $or: [
              { rollNumber: regex },
              { candidateName: regex },
              { institution: regex },
              { course: regex },
            ],
          },
        ];
      } else if (category === 'Insurance') {
        query.$and = [
          {
            $or: [
              { policyNumber: regex },
              { policyHolderName: regex },
              { insurerName: regex },
            ],
          },
        ];
      } else if (category === 'Identity') {
        query.$and = [
          {
            $or: [
              { documentRef: regex },
              { holderName: regex },
              { issuingAuthority: regex },
            ],
          },
        ];
      } else if (category === 'Employment') {
        query.$and = [
          {
            $or: [
              { employeeRef: regex },
              { employeeName: regex },
              { employerName: regex },
              { designation: regex },
            ],
          },
        ];
      } else if (category === 'Business') {
        query.$and = [
          {
            $or: [
              { registrationNumber: regex },
              { businessName: regex },
              { gstinNumber: regex },
            ],
          },
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      model.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      model.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        category,
        idField,
        records,
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

/**
 * POST /api/v1/provider/registry
 * Create a new authoritative record in provider's registry
 */
export async function createRegistryRecord(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const isOperator = req.user.role === 'operator' || req.user.role === 'provider_operator';
    const category = isOperator && providerOrg?.category
      ? providerOrg.category
      : (req.body.category || providerOrg?.category || 'Education');
    const { model, idField } = getModelAndMeta(category);

    const recordData = { ...req.body };
    delete recordData.category;
    recordData.organizationId = providerOrgId;

    // Check duplicate primary identifier
    const identifierVal = recordData[idField];
    if (!identifierVal) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'IDENTIFIER_REQUIRED',
          message: `The primary identifier '${idField}' is required.`,
          requestId: req.id,
        },
      });
    }

    const existing = await model.findOne({ [idField]: identifierVal.toString().trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_IDENTIFIER',
          message: `A record with ${idField} '${identifierVal}' already exists.`,
          requestId: req.id,
        },
      });
    }

    const newRecord = new model(recordData);
    await newRecord.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'REGISTRY_RECORD_CREATED',
      resourceType: 'REGISTRY_RECORD',
      resourceId: newRecord._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Created ${category} record ${identifierVal} in provider registry.`,
    });

    res.status(201).json({
      success: true,
      data: { record: newRecord },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/registry/:id
 * Retrieve a single record
 */
export async function getRegistryRecord(req, res, next) {
  try {
    const { id } = req.params;
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const category = req.query.category || providerOrg?.category || 'Education';
    const { model } = getModelAndMeta(category);

    const record = await model.findById(id).lean();
    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Registry record not found.',
          requestId: req.id,
        },
      });
    }

    if (req.user.role === 'operator' && record.organizationId && record.organizationId.toString() !== providerOrgId?.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_RECORD',
          message: 'Access denied: You cannot access another provider’s data record.',
          requestId: req.id,
        },
      });
    }

    res.json({
      success: true,
      data: { record },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/provider/registry/:id
 * Update an existing registry record
 */
export async function updateRegistryRecord(req, res, next) {
  try {
    const { id } = req.params;
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const category = req.body.category || req.query.category || providerOrg?.category || 'Education';
    const { model, idField } = getModelAndMeta(category);

    const record = await model.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Registry record not found.',
          requestId: req.id,
        },
      });
    }

    if (req.user.role === 'operator' && record.organizationId && record.organizationId.toString() !== providerOrgId?.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_RECORD',
          message: 'Access denied: You cannot modify another provider’s data record.',
          requestId: req.id,
        },
      });
    }

    // Apply updates
    const updates = { ...req.body };
    delete updates._id;
    delete updates.createdAt;
    delete updates.category;

    Object.assign(record, updates);
    await record.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'REGISTRY_RECORD_UPDATED',
      resourceType: 'REGISTRY_RECORD',
      resourceId: record._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated ${category} record ${record[idField]} in provider registry.`,
    });

    res.json({
      success: true,
      data: { record },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/provider/registry/:id
 * Delete or deactivate record
 */
export async function deleteRegistryRecord(req, res, next) {
  try {
    const { id } = req.params;
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const isOperator = req.user.role === 'operator' || req.user.role === 'provider_operator';
    const category = isOperator && providerOrg?.category
      ? providerOrg.category
      : (req.query.category || providerOrg?.category || 'Education');
    const { model, idField } = getModelAndMeta(category);

    const record = await model.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Registry record not found.',
          requestId: req.id,
        },
      });
    }

    if (req.user.role === 'operator' && record.organizationId && record.organizationId.toString() !== providerOrgId?.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_RECORD',
          message: 'Access denied: You cannot delete another provider’s data record.',
          requestId: req.id,
        },
      });
    }

    const identifierVal = record[idField];
    await model.findByIdAndDelete(id);

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'REGISTRY_RECORD_DELETED',
      resourceType: 'REGISTRY_RECORD',
      resourceId: id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Deleted ${category} record ${identifierVal} from provider registry.`,
    });

    res.json({
      success: true,
      data: { message: `Record ${identifierVal} deleted successfully.` },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/provider/registry/import
 * Validated CSV / JSON row bulk import with duplicate detection and row error tracking
 */
export async function importRegistryCsv(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const isOperator = req.user.role === 'operator' || req.user.role === 'provider_operator';
    const category = isOperator && providerOrg?.category
      ? providerOrg.category
      : (req.body.category || providerOrg?.category || 'Education');
    const { rows = [], fileName = 'bulk_records.csv' } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_IMPORT',
          message: 'No record rows supplied for import.',
          requestId: req.id,
        },
      });
    }

    const { model, idField } = getModelAndMeta(category);

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;
      const rawId = row[idField];

      if (!rawId) {
        failedCount++;
        errors.push({
          row: rowNum,
          identifier: 'UNKNOWN',
          reason: `Missing mandatory identifier '${idField}'.`,
        });
        continue;
      }

      const identifier = String(rawId).trim().toUpperCase();

      try {
        const existing = await model.findOne({ [idField]: identifier });
        if (existing) {
          // Update existing record
          const updateData = { ...row, organizationId: providerOrgId };
          delete updateData._id;
          Object.assign(existing, updateData);
          await existing.save();
          updatedCount++;
        } else {
          // Insert new record
          const newDoc = new model({ ...row, [idField]: identifier, organizationId: providerOrgId });
          await newDoc.save();
          insertedCount++;
        }
      } catch (err) {
        failedCount++;
        errors.push({
          row: rowNum,
          identifier,
          reason: err.message || 'Validation error while saving row.',
        });
      }
    }

    const status = failedCount === 0 ? 'COMPLETED' : failedCount === rows.length ? 'FAILED' : 'PARTIALLY_FAILED';
    const jobId = `IMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const job = new ImportJob({
      jobId,
      providerId: providerOrgId,
      serviceCategory: category,
      uploadedBy: req.user._id,
      fileName,
      totalRows: rows.length,
      insertedCount,
      updatedCount,
      skippedCount,
      failedCount,
      status,
      errors: errors.slice(0, 50),
    });

    await job.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'BULK_IMPORT_PROCESSED',
      resourceType: 'IMPORT_JOB',
      resourceId: job._id,
      outcome: status === 'FAILED' ? 'FAILURE' : 'SUCCESS',
      requestId: req.id,
      details: `Bulk import ${jobId}: ${insertedCount} inserted, ${updatedCount} updated, ${failedCount} failed of ${rows.length} rows.`,
    });

    res.json({
      success: true,
      data: {
        jobId,
        totalRows: rows.length,
        insertedCount,
        updatedCount,
        skippedCount,
        failedCount,
        status,
        errors,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/registry/export
 * Export provider records as CSV
 */
export async function exportRegistryCsv(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const isOperator = req.user.role === 'operator' || req.user.role === 'provider_operator';
    const category = isOperator && providerOrg?.category
      ? providerOrg.category
      : (req.query.category || providerOrg?.category || 'Education');
    const { model, idField } = getModelAndMeta(category);

    const records = await model
      .find({ $or: [{ organizationId: providerOrgId }, { organizationId: null }] })
      .limit(1000)
      .lean();

    if (records.length === 0) {
      return res.status(200).send('No records found for export');
    }

    // Dynamic headers based on keys in first record
    const excludeKeys = ['_id', '__v', 'organizationId'];
    const keys = Object.keys(records[0]).filter((k) => !excludeKeys.includes(k));

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headerRow = keys.map(escapeCsv).join(',');
    const rows = records.map((rec) => keys.map((k) => escapeCsv(rec[k])).join(','));
    const csvContent = [headerRow, ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${category.toLowerCase()}-registry-${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/transactions
 * Transactions scoped to this provider
 */
export async function getProviderTransactions(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;
    const { status, page = 1, limit = 15 } = req.query;

    const query = { providerId: providerOrgId };
    if (status && status !== 'all') query.status = status;

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

/**
 * GET /api/v1/provider/history
 * Change and import history for this provider
 */
export async function getProviderHistory(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;

    const [imports, recentAudit] = await Promise.all([
      ImportJob.find({ providerId: providerOrgId }).sort({ createdAt: -1 }).limit(10).lean(),
      Transaction.find({ providerId: providerOrgId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      success: true,
      data: {
        imports,
        recentActivity: recentAudit,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/health
 * Adapter health check for this provider
 */
export async function getProviderAdapterHealth(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    const providerOrgId = providerOrg?._id || req.user.organizationId;

    const configs = await ProviderConfig.find({ organizationId: providerOrgId })
      .populate('serviceId', 'name category status')
      .lean();

    res.json({
      success: true,
      data: {
        configs,
        isSimulated: true,
        disclaimer: 'Mock provider adapter telemetry for college evaluation prototype.',
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/provider/profile
 * Returns detailed profile of the authenticated operator's provider organization
 */
export async function getProviderProfile(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    if (!providerOrg) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROVIDER_NOT_FOUND',
          message: 'No associated provider organization found.',
          requestId: req.id,
        },
      });
    }

    const { model } = getModelAndMeta(providerOrg.category);
    const [recordCount, servicesCount, transactionCount, recentImports] = await Promise.all([
      model.countDocuments({ $or: [{ organizationId: providerOrg._id }, { organizationId: null }] }),
      Service.countDocuments({ organizationId: providerOrg._id, status: 'active' }),
      Transaction.countDocuments({ providerId: providerOrg._id }),
      ImportJob.countDocuments({ providerId: providerOrg._id }),
    ]);

    res.json({
      success: true,
      data: {
        provider: {
          id: providerOrg._id,
          _id: providerOrg._id,
          name: providerOrg.name,
          memberCode: providerOrg.memberCode,
          category: providerOrg.category,
          status: providerOrg.status,
          contactEmail: providerOrg.contactEmail,
          description: providerOrg.description || '',
          createdAt: providerOrg.createdAt,
          updatedAt: providerOrg.updatedAt,
        },
        metrics: {
          recordCount,
          activeServices: servicesCount,
          totalTransactions: transactionCount,
          totalImports: recentImports,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/provider/profile
 * Allows an authorized operator to update their provider's contact details
 */
export async function updateProviderProfile(req, res, next) {
  try {
    const providerOrg = await resolveProviderOrg(req.user);
    if (!providerOrg) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROVIDER_NOT_FOUND',
          message: 'No associated provider organization found.',
          requestId: req.id,
        },
      });
    }

    const { contactEmail, description } = req.body;
    const orgDoc = await Organization.findById(providerOrg._id);
    if (!orgDoc) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROVIDER_NOT_FOUND', message: 'Provider entity not found in database.', requestId: req.id },
      });
    }

    if (contactEmail && typeof contactEmail === 'string' && contactEmail.includes('@')) {
      orgDoc.contactEmail = contactEmail.toLowerCase().trim();
    }
    if (description !== undefined && typeof description === 'string') {
      orgDoc.description = description.trim();
    }

    await orgDoc.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'PROVIDER_PROFILE_UPDATED',
      resourceType: 'PROVIDER',
      resourceId: orgDoc._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated provider profile for: ${orgDoc.name} (${orgDoc.memberCode})`,
    });

    res.json({
      success: true,
      message: 'Provider profile updated successfully.',
      data: {
        provider: {
          id: orgDoc._id,
          _id: orgDoc._id,
          name: orgDoc.name,
          memberCode: orgDoc.memberCode,
          category: orgDoc.category,
          status: orgDoc.status,
          contactEmail: orgDoc.contactEmail,
          description: orgDoc.description,
          createdAt: orgDoc.createdAt,
          updatedAt: orgDoc.updatedAt,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
