import { useCallback, useEffect, useState } from 'react';
import { listBooks, deleteBook } from '../api/books';
import { BookForm } from '../components/BookForm';

export function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Controls the form: null means hidden, 'new' means creating, a book
  // object means editing that specific book.
  const [editingTarget, setEditingTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadBooks = useCallback(() => {
    setIsLoading(true);
    listBooks({ page: 1, limit: 100 })
      .then((data) => setBooks(data.books))
      .catch(() => setError('Could not load books.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  function handleSaved() {
    setEditingTarget(null);
    loadBooks();
  }

  async function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(book.id);
    try {
      await deleteBook(book.id);
      loadBooks();
    } catch {
      setError(`Could not delete "${book.title}".`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Manage Books</h1>
        {editingTarget === null && (
          <button
            onClick={() => setEditingTarget('new')}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Add book
          </button>
        )}
      </div>

      {editingTarget !== null && (
        <div className="mt-4">
          <BookForm
            book={editingTarget === 'new' ? null : editingTarget}
            onSaved={handleSaved}
            onCancel={() => setEditingTarget(null)}
          />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="mt-8 text-center text-slate-500">Loading...</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="py-2 font-medium">Title</th>
              <th className="py-2 font-medium">Author</th>
              <th className="py-2 font-medium">Price</th>
              <th className="py-2 font-medium">Stock</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-900">{book.title}</td>
                <td className="py-2 text-slate-800">{book.author}</td>
                <td className="py-2 text-slate-800">${Number(book.price).toFixed(2)}</td>
                <td className="py-2 text-slate-800 text-right">{book.stock}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setEditingTarget(book)}
                    className="text-slate-850 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(book)}
                    disabled={deletingId === book.id}
                    className="ml-3 text-slate-850 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === book.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}