import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { OrdersPage } from '../src/pages/OrdersPage';
import { seedOrders, fakeOrders } from './mocks/handlers';

const sampleOrder = {
  id: 'order-1',
  status: 'PENDING',
  total: '20.00',
  createdAt: new Date().toISOString(),
  items: [
    {
      id: 'item-1',
      quantity: 1,
      price: '20.00',
      book: { id: 'book-1', title: 'Clean Code' },
    },
  ],
};

function renderOrdersPage(initialPath = '/orders') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <OrdersPage />
    </MemoryRouter>
  );
}

describe('OrdersPage - without the checkout banner', () => {
  it('does not show a payment notice on a normal visit', async () => {
    seedOrders([sampleOrder]);
    renderOrdersPage();

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    expect(
      screen.queryByText('Payment received. Your order status will update shortly.')
    ).not.toBeInTheDocument();
  });

  it('does not schedule a second fetch on a normal visit', async () => {
    vi.useFakeTimers();
    seedOrders([sampleOrder]);
    renderOrdersPage();

    await vi.waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());

    // Mutate the fake backend after the initial load, then advance time.
    // If OrdersPage were (incorrectly) polling on every visit, this would
    // show up as a status change here.
    fakeOrders[0] = { ...fakeOrders[0], status: 'PAID' };
    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText('PAID')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

describe('OrdersPage - returning from a successful checkout', () => {
  it('shows the payment notice', async () => {
    seedOrders([sampleOrder]);
    renderOrdersPage('/orders?checkout=success');

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    expect(
      screen.getByText('Payment received. Your order status will update shortly.')
    ).toBeInTheDocument();
  });

  it('re-fetches after a delay and picks up a status change from the webhook', async () => {
    vi.useFakeTimers();
    seedOrders([sampleOrder]);
    renderOrdersPage('/orders?checkout=success');

    await vi.waitFor(() => expect(screen.getByText('PENDING')).toBeInTheDocument());

    // Simulates the webhook having processed in the time since the initial
    // page load, flipping the order's real status server-side.
    fakeOrders[0] = { ...fakeOrders[0], status: 'PAID' };

    // Advances past the 3 second delay in OrdersPage's useEffect, and
    // flushes the resulting fetch promise so the UI has a chance to update
    // before the assertion below runs.
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(screen.getByText('PAID')).toBeInTheDocument());
    expect(screen.queryByText('PENDING')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
