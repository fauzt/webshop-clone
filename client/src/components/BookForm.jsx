import { useState } from 'react';
import { createBook, updateBook } from '../api/books';

const emptyForm = {
  title: '',
  author: '',
  description: '',
  price: '',
  stock: '',
  coverImage: '',
};

export function BookForm({ book, onSaved, onCancel }) {
  const isEditing = Boolean(book);
  const [values, setValues] = useState(
    book
      ? {
          title: book.title,
          author: book.author,
          description: book.description || '',
          price: book.price,
          stock: book.stock,
          coverImage: book.coverImage || '',
        }
      : emptyForm
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Empty strings for optional fields should not be sent as empty
    // strings, the backend's Zod schema expects them omitted or a real
    // value, not "".
    const payload = {
      title: values.title,
      author: values.author,
      price: Number(values.price),
      stock: Number(values.stock),
      ...(values.description ? { description: values.description } : {}),
      ...(values.coverImage ? { coverImage: values.coverImage } : {}),
    };

    try {
      if (isEditing) {
        await updateBook(book.id, payload);
      } else {
        await createBook(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save this book.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <h2 className="font-medium text-slate-900">{isEditing ? 'Edit book' : 'Add a new book'}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-900">Title</label>
          <input
            required
            value={values.title}
            onChange={handleChange('title')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-900">Author</label>
          <input
            required
            value={values.author}
            onChange={handleChange('author')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-900">Price</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={values.price}
            onChange={handleChange('price')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-900">Stock</label>
          <input
            required
            type="number"
            min="0"
            step="1"
            value={values.stock}
            onChange={handleChange('stock')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate-800">Cover image URL (optional)</label>
          <input
            value={values.coverImage}
            onChange={handleChange('coverImage')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate-800">Description (optional)</label>
          <textarea
            value={values.description}
            onChange={handleChange('description')}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Add book'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}