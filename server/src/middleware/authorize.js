export function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.',
          requestId: req.id,
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
          requestId: req.id,
        },
      });
    }

    next();
  };
}

// Alias for authorizeRole — used as authorize(['admin'])
export const authorize = authorizeRole;

export function requireRole(...roles) {
  const flattened = roles.flat();
  return authorizeRole(flattened);
}

export function authorizePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.',
          requestId: req.id,
        },
      });
    }

    const hasPermission =
      req.user.permissions?.includes(requiredPermission) || req.user.role === 'admin';

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Missing required permission: ${requiredPermission}`,
          requestId: req.id,
        },
      });
    }

    next();
  };
}
