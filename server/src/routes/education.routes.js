import { Router } from 'express';
import { verifyAcademicRecord, getVerificationByRequestId } from '../controllers/education.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Per spec: Verifier/college staff can verify records; students may submit their own request if enabled; admin can troubleshoot
router.post('/verify', authenticate, verifyAcademicRecord);
router.get('/requests/:requestId', authenticate, getVerificationByRequestId);
router.get('/:requestId', authenticate, getVerificationByRequestId);

export default router;
