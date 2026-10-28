import { Router } from 'express';
import {
  listServices,
  getServiceById,
  sandboxTest,
  createService,
  updateService,
} from '../controllers/services.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';

const router = Router();

router.get('/', listServices);
router.get('/:id', getServiceById);
router.post('/:id/sandbox', authenticate, sandboxTest);
router.post('/', authenticate, authorizeRole(['admin', 'operator']), createService);
router.patch('/:id', authenticate, authorizeRole(['admin', 'operator']), updateService);

export default router;
