import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import {
  getProviderOverview,
  getProviderServices,
  listRegistryRecords,
  createRegistryRecord,
  getRegistryRecord,
  updateRegistryRecord,
  deleteRegistryRecord,
  importRegistryCsv,
  exportRegistryCsv,
  getProviderTransactions,
  getProviderHistory,
  getProviderAdapterHealth,
  getProviderProfile,
  updateProviderProfile,
} from '../controllers/provider.controller.js';

export const providerRouter = Router();

// Protect all provider routes to provider operators and platform admins
providerRouter.use(authenticate, requireRole('operator', 'PROVIDER_OPERATOR', 'admin', 'PLATFORM_ADMIN'));

providerRouter.get('/overview', getProviderOverview);
providerRouter.get('/profile', getProviderProfile);
providerRouter.put('/profile', updateProviderProfile);
providerRouter.patch('/profile', updateProviderProfile);
providerRouter.get('/services', getProviderServices);
providerRouter.get('/registry', listRegistryRecords);
providerRouter.post('/registry', createRegistryRecord);
providerRouter.get('/registry/export', exportRegistryCsv);
providerRouter.post('/registry/import', importRegistryCsv);
providerRouter.get('/registry/:id', getRegistryRecord);
providerRouter.put('/registry/:id', updateRegistryRecord);
providerRouter.delete('/registry/:id', deleteRegistryRecord);
providerRouter.get('/transactions', getProviderTransactions);
providerRouter.get('/history', getProviderHistory);
providerRouter.get('/health', getProviderAdapterHealth);
