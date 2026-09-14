import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCart } from '../api/cart';
import { checkout } from '../api/orders';
import { CartLineItem } from '../components/CartLineItem';

export function CartPage() {
  const [cart, setCart] = useState({ items: [], total: '0.00' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  const loadCart = useCallback(() => {
    setIsLoading(true);
    getCart()
      .then(setCart)
      .catch(() => setError('Could not load your cart.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function handleCheckout() {
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const { order } = await checkout();
      setCompletedOrder(order);
    } catch (err) {
      // 409 here specifically means stock changed since items
      // were added to the cart
      const message =
        err.response?.status === 409
          ? err.response.data.error
          : err.response?.data?.error || 'Checkout failed. Please try again.';
      setCheckoutError(message);
      loadCart(); // refresh in case stock/quantities changed server-side
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (completedOrder) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Order placed!</h1>
        <p className="mt-2 text-slate-600">
          Order #{completedOrder.id.slice(0, 8)} — total ${completedOrder.total}
        </p>
        <Link to="/" className="mt-6 inline-block text-slate-900 underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <p className="p-8 text-center text-slate-500">Loading your cart…</p>;
  }

  if (error) {
    return <p className="p-8 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Your Cart</h1>

      {cart.items.length === 0 ? (
        <div className="mt-8 text-center text-slate-500">
          <p>Your cart is empty.</p>
          <Link to="/" className="mt-2 inline-block text-slate-900 underline">
            Browse books
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6">
            {cart.items.map((item) => (
              <CartLineItem key={item.id} item={item} onChange={loadCart} />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-lg font-semibold text-slate-900">Total</span>
            <span className="text-lg font-semibold text-slate-900">${cart.total}</span>
          </div>

          {checkoutError && <p className="mt-3 text-sm text-red-600">{checkoutError}</p>}

          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="mt-4 w-full rounded-md bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isCheckingOut ? 'Placing order…' : 'Checkout'}
          </button>
        </>
      )}
    </div>
  );
}
