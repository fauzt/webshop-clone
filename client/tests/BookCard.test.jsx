import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../src/context/AuthContext';
import { BookCard } from '../src/components/BookCard';
import { server } from './mocks/server';
import { sessionState, seedBooks } from './mocks/handlers';

const sampleBook = {
  id: 'book-1',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  price: '39.99',
  stock: 5,
};

function renderBookCard(book = sampleBook) {
  return render(
    <AuthProvider>
      <BookCard book={book} />
    </AuthProvider>
  );
}

// BookCard's add-to-cart call goes through the real api client, which hits
// the mock POST /cart/items handler — so the book needs to actually exist
// in the fake books store for that handler's stock lookup to succeed.
function loginAndSeedBook(book = sampleBook) {
  sessionState.hasValidRefreshToken = true;
  sessionState.currentUser = { id: 'u1', email: 'reader@example.com', role: 'USER' };
  seedBooks([book]);
}

describe('BookCard — rendering', () => {
  it('displays title, author, and formatted price', () => {
    renderBookCard();

    expect(screen.getByText('The Pragmatic Programmer')).toBeInTheDocument();
    expect(screen.getByText('David Thomas')).toBeInTheDocument();
    expect(screen.getByText('$39.99')).toBeInTheDocument();
  });

  it('shows remaining stock count when in stock', () => {
    renderBookCard();
    expect(screen.getByText('5 in stock')).toBeInTheDocument();
  });

  it('shows "Out of stock" and disables the button when stock is 0', async () => {
    loginAndSeedBook({ ...sampleBook, stock: 0 });
    renderBookCard({ ...sampleBook, stock: 0 });

    await waitFor(() => expect(screen.getAllByText('Out of stock')).toHaveLength(2)); // stock label + button label
    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });
});

describe('BookCard — logged out', () => {
  it('shows a login prompt instead of an add-to-cart button', () => {
    renderBookCard();
    expect(screen.getByText('Log in to add to cart')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument();
  });
});

describe('BookCard — logged in, adding to cart', () => {
  it('shows "Adding…" then "Added ✓" then reverts to "Add to cart"', async () => {
    const user = userEvent.setup();
    loginAndSeedBook();
    renderBookCard();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Added ✓' })).toBeInTheDocument());

    // The button reverts back to its normal label ~1.5s after success —
    // real timers here for short, deliberate wait. Not worth the complexity
    // of coordinating fake timers with MSW's async response resolution.
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument(),
      { timeout: 2500 }
    );
  });

  it('shows the server error message when the request is rejected', async () => {
    const user = userEvent.setup();
    loginAndSeedBook();
    renderBookCard();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
    );

    // Force a rejection regardless of the book's actual stock
    // Simulates race condition case: UI still showed "5 in stock"
    // a moment ago, but the server now says otherwise.
    server.use(
      http.post('http://localhost:4000/cart/items', () =>
        HttpResponse.json({ error: 'Only 1 in stock' }, { status: 400 })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(await screen.findByText('Only 1 in stock')).toBeInTheDocument();
    // The button should return to its normal, clickable state after an
    // error — not get stuck showing "Adding…".
    expect(screen.getByRole('button', { name: 'Add to cart' })).not.toBeDisabled();
  });
});

describe('BookCard — category badge', () => {
  it('shows the category name when the book has one', () => {
    renderBookCard({ ...sampleBook, category: { id: 'c1', name: 'Programming' } });
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('renders no badge when the book has no category', () => {
    renderBookCard({ ...sampleBook, category: null });
    expect(screen.queryByText('Programming')).not.toBeInTheDocument();
  });
});
