import prisma from '../config/db.ts';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createBookSchema,
  updateBookSchema,
  listBooksQuerySchema,
} from '../utils/bookValidation.js';

// GET /books - public, paginated, filterable, searchable.
const listBooks = asyncHandler(async (req, res) => {
    const { page, limit, search, categoryId, sort } = listBooksQuerySchema.parse(req.query);

    // Build the WHERE clause conditionally; only add filters that were actually provided.
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      // OR across title/author so a single search box covers both.
      // mode: 'insensitive' makes it case-insensitive (Postgres-specific option).
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortToOrderByMap = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      title_asc: { title: 'asc' },
      newest: { createdAt: 'desc' },
    };
    const orderBy = sortToOrderByMap[sort] || { createdAt: 'desc' };

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
    ]);

    res.json({
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
});

// GET /books/:id - public.
const getBook = asyncHandler(async (req, res) => {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });

    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }

    res.json({ book });
});

// POST /books - admin only.
const createBook = asyncHandler(async (req, res) => {
    const data = createBookSchema.parse(req.body);
    const book = await prisma.book.create({ data });
    res.status(201).json({ book });
});

// PUT /books/:id - admin only. Partial update.
const updateBook = asyncHandler(async (req, res) => {
    const data = updateBookSchema.parse(req.body);

    const book = await prisma.book
      .update({
        where: { id: req.params.id },
        data,
      })
      .catch((prismaErr) => {
        // Prisma throws P2025 when the record to update doesn't exist.
        if (prismaErr.code === 'P2025') {
          const err = new Error('Book not found');
          err.status = 404;
          throw err;
        }
        throw prismaErr;
      });

    res.json({ book });
});

// DELETE /books/:id - admin only.
const deleteBook = asyncHandler(async (req, res) => {
    await prisma.book.delete({ where: { id: req.params.id } }).catch((prismaErr) => {
      if (prismaErr.code === 'P2025') {
        const err = new Error('Book not found');
        err.status = 404;
        throw err;
      }
      throw prismaErr;
    });

    res.status(204).send();
});

export { listBooks, getBook, createBook, updateBook, deleteBook };
