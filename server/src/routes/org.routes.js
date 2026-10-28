import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import {
  getOrgOverview,
  getOrgServices,
  getOrgGrants,
  getOrgHistory,
  getOrgProfile,
  updateOrgProfile,
} from '../controllers/org.controller.js';

export const orgRouter = Router();

orgRouter.use(authenticate, requireRole('verifier', 'ORGANIZATION_VERIFIER', 'admin', 'PLATFORM_ADMIN'));

orgRouter.get('/overview', getOrgOverview);
orgRouter.get('/services', getOrgServices);
orgRouter.get('/grants', getOrgGrants);
orgRouter.get('/history', getOrgHistory);
orgRouter.get('/profile', getOrgProfile);
orgRouter.put('/profile', updateOrgProfile);
orgRouter.patch('/profile', updateOrgProfile);
