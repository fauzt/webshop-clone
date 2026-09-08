import prisma from '../config/db.ts';
import {
  createBookSchema,
  updateBookSchema,
  listBooksQuerySchema,
} from '../utils/bookValidation.js';

// GET /books — public, paginated, filterable, searchable.
async function listBooks(req, res, next) {
  try {
    const { page, limit, search, categoryId, sort } = listBooksQuerySchema.parse(req.query);

    // Build the WHERE clause conditionally — only add filters that were actually provided.
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

    // Run the count and the page fetch in parallel — they're independent queries.
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
  } catch (err) {
    next(err);
  }
}

// GET /books/:id — public.
async function getBook(req, res, next) {
  try {
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
  } catch (err) {
    next(err);
  }
}

// POST /books — admin only.
async function createBook(req, res, next) {
  try {
    const data = createBookSchema.parse(req.body);
    const book = await prisma.book.create({ data });
    res.status(201).json({ book });
  } catch (err) {
    next(err);
  }
}

// PUT /books/:id — admin only. Partial update.
async function updateBook(req, res, next) {
  try {
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
  } catch (err) {
    next(err);
  }
}

// DELETE /books/:id — admin only.
async function deleteBook(req, res, next) {
  try {
    await prisma.book.delete({ where: { id: req.params.id } })
    .catch((prismaErr) => {
      if (prismaErr.code === 'P2025') {
        const err = new Error('Book not found');
        err.status = 404;
        throw err;
      }
      throw prismaErr;
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export { listBooks, getBook, createBook, updateBook, deleteBook };
