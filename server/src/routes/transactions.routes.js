import { Router } from 'express';
import {
  listTransactions,
  getTransactionSummary,
  exportCsv,
} from '../controllers/transactions.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', authenticate, listTransactions);
router.get('/summary', authenticate, getTransactionSummary);
router.get('/export', authenticate, exportCsv);

export default router;
