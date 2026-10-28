import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { runVerification } from '../controllers/verification.controller.js';

const router = Router();

/**
 * POST /api/v1/verify/:serviceType
 * Unified verification endpoint for all 4 services.
 * serviceType: education | insurance | identity | employment | business
 */
router.post('/:serviceType', authenticate, runVerification);

export default router;
