import prisma from '../config/db.ts';

// POST /orders/checkout
// Converts the logged-in user's cart into an Order, atomically.
export async function checkout(req, res, next) {
  try {
    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId: req.user.id },
        include: { book: true },
      });

      if (cartItems.length === 0) {
        const err = new Error('Cart is empty');
        err.status = 400;
        throw err;
      }

      // Decrement stock for each book ATOMICALLY, and verify enough was
      // available at the moment of decrement — not at the moment we first
      // looked. This matters because time passes between "item was added
      // to cart" and "checkout happens now," during which someone else
      // could have bought the last copies.
      //
      // updateMany with a WHERE clause that includes "stock >= quantity"
      // is the key trick: the database only applies the decrement if that
      // condition is still true AT THE MOMENT OF THE WRITE, as one atomic
      // operation.
      // If two checkouts race for the last copy, only one update can
      // match "stock >= quantity" first.
      // The other sees result.count === 0 and we roll back cleanly,
      // instead of both succeeding and stock going negative.
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

      // Snapshot each book's CURRENT price into the order item. Even if the
      // book's price changes tomorrow, this receipt stays historically accurate.
      const total = cartItems
        .reduce((sum, item) => sum + Number(item.book.price) * item.quantity, 0)
        .toFixed(2);

      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          // No real payment step exists yet, so we mark PAID immediately to
          // simulate a completed purchase. When a payment gateway (e.g.
          // Stripe) is added later, this should become PENDING here, then
          // flipped to PAID only after the gateway confirms the charge.
          status: 'PAID',
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

      return newOrder;
    });

    res.status(201).json({ order });
  } catch (err) {
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

    // Same pattern as cart ownership checks: 404 (not 403) so a user can't
    // learn whether an order id exists at all under someone else's account.
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
