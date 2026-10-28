import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';
import {
  createProviderRequest,
  listProviderRequests,
  reviewProviderRequest,
} from '../controllers/admin.controller.js';

const router = Router();

// Public onboarding submission
router.post('/', createProviderRequest);

// Admin-only management
router.get('/', authenticate, authorizeRole(['admin', 'PLATFORM_ADMIN']), listProviderRequests);
router.patch('/:id/review', authenticate, authorizeRole(['admin', 'PLATFORM_ADMIN']), reviewProviderRequest);

export default router;
