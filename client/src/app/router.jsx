import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, getDefaultLandingPage } from './ProtectedRoute';
import { useAuth } from './AuthContext';
import { AppLayout } from '../components/AppLayout';

import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RequestAccessPage } from '../pages/RequestAccessPage';
import { OverviewPage } from '../pages/OverviewPage';
import { ServiceDirectoryPage } from '../pages/ServiceDirectoryPage';
import { VerificationPage } from '../pages/VerificationPage';
import { MonitoringPage } from '../pages/MonitoringPage';
import { AccessConsentPage } from '../pages/AccessConsentPage';
import { AdminPage } from '../pages/AdminPage';
import { ProviderRegistryPage } from '../pages/ProviderRegistryPage';
import { ProfilePage } from '../pages/ProfilePage';

function RootRedirect() {
  const { isAuthenticated, role, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/home" replace />;
  return <Navigate to={getDefaultLandingPage(role)} replace />;
}

export const router = createBrowserRouter([
  // Public landing page
  {
    path: '/home',
    element: <LandingPage />,
  },
  // Root redirects
  {
    path: '/',
    element: <RootRedirect />,
  },
  // Auth pages (public)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/request-access',
    element: <RequestAccessPage />,
  },
  // Protected app layout
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: 'overview',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'PLATFORM_ADMIN', 'operator', 'PROVIDER_OPERATOR', 'verifier', 'ORGANIZATION_VERIFIER']}>
            <OverviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'provider/registry',
        element: (
          <ProtectedRoute allowedRoles={['operator', 'PROVIDER_OPERATOR', 'admin', 'PLATFORM_ADMIN']}>
            <ProviderRegistryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'registry',
        element: <Navigate to="/app/provider/registry" replace />,
      },
      {
        path: 'services',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'PLATFORM_ADMIN', 'operator', 'PROVIDER_OPERATOR', 'verifier', 'ORGANIZATION_VERIFIER']}>
            <ServiceDirectoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'verification',
        element: (
          <ProtectedRoute allowedRoles={['verifier', 'ORGANIZATION_VERIFIER']}>
            <VerificationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'monitoring',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'PLATFORM_ADMIN', 'operator', 'PROVIDER_OPERATOR', 'verifier', 'ORGANIZATION_VERIFIER']}>
            <MonitoringPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'access-consent',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'PLATFORM_ADMIN']}>
            <AccessConsentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'PLATFORM_ADMIN', 'operator', 'PROVIDER_OPERATOR', 'verifier', 'ORGANIZATION_VERIFIER']}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'PLATFORM_ADMIN']}>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Legacy paths (keep old routes working)
  {
    path: '/overview',
    element: <Navigate to="/app/overview" replace />,
  },
  {
    path: '/services',
    element: <Navigate to="/app/services" replace />,
  },
  {
    path: '/verification',
    element: <Navigate to="/app/verification" replace />,
  },
  {
    path: '/monitoring',
    element: <Navigate to="/app/monitoring" replace />,
  },
  {
    path: '/access-consent',
    element: <Navigate to="/app/access-consent" replace />,
  },
  {
    path: '/admin',
    element: <Navigate to="/app/admin" replace />,
  },
  {
    path: '/registry',
    element: <Navigate to="/app/provider/registry" replace />,
  },
  {
    path: '/app/registry',
    element: <Navigate to="/app/provider/registry" replace />,
  },
  {
    path: '*',
    element: <RootRedirect />,
  },
]);
