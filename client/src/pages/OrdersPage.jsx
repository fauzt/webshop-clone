import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders } from '../api/orders.js';
import { OrderCard } from '../components/OrderCard.jsx';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listOrders()
      .then((data) => setOrders(data.orders))
      .catch(() => setError('Could not load your orders.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <p className="p-8 text-center text-slate-500">Loading your orders…</p>;
  }

  if (error) {
    return <p className="p-8 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 text-center text-slate-500">
          <p>You haven't placed any orders yet.</p>
          <Link to="/" className="mt-2 inline-block text-slate-900 underline">
            Browse books
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
