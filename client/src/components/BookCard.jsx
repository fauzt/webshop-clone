import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addToCart } from '../api/cart';

export function BookCard({ book }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | loading | added | error
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleAddToCart() {
    setStatus('loading');
    setErrorMessage(null);
    try {
      await addToCart(book.id, 1);
      setStatus('added');
      // Reset back to the normal button after a moment, so it's clear the
      // click "took" without permanently changing the button's label.
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.error || 'Could not add to cart');
    }
  }

  const outOfStock = book.stock === 0;

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 p-4">
      <h3 className="font-medium text-slate-900">{book.title}</h3>
      <p className="text-sm text-slate-500">{book.author}</p>
      {book.category && (
        <span className="mt-1 w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {book.category.name}
        </span>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-slate-900">${Number(book.price).toFixed(2)}</span>
        <span className={`text-xs ${outOfStock ? 'text-red-600' : 'text-slate-400'}`}>
          {outOfStock ? 'Out of stock' : `${book.stock} in stock`}
        </span>
      </div>

      {user ? (
        <button
          onClick={handleAddToCart}
          disabled={outOfStock || status === 'loading'}
          className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' && 'Adding…'}
          {status === 'added' && 'Added ✓'}
          {(status === 'idle' || status === 'error') && (outOfStock ? 'Out of stock' : 'Add to cart')}
        </button>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Log in to add to cart</p>
      )}

      {status === 'error' && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
