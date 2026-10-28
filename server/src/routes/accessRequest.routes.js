import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  submitAccessRequest,
  checkRequestStatus,
  listAccessRequests,
  reviewAccessRequest,
  activateApprovedRequest,
} from '../controllers/accessRequest.controller.js';

const router = Router();

// Public routes (no auth needed)
router.post('/', submitAccessRequest);
router.get('/status', checkRequestStatus);

// Admin-only routes
router.get('/', authenticate, authorize(['admin', 'PLATFORM_ADMIN']), listAccessRequests);
router.patch('/:id/review', authenticate, authorize(['admin', 'PLATFORM_ADMIN']), reviewAccessRequest);
router.post('/:id/activate', authenticate, authorize(['admin', 'PLATFORM_ADMIN']), activateApprovedRequest);

export default router;
