import prisma from '../config/db.ts';
import stripe from '../config/stripe.js';

// POST /orders/checkout
// Reserves stock and creates a PENDING order in one atomic transaction,
// then creates a Stripe Checkout Session for it. The order is only ever
// marked PAID later, by the webhook handler.
// no proof of payment at this point
export async function checkout(req, res, next) {
  let newOrder;

  try {
    newOrder = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId: req.user.id },
        include: { book: true },
      });

      if (cartItems.length === 0) {
        const err = new Error('Cart is empty');
        err.status = 400;
        throw err;
      }

      // Atomic "decrement only if enough stock".
      // Stock is reserved when someone commits to checking out.
      // Stripe sessions can sit open for (default 24h), and we don't want
      // that book sellable to someone else in the meantime.
      // Tradeoff: an abandoned checkout needs to release that reservation
      // later (handled by a checkout.session.expired webhook).
      for (const item of cartItems) {
        const result = await tx.book.updateMany({
          where: { id: item.bookId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          const err = new Error(`"${item.book.title}" no longer has enough stock`);
          err.status = 409; // Conflict — the data changed since the cart was built.
          throw err;
        }
      }

      const total = cartItems
        .reduce((sum, item) => sum + Number(item.book.price) * item.quantity, 0)
        .toFixed(2);

      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          status: 'PENDING',
          total,
          items: {
            create: cartItems.map((item) => ({
              bookId: item.bookId,
              quantity: item.quantity,
              price: item.book.price,
            })),
          },
        },
        include: { items: { include: { book: true } } },
      });

      await tx.cartItem.deleteMany({ where: { userId: req.user.id } });

      return order;
    });
  } catch (err) {
    return next(err);
  }

  // Stripe's API
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: newOrder.items.map((item) => ({
        price_data: {
          currency: 'sgd',
          product_data: { name: item.book.title },
          // Stripe wants amounts in the smallest currency unit (cents)
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      metadata: { orderId: newOrder.id },
      success_url: `${process.env.CLIENT_URL}/orders?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL}/cart?checkout=cancelled`,
    });

    await prisma.order.update({
      where: { id: newOrder.id },
      data: { stripeSessionId: session.id },
    });

    res.status(201).json({ url: session.url, orderId: newOrder.id });
  } catch (err) {
    // Compensating transaction: Stripe failed AFTER we already reserved
    // stock and created the order in the step above. Without this, that
    // stock would stay decremented for an order that never got a working
    // payment session
    await prisma.$transaction(async (tx) => {
      for (const item of newOrder.items) {
        await tx.book.update({
          where: { id: item.bookId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({
        where: { id: newOrder.id },
        data: { status: 'CANCELLED' },
      });
    });

    next(err);
  }
}

// GET /orders — the logged-in user's own order history.
export async function listOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { book: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

// GET /orders/:id
export async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { book: true } } },
    });

    if (!order || order.userId !== req.user.id) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}
