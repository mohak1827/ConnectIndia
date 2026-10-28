import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function getDefaultLandingPage(role) {
  const normRole = (role || '').toLowerCase();
  switch (normRole) {
    case 'admin':
    case 'platform_admin':
      return '/app/overview';
    case 'verifier':
    case 'organization_verifier':
      return '/app/verification';
    case 'operator':
    case 'provider_operator':
      return '/app/overview';
    default:
      return '/login';
  }
}

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '4px solid #1e3a5f', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#475569', fontSize: 14 }}>Authenticating ConnectIndia session...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const defaultPage = getDefaultLandingPage(role);
    return <Navigate to={defaultPage} replace />;
  }

  return children;
}
