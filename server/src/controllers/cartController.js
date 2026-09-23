import prisma from '../config/db.ts';
import { asyncHandler } from '../utils/asyncHandler.js';
import { addToCartSchema, updateCartItemSchema } from '../utils/cartValidation.js';

function serializeCart(cartItems) {
  const items = cartItems.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    book: item.book,
    subtotal: (Number(item.book.price) * item.quantity).toFixed(2),
  }));

  const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2);

  return { items, total };
}

const getCart = asyncHandler(async (req, res) => {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { book: true },
      orderBy: { id: 'asc' },
    });

    res.json(serializeCart(cartItems));
});

const addToCart = asyncHandler(async (req, res) => {
    const { bookId, quantity } = addToCartSchema.parse(req.body);
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }
    if (book.quantity <= 0 || book.quantity < quantity) {
      const err = new Error('No stock left for book');
      err.status = 422;
      throw err;
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_bookId: { userId: req.user.id, bookId } },
    });
    const desiredQuantity = (existing?.quantity ?? 0) + quantity;
    if (desiredQuantity > book.stock) {
      const err = new Error(`Only ${book.stock} in stock`);
      err.status = 422;
      throw err;
    }

    const cartItem = await prisma.cartItem.upsert({
      where: { userId_bookId: { userId: req.user.id, bookId } },
      update: { quantity: desiredQuantity },
      create: { userId: req.user.id, bookId, quantity: desiredQuantity },
      include: { book: true },
    });

    res.status(201).json({ item: cartItem });
});

const updateCartItem = asyncHandler(async (req, res) => {
    const { quantity } = updateCartItemSchema.parse(req.body);

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: req.params.id },
      include: { book: true },
    });

    if (!cartItem || cartItem.userId !== req.user.id) {
      const err = new Error('Cart item not found');
      err.status = 404;
      throw err;
    }

    if (quantity > cartItem.book.stock) {
      const err = new Error(`Only ${cartItem.book.stock} in stock`);
      err.status = 400;
      throw err;
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
      include: { book: true },
    });

    res.json({ item: updated });
});

const removeCartItem = asyncHandler(async (req, res) => {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: req.params.id },
    });

    if (!cartItem || cartItem.userId !== req.user.id) {
      const err = new Error('Cart item not found');
      err.status = 404;
      throw err;
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    res.status(204).send();
});

const clearCart = asyncHandler(async (req, res) => {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user.id },
    });
    res.status(204).send();
});

export { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
