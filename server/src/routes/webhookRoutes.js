import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// express.raw() gives req.body as a Buffer instead of a parsed object -
// required by stripe.webhooks.constructEvent(). This only works correctly
// if this route is registered before the app's global express.json()
// middleware runs
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
