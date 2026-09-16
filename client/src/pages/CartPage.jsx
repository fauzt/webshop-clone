import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCart } from '../api/cart';
import { checkout } from '../api/orders';
import { CartLineItem } from '../components/CartLineItem';

export function CartPage() {
  const [searchParams] = useSearchParams();
  const [cart, setCart] = useState({ items: [], total: '0.00' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const wasCancelled = searchParams.get('checkout') === 'cancelled';

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
      const { url } = await checkout();
      window.location.href = url; //full page navigation to Stripe
    } catch (err) {
      // 409 here means stock changed since items were added to the cart
      const message =
        err.response?.status === 409
          ? err.response.data.error
          : err.response?.data?.error || 'Checkout failed. Please try again.';
      setCheckoutError(message);
      setIsCheckingOut(false);
      loadCart(); // refresh in case stock/quantities changed server-side
    }
  }

  if (isLoading) {
    return <p className="p-8 text-center text-slate-500">Loading your cart...</p>;
  }

  if (error) {
    return <p className="p-8 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Your Cart</h1>

      {wasCancelled && (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was cancelled. Your cart has been kept as is.
        </p>
      )}

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
            {isCheckingOut ? 'Redirecting to checkout...' : 'Checkout'}
          </button>
        </>
      )}
    </div>
  );
}
