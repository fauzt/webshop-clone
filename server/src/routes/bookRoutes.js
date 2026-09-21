import { Router } from 'express';
import {
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
} from '../controllers/bookController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Public - anyone can browse the catalogue.
router.get('/', listBooks);
router.get('/:id', getBook);

// Admin only - catalogue management.
router.post('/', requireAuth, requireRole('ADMIN'), createBook);
router.put('/:id', requireAuth, requireRole('ADMIN'), updateBook);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteBook);

export default router;
