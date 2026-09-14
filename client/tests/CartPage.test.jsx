import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { CartPage } from '../src/pages/CartPage';
import { server } from './mocks/server';
import { seedCart } from './mocks/handlers';

const sampleBook = {
  id: 'book-1',
  title: 'Clean Code',
  author: 'Robert Martin',
  price: '20.00',
  stock: 5,
};

function renderCartPage() {
  return render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );
}

describe('CartPage — empty cart', () => {
  it('shows an empty state with a link back to the catalogue', async () => {
    seedCart([]);
    renderCartPage();

    await waitFor(() => expect(screen.getByText('Your cart is empty.')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Browse books' })).toBeInTheDocument();
  });
});

describe('CartPage — with items', () => {
  it('renders each item and the correct total', async () => {
    const secondBook = {
      id: 'book-2',
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      price: '15.00',
      stock: 3,
    };

    seedCart([
      { id: 'item-1', quantity: 2, book: sampleBook },
      { id: 'item-2', quantity: 1, book: secondBook }
    ]);
    renderCartPage();

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    expect(screen.getByText('$40.00')).toBeInTheDocument(); // line subtotal
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument();
  });
});

describe('CartPage — checkout', () => {
  it('shows an order confirmation after a successful checkout', async () => {
    const user = userEvent.setup();
    seedCart([{ id: 'item-1', quantity: 1, book: sampleBook }]);
    renderCartPage();

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => expect(screen.getByText('Order placed!')).toBeInTheDocument());
    expect(screen.getByText(/total \$20\.00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toBeInTheDocument();
  });

  it('shows a specific error and keeps the cart visible on a 409 stock conflict', async () => {
    const user = userEvent.setup();
    seedCart([{ id: 'item-1', quantity: 1, book: sampleBook }]);
    renderCartPage();

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());

    // Simulates the exact scenario the backend's atomic stock check exists
    // for: stock changed between adding to cart and checking out.
    server.use(
      http.post('http://localhost:4000/orders/checkout', () =>
        HttpResponse.json({ error: '"Clean Code" no longer has enough stock' }, { status: 409 })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    expect(
      await screen.findByText('"Clean Code" no longer has enough stock')
    ).toBeInTheDocument();
    // Should NOT have jumped to the confirmation screen.
    expect(screen.queryByText('Order placed!')).not.toBeInTheDocument();
    // The cart itself should still be visible/usable.
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument();
  });
});
