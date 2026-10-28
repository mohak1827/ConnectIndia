import { Router } from 'express';
import { getDashboardSummary, getDashboardActivity, getProviderHealth, getPublicStats } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Public platform statistics
router.get('/public-stats', getPublicStats);

// Authenticated role-based metrics
router.get('/summary', authenticate, getDashboardSummary);
router.get('/activity', authenticate, getDashboardActivity);
router.get('/providers/health', authenticate, getProviderHealth);

export default router;
