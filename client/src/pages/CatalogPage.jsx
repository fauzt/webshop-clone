import { useEffect, useState } from 'react';
import { listBooks } from '../api/books';
import { BookCard } from '../components/BookCard';

export function CatalogPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ books: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce the search box: wait 400ms after the user stops typing before
  // it actually triggers a request and fires API call
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1); // a new search always starts back at page 1
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isCurrent = true; // guards against a stale response overwriting a newer one

    setIsLoading(true);
    setError(null);

    listBooks({ page, limit: 12, search: search || undefined })
      .then((result) => {
        if (isCurrent) setData(result);
      })
      .catch(() => {
        if (isCurrent) setError('Could not load books. Please try again.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [page, search]);

  const { books, pagination } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Browse Books</h1>
        <input
          type="text"
          placeholder="Search by title or author…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : books.length === 0 ? (
        <p className="text-slate-500">No books found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
