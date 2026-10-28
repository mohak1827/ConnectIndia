import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { ProviderConfig } from '../models/ProviderConfig.js';
import { Organization } from '../models/Organization.js';
import { env } from '../config/env.js';
import { logAuditEvent } from '../services/audit.service.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Both email and password are required.',
          requestId: req.id,
        },
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const lookupQuery =
      cleanEmail === 'verifier@delhiuniversity.ac.in' || cleanEmail === 'verifier@delhiuniv.ac.in'
        ? { email: { $in: ['verifier@delhiuniversity.ac.in', 'verifier@delhiuniv.ac.in'] } }
        : { email: cleanEmail };

    const user = await User.findOne(lookupQuery).populate('organizationId');

    if (!user) {
      await logAuditEvent({
        actorEmail: cleanEmail,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'AUTH',
        outcome: 'FAILURE',
        requestId: req.id,
        details: 'User email not found',
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password combination.',
          requestId: req.id,
        },
      });
    }

    if (user.organizationId && (user.organizationId.status === 'suspended' || user.organizationId.status === 'inactive')) {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_BLOCKED',
        resourceType: 'AUTH',
        outcome: 'DENIED',
        requestId: req.id,
        details: `Blocked login: Associated organization ${user.organizationId.name} (${user.organizationId.memberCode}) is ${user.organizationId.status}`,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_SUSPENDED',
          message: `Your organization (${user.organizationId.name}) has been suspended. Access to ConnectIndia is restricted.`,
          requestId: req.id,
        },
      });
    }

    // Check if Authoritative Provider operator has been set Offline / Unavailable
    const effectiveOrgId = user.organizationId?._id || user.organizationId || user.providerId;
    if (user.role === 'operator' && effectiveOrgId) {
      const offlineConfig = await ProviderConfig.findOne({ organizationId: effectiveOrgId, healthState: 'Unavailable' });
      if (offlineConfig) {
        await logAuditEvent({
          actorId: user._id,
          actorEmail: user.email,
          action: 'AUTH_LOGIN_BLOCKED',
          resourceType: 'AUTH',
          outcome: 'DENIED',
          requestId: req.id,
          details: 'Blocked login: Authoritative provider adapter is Offline / Unavailable',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'PROVIDER_OFFLINE',
            message: 'Access denied. Your data provider has been set Offline by Platform Administration. Login and provider operations are disabled until reactivated.',
            requestId: req.id,
          },
        });
      }
    }

    if (user.status !== 'active') {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_BLOCKED',
        resourceType: 'AUTH',
        outcome: 'DENIED',
        requestId: req.id,
        details: `Blocked login: User account status is ${user.status}`,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated or suspended. Please contact platform administration.',
          requestId: req.id,
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'AUTH',
        outcome: 'FAILURE',
        requestId: req.id,
        details: 'Password mismatch',
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password combination.',
          requestId: req.id,
        },
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Fetch role permissions
    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc ? roleDoc.permissions : [];

    // Issue token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        organizationId: user.organizationId?._id || null,
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Successful login as role: ${user.role}`,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          organization: user.organizationId
            ? {
                id: user.organizationId._id,
                _id: user.organizationId._id,
                name: user.organizationId.name,
                memberCode: user.organizationId.memberCode,
                category: user.organizationId.category,
                status: user.organizationId.status,
                contactEmail: user.organizationId.contactEmail,
                description: user.organizationId.description,
              }
            : null,
          permissions,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.user) {
      await logAuditEvent({
        actorId: req.user._id,
        actorEmail: req.user.email,
        action: 'AUTH_LOGOUT',
        resourceType: 'AUTH',
        outcome: 'SUCCESS',
        requestId: req.id,
      });
    }
    res.json({
      success: true,
      message: 'Signed out successfully.',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const userDoc = await User.findById(req.user._id).populate('organizationId').lean();
    if (!userDoc) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
          requestId: req.id,
        },
      });
    }

    const roleDoc = await Role.findOne({
      key: { $in: [userDoc.role, req.user.role] },
    }).lean();

    res.json({
      success: true,
      data: {
        user: {
          id: userDoc._id.toString(),
          _id: userDoc._id,
          email: userDoc.email,
          displayName: userDoc.displayName,
          role: req.user.role,
          rawRole: userDoc.role,
          status: userDoc.status,
          createdAt: userDoc.createdAt,
          lastLoginAt: userDoc.lastLoginAt,
          organization: userDoc.organizationId
            ? {
                id: userDoc.organizationId._id,
                _id: userDoc.organizationId._id,
                name: userDoc.organizationId.name,
                memberCode: userDoc.organizationId.memberCode,
                category: userDoc.organizationId.category,
                status: userDoc.organizationId.status,
                contactEmail: userDoc.organizationId.contactEmail,
                description: userDoc.organizationId.description,
              }
            : null,
          permissions: roleDoc ? roleDoc.permissions : req.user.permissions,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user._id;
    const { displayName, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
          requestId: req.id,
        },
      });
    }

    if (displayName && typeof displayName === 'string') {
      user.displayName = displayName.trim();
    }

    if (password && typeof password === 'string' && password.trim().length > 0) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Password must be at least 8 characters long.',
            requestId: req.id,
          },
        });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      action: 'USER_PROFILE_UPDATED',
      resourceType: 'USER',
      resourceId: user._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Profile updated for user: ${user.email}`,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user._id.toString(),
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: req.user.role,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          organization: req.user.organization,
          permissions: req.user.permissions,
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NEW_PASSWORD',
          message: 'New password must be at least 8 characters long.',
          requestId: req.id,
        },
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
          requestId: req.id,
        },
      });
    }

    // Verify current password if user has one
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CURRENT_PASSWORD_REQUIRED',
            message: 'Current password is required to change password.',
            requestId: req.id,
          },
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INCORRECT_CURRENT_PASSWORD',
            message: 'The current password you provided is incorrect.',
            requestId: req.id,
          },
        });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await user.save();

    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      action: 'AUTH_PASSWORD_CHANGED',
      resourceType: 'USER',
      resourceId: user._id,
      outcome: 'SUCCESS',
      requestId: req.id,
      details: `Password changed for user ${user.email}`,
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Your new password has been saved.',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
