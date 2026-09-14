import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CartLineItem } from '../src/components/CartLineItem';
import { seedCart } from './mocks/handlers';

const sampleItem = {
  id: 'item-1',
  quantity: 2,
  book: { id: 'book-1', title: 'Clean Code', author: 'Robert Martin', price: '20.00', stock: 5 },
  subtotal: '40.00',
};

// Seeds the mock cart with a matching row so the real PUT/DELETE requests
// CartLineItem makes have something to act on, same reasoning as seeding
// fakeBooks before testing BookCard's add-to-cart call.
function seedMatchingCartRow(item = sampleItem) {
  seedCart([{ id: item.id, quantity: item.quantity, book: item.book }]);
}

describe('CartLineItem — rendering', () => {
  it('displays the book title, author, and subtotal', () => {
    seedMatchingCartRow();
    render(<CartLineItem item={sampleItem} onChange={() => {}} />);

    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Robert Martin')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // quantity
  });

  it('disables the decrement button at quantity 1', () => {
    const item = { ...sampleItem, quantity: 1, subtotal: '20.00' };
    seedMatchingCartRow(item);
    render(<CartLineItem item={item} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: '−' })).toBeDisabled();
  });
});

describe('CartLineItem — changing quantity', () => {
  it('increments the quantity and notifies the parent via onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    seedMatchingCartRow();
    render(<CartLineItem item={sampleItem} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '+' }));

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reverts the quantity and shows an error when the new amount exceeds stock', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Already at the stock ceiling — one more should be rejected.
    const item = {
      ...sampleItem,
      quantity: 5,
      book: { ...sampleItem.book, stock: 5 },
      subtotal: '100.00',
    };
    seedMatchingCartRow(item);
    render(<CartLineItem item={item} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '+' }));

    expect(await screen.findByText('Only 5 in stock')).toBeInTheDocument();
    // The displayed quantity should revert to what it was before the
    // rejected attempt, not stay at the invalid 6.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('6')).not.toBeInTheDocument();
    // A failed update is not a real cart change — the parent shouldn't
    // re-fetch based on an update that never actually happened.
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('CartLineItem — removing', () => {
  it('calls onChange after successfully removing the item', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    seedMatchingCartRow();
    render(<CartLineItem item={sampleItem} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });
});
