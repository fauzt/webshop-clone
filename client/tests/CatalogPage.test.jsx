import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../src/context/AuthContext';
import { CatalogPage } from '../src/pages/CatalogPage';
import { seedBooks } from './mocks/handlers';

function renderCatalog() {
  return render(
    <AuthProvider>
      <CatalogPage />
    </AuthProvider>
  );
}

function makeBook(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    author: overrides.author || 'Some Author',
    price: '19.99',
    stock: 3,
    ...overrides,
  };
}

describe('CatalogPage — loading and empty states', () => {
  it('shows a loading message, then the fetched books', async () => {
    seedBooks([makeBook({ id: '1', title: 'Clean Code', author: 'Robert Martin' })]);

    renderCatalog();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
  });

  it('shows "No books found." when the catalogue is empty', async () => {
    seedBooks([]);
    renderCatalog();

    await waitFor(() => expect(screen.getByText('No books found.')).toBeInTheDocument());
  });
});

describe('CatalogPage — search', () => {
  it('filters results after the debounce delay, without firing on every keystroke', async () => {
    const user = userEvent.setup();
    seedBooks([
      makeBook({ id: '1', title: 'Clean Code', author: 'Robert Martin' }),
      makeBook({ id: '2', title: 'The Pragmatic Programmer', author: 'David Thomas' }),
    ]);

    renderCatalog();
    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Search by title or author…'), 'pragmatic');

    // Immediately after typing, the debounce hasn't fired yet and both books
    // should still be visible.
    expect(screen.getByText('Clean Code')).toBeInTheDocument();

    // After the debounce delay (400ms) plus the mock request resolving,
    // only the matching book should remain.
    await waitFor(
      () => expect(screen.queryByText('Clean Code')).not.toBeInTheDocument(),
      { timeout: 2000 }
    );
    expect(screen.getByText('The Pragmatic Programmer')).toBeInTheDocument();
  });
});

describe('CatalogPage — pagination', () => {
  it('shows 12 books on page 1 and the remainder on page 2', async () => {
    const user = userEvent.setup();
    const books = Array.from({ length: 13 }, (_, i) =>
      makeBook({ id: String(i), title: `Book ${i}` })
    );
    seedBooks(books);

    renderCatalog();

    await waitFor(() => expect(screen.getByText('Book 0')).toBeInTheDocument());
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.queryByText('Book 12')).not.toBeInTheDocument(); // 13th book, index 12, is on page 2

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(screen.getByText('Book 12')).toBeInTheDocument());
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.queryByText('Book 0')).not.toBeInTheDocument();
  });

  it('does not show pagination controls when everything fits on one page', async () => {
    seedBooks([makeBook({ id: '1', title: 'Clean Code' })]);
    renderCatalog();

    await waitFor(() => expect(screen.getByText('Clean Code')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});
