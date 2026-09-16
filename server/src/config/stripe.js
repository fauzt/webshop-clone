import Stripe from 'stripe';
import 'dotenv/config';

// A pinned apiVersion means Stripe's API behavior won't
// silently change if Stripe rolls out a new default version
const stripe = new Stripe(process.env.STRIPE_API_KEY, {
  apiVersion: '2026-08-26.dahlia',
});

export default stripe;
