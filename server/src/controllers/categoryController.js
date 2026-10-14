import prisma from '../config/db.ts';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createCategorySchema, updateCategorySchema } from '../utils/categoryValidation.js';

// GET /categories - public, used for both the admin book form and the
// catalogue's category filter.
const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ categories });
});

// POST /categories - admin only.
const createCategory = asyncHandler(async (req, res) => {
  const data = createCategorySchema.parse(req.body);

  const category = await prisma.category.create({ data }).catch((prismaErr) => {
    // Prisma throws P2002 on a unique constraint violation (duplicate name).
    if (prismaErr.code === 'P2002') {
      const err = new Error('A category with this name already exists');
      err.status = 409;
      throw err;
    }
    throw prismaErr;
  });

  res.status(201).json({ category });
});

// PUT /categories/:id - admin only. Rename.
const updateCategory = asyncHandler(async (req, res) => {
  const data = updateCategorySchema.parse(req.body);

  const category = await prisma.category
    .update({ where: { id: req.params.id }, data })
    .catch((prismaErr) => {
      if (prismaErr.code === 'P2025') {
        const err = new Error('Category not found');
        err.status = 404;
        throw err;
      }
      if (prismaErr.code === 'P2002') {
        const err = new Error('A category with this name already exists');
        err.status = 409;
        throw err;
      }
      throw prismaErr;
    });

  res.json({ category });
});

// DELETE /categories/:id - admin only.
// Refuses to delete a category that still has books assigned to it,
// rather than leaving books with a dangling categoryId.
const deleteCategory = asyncHandler(async (req, res) => {
  const bookCount = await prisma.book.count({ where: { categoryId: req.params.id } });
  if (bookCount > 0) {
    const err = new Error('Cannot delete a category that still has books assigned to it');
    err.status = 409;
    throw err;
  }

  await prisma.category.delete({ where: { id: req.params.id } }).catch((prismaErr) => {
    if (prismaErr.code === 'P2025') {
      const err = new Error('Category not found');
      err.status = 404;
      throw err;
    }
    throw prismaErr;
  });

  res.status(204).send();
});

export { listCategories, createCategory, updateCategory, deleteCategory };
