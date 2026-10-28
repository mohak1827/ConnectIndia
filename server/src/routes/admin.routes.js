import { Router } from 'express';
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  listProviders,
  createProvider,
  listProviderRequests,
  reviewProviderRequest,
  resetProviderPassword,
  listGrants,
  createGrant,
  updateGrant,
  deleteGrant,
  listUsers,
  updateUser,
  getAdminOverviewMetrics,
  listProviderConfigs,
  updateProviderHealth,
  listAuditEvents,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';

const router = Router();

// Protect all admin endpoints with admin role
router.use(authenticate, authorizeRole(['admin', 'PLATFORM_ADMIN']));

// Platform overview metrics
router.get('/overview', getAdminOverviewMetrics);

// Organizations
router.get('/organizations', listOrganizations);
router.post('/organizations', createOrganization);
router.patch('/organizations/:id', updateOrganization);

// Providers
router.get('/providers', listProviders);
router.post('/providers', createProvider);

// Provider Access Requests
router.get('/provider-requests', listProviderRequests);
router.patch('/provider-requests/:id/review', reviewProviderRequest);
router.post('/provider-requests/:id/reset-password', resetProviderPassword);

// Service Grants
router.get('/grants', listGrants);
router.post('/grants', createGrant);
router.patch('/grants/:id', updateGrant);
router.delete('/grants/:id', deleteGrant);

// Platform Users
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);

// Provider Configurations & Health
router.get('/provider-configs', listProviderConfigs);
router.patch('/provider-configs/:id', updateProviderHealth);
router.patch('/provider-configs/:id/health', updateProviderHealth);

// Global Audit Events
router.get('/audit-events', listAuditEvents);

export default router;
