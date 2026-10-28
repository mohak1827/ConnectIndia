import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { ProviderConfig } from '../models/ProviderConfig.js';

export function normalizeRole(role) {
  if (!role) return 'verifier';
  const lower = role.toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('operator')) return 'operator';
  return 'verifier';
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication token is required to access this resource.',
          requestId: req.id,
        },
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session has expired or token is invalid. Please sign in again.',
          requestId: req.id,
        },
      });
    }

    const user = await User.findById(decoded.userId).populate('organizationId').lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account no longer exists. Please sign in again.',
          requestId: req.id,
        },
      });
    }

    if (user.organizationId && (user.organizationId.status === 'suspended' || user.organizationId.status === 'inactive')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_SUSPENDED',
          message: `Access denied. Organization '${user.organizationId.name}' has been suspended.`,
          requestId: req.id,
        },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive or has been suspended. Please contact platform administration.',
          requestId: req.id,
        },
      });
    }

    // Block provider operator operations if their authoritative provider is Offline / Unavailable
    if (user.role === 'operator') {
      const orgId = user.organizationId?._id || user.organizationId || user.providerId;
      if (orgId) {
        const offlineConfig = await ProviderConfig.findOne({ organizationId: orgId, healthState: 'Unavailable' });
        if (offlineConfig) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PROVIDER_OFFLINE',
              message: 'Access denied. Your authoritative provider has been set Offline by Platform Administration. Provider operations are disabled until reactivated.',
              requestId: req.id,
            },
          });
        }
      }
    }

    const normalizedRole = normalizeRole(user.role);

    // Attach role and permissions
    const roleDoc = await Role.findOne({
      key: { $in: [user.role, normalizedRole] },
    }).lean();
    const permissions = roleDoc ? roleDoc.permissions : [];

    const effectiveOrgId = user.organizationId?._id?.toString() || user.providerId?.toString() || null;

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: normalizedRole,
      rawRole: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      organizationId: effectiveOrgId,
      providerId: user.providerId?.toString() || effectiveOrgId,
      organization: user.organizationId || null,
      permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
}
