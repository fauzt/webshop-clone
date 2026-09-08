import express from 'express';
import { checkout, listOrders, getOrder } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/checkout', checkout);
router.get('/', listOrders);
router.get('/:id', getOrder);

export default router;
