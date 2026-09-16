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

function renderCartPage(initialPath = '/cart') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CartPage />
    </MemoryRouter>
  );
}

// jsdom does not implement real page navigation, so assigning
// window.location.href throws "Not implemented" unless the location object
// is replaced with a plain mock first. This lets the test observe what URL
// the component tried to navigate to, without actually navigating.
const originalLocation = window.location;
const originalHref = originalLocation.href;

function createMockLocation() {
  return {
    href: originalHref,
    origin: originalLocation.origin,
    protocol: originalLocation.protocol,
    host: originalLocation.host,
    hostname: originalLocation.hostname,
    port: originalLocation.port,
    pathname: originalLocation.pathname,
    search: originalLocation.search,
    hash: originalLocation.hash,
    assign: () => {},
    replace: () => {},
    reload: () => {},
  };
}

beforeEach(() => {
  delete window.location;
  window.location = createMockLocation();
});

afterEach(() => {
  window.location = originalLocation;
});

describe('CartPage - empty cart', () => {
  it('shows an empty state with a link back to the catalogue', async () => {
    seedCart([]);
    renderCartPage();

    await waitFor(() => expect(screen.getByText('Your cart is empty.')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Browse books' })).toBeInTheDocument();
  });
});

describe('CartPage - with items', () => {
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
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('$55.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument();
  });
});

describe('CartPage - checkout', () => {
  it('redirects to the Stripe checkout URL on success', async () => {
    const user = userEvent.setup();
    seedCart([{ id: 'item-1', quantity: 1, book: sampleBook }]);
    renderCartPage();

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() =>
      expect(window.location.href).toMatch(/^https:\/\/mock-stripe-checkout\.test\/session\//)
    );
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
    // No navigation should have happened on failure.
    expect(window.location.href).toBe('http://localhost:3000/');
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument();
  });
});

describe('CartPage - returning from a cancelled checkout', () => {
  it('shows a cancellation notice without treating it as an error', async () => {
    seedCart([{ id: 'item-1', quantity: 1, book: sampleBook }]);
    renderCartPage('/cart?checkout=cancelled');

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    expect(
      screen.getByText('Checkout was cancelled. Your cart has been kept as is.')
    ).toBeInTheDocument();
  });
});
