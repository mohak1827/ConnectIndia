import { Service } from '../models/Service.js';
import { Organization } from '../models/Organization.js';
import { logAuditEvent } from '../services/audit.service.js';
import { educationAdapter } from '../providers/education.adapter.js';

export async function listServices(req, res, next) {
  try {
    const { search, category, status, page = 1, limit = 12 } = req.query;

    const filters = [];
    if (search && search.trim()) {
      filters.push({
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
          { endpointAlias: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }
    if (category && category !== 'all') {
      filters.push({
        $or: [
          { category: { $regex: category.trim(), $options: 'i' } },
          { name: { $regex: category.trim(), $options: 'i' } },
          { adapterKey: { $regex: category.trim(), $options: 'i' } },
        ],
      });
    }
    if (status && status !== 'all') {
      filters.push({ status: status.toLowerCase() });
    }

    const query = filters.length > 0 ? { $and: filters } : {};

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      Service.find(query)
        .populate('organizationId', 'name memberCode category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Service.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        services,
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

export async function getServiceById(req, res, next) {
  try {
    const service = await Service.findById(req.params.id)
      .populate('organizationId', 'name memberCode category contactEmail')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'Requested service does not exist in registry.',
          requestId: req.id,
        },
      });
    }

    res.json({
      success: true,
      data: { service },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function sandboxTest(req, res, next) {
  try {
    const { id } = req.params;
    const service = await Service.findById(id).populate('organizationId');

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'Service not found.',
          requestId: req.id,
        },
      });
    }

    if (!service.isMock) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SANDBOX_NOT_ALLOWED',
          message: 'Direct sandbox invocation is only allowed for designated mock services.',
          requestId: req.id,
        },
      });
    }

    const testPayload = req.body || service.exampleRequest;
    let mockResult;

    if (service.adapterKey === 'education_adapter') {
      mockResult = await educationAdapter.verify({
        rollNumber: testPayload.rollNumber || 'CBSE-2023-90812',
        examYear: testPayload.examYear || 2023,
        candidateName: testPayload.candidateName || 'Aarav Sharma',
        course: testPayload.course || 'Class XII Senior Secondary Examination',
      });
    } else {
      mockResult = {
        status: 'verified',
        providerName: service.organizationId?.name || 'Mock Provider',
        latencyMs: 95,
        explanation: 'Simulated sandbox test completed successfully with deterministic sample data.',
        mockDataEcho: testPayload,
      };
    }

    res.json({
      success: true,
      data: {
        executedVia: 'ConnectIndia Backend Gateway (Safe Mock Sandbox)',
        service: service.name,
        result: mockResult,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function createService(req, res, next) {
  try {
    const { name, organizationId, category, description, endpointAlias, httpMethod, version, adapterKey, authRequirement, requiredFields, exampleRequest, exampleResponse } = req.body;

    // Check permissions / org ownership if operator
    if (req.user.role === 'operator') {
      if (!req.user.organizationId || req.user.organizationId.toString() !== organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ORG',
            message: 'Provider operators can only register services under their assigned organization.',
            requestId: req.id,
          },
        });
      }
    }

    const newService = new Service({
      name,
      organizationId,
      category,
      description,
      endpointAlias,
      httpMethod: httpMethod || 'POST',
      version: version || 'v1.0',
      adapterKey: adapterKey || 'custom_adapter',
      authRequirement: authRequirement || 'JWT_BEARER',
      isMock: true,
      requiredFields: requiredFields || [],
      exampleRequest: exampleRequest || {},
      exampleResponse: exampleResponse || {},
    });

    await newService.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'SERVICE_CREATED',
      resourceType: 'SERVICE',
      resourceId: newService._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Created service: ${newService.name}`,
    });

    res.status(201).json({
      success: true,
      data: { service: newService },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'Service not found.',
          requestId: req.id,
        },
      });
    }

    // Role check: Admin can update any; operator can only update their organization's service
    if (req.user.role === 'operator') {
      if (!req.user.organizationId || req.user.organizationId.toString() !== service.organizationId.toString()) {
        await logAuditEvent({
          actorId: req.user._id,
          actorEmail: req.user.email,
          action: 'SERVICE_UPDATE_DENIED',
          resourceType: 'SERVICE',
          resourceId: service._id,
          outcome: 'DENIED',
          requestId: req.id,
          details: 'Operator attempted to edit another organization service',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ORG',
            message: 'Provider operator cannot edit another organization’s service.',
            requestId: req.id,
          },
        });
      }
    }

    const allowedUpdates = ['name', 'description', 'status', 'version', 'inputSchemaSummary', 'requiredFields', 'exampleRequest', 'exampleResponse'];
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        service[key] = req.body[key];
      }
    }

    await service.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'SERVICE_UPDATED',
      resourceType: 'SERVICE',
      resourceId: service._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Updated metadata for: ${service.name}`,
    });

    res.json({
      success: true,
      data: { service },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
