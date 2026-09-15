const STATUS_STYLES = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export function OrderCard({ order }) {
  const placedOn = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">Order #{order.id.slice(0, 8)}</p>
          <p className="text-sm text-slate-500">{placedOn}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            STATUS_STYLES[order.status] || STATUS_STYLES.PENDING
          }`}
        >
          {order.status}
        </span>
      </div>

      <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 items-center justify-between py-2 text-sm">
            <div className="mr-auto max-w-96">
              <span className="truncate block max-w-full text-slate-700">
                {item.book.title}
              </span>
            </div>
            <div className="min-w-2">
              <span className="text-slate-400">× {item.quantity}</span>
            </div>
            {/* item.price is the price at the time of purchase (snapshotted
                by the backend) */}
            <div className="">
              <span className="text-slate-900">
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-900">
        <span>Total</span>
        <span>${order.total}</span>
      </div>
    </div>
  );
}
