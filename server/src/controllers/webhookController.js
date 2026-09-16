import stripe from '../config/stripe.js';
import prisma from '../config/db.ts';

async function restockAndCancelOrder(orderId) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    // Idempotency guard: only act on an order that's still PENDING. If a
    // duplicate webhook delivery re-sends this same event (Stripe explicitly
    // does not guarantee exactly-once delivery; retries are normal), this
    // stops us from incrementing stock a second time for the same order.
    if (!order || order.status !== 'PENDING') return;

    for (const item of order.items) {
      await tx.book.update({
        where: { id: item.bookId },
        data: { stock: { increment: item.quantity } },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  });
}

// POST /webhooks/stripe
// Stripe calls this directly (server-to-server) to report what actually
// happened to a payment.
export async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // req.body must be the RAW request body (a Buffer), not JSON-parsed.
    // constructEvent recomputes the signature from the raw bytes and
    // compares it against the one Stripe sent; this proves the
    // event genuinely came from Stripe and wasn't forged or tampered with
    // in transit. Skipping this check would mean anyone who discovers
    // this URL could POST a fake "payment succeeded" event and get a free
    // order marked PAID.
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // updateMany with status: 'PENDING' in the WHERE clause is the
        // idempotency guard here too. If this event is ever delivered
        // twice, the second call matches zero rows and does nothing,
        // rather than "re-paying" an already-paid order.
        await prisma.order.updateMany({
          where: { id: orderId, status: 'PENDING' },
          data: { status: 'PAID' },
        });
      }
      break;
    }

    case 'checkout.session.expired': {
      // Fired when a Checkout Session's time limit passes (default 24h)
      // without payment. This releases the stock reserved back in
      // orderController's checkout(), so it doesn't stay locked away
      // forever for a sale that never happened.
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await restockAndCancelOrder(orderId);
      }
      break;
    }

    default:
      // Stripe sends many event types we don't care about (e.g. every
      // payment method update). Explicitly ignoring anything we haven't
      // written a case for is normal and expected.
      break;
  }

  // Respond quickly and with 2xx. If Stripe doesn't get an acknowledgment
  // within its timeout, it will retry the event, which the idempotency
  // guards above handle safely.
  res.json({ received: true });
}
