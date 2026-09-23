import { useState } from 'react';
import { updateCartItemQuantity, removeCartItem } from '../api/cart';

export function CartLineItem({ item, onChange }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  async function commitQuantity(newQuantity) {
    if (newQuantity < 1) return;
    setIsUpdating(true);
    setError(null);
    try {
      await updateCartItemQuantity(item.id, newQuantity);
      setQuantity(newQuantity);
      onChange(); // tell the parent to re-fetch the cart (total needs recalculating)
    } catch (err) {
      // Revert the displayed quantity (e.g. not enough stock)
      setQuantity(item.quantity);
      setError(err.response?.data?.error || 'Could not update quantity');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRemove() {
    setIsUpdating(true);
    try {
      await removeCartItem(item.id);
      onChange();
    } catch {
      setError('Could not remove item');
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4">
      <div>
        <p className="font-medium text-slate-900">{item.book.title}</p>
        <p className="text-sm text-slate-500">{item.book.author}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => commitQuantity(quantity - 1)}
            disabled={isUpdating || quantity <= 1}
            className="h-7 w-7 rounded border border-slate-300 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{quantity}</span>
          <button
            onClick={() => commitQuantity(quantity + 1)}
            disabled={isUpdating}
            className="h-7 w-7 rounded border border-slate-300 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>

        <span className="w-16 text-right text-sm font-medium text-slate-900">
          ${item.subtotal}
        </span>

        <button
          onClick={handleRemove}
          disabled={isUpdating}
          className="text-sm text-slate-400 hover:text-red-600 disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
