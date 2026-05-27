import { Router } from 'express';
import {
  createInvoice,
  deleteInvoice,
  downloadInvoicePDF,
  getInvoiceById,
  getInvoices,
  updateInvoice,
} from '../controllers/invoiceController.js';
import protect from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.route('/').get(getInvoices).post(createInvoice);
router.route('/:id').get(getInvoiceById).put(updateInvoice).delete(deleteInvoice);
router.get('/:id/pdf', downloadInvoicePDF);

export default router;
