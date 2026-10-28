import { Router } from 'express';
import {
  listConsents,
  createConsent,
  updateConsentStatus,
  evaluatePolicyEndpoint,
} from '../controllers/consent.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', authenticate, listConsents);
router.post('/', authenticate, createConsent);
router.patch('/:id', authenticate, updateConsentStatus);
router.post('/policy/evaluate', authenticate, evaluatePolicyEndpoint);

export default router;
