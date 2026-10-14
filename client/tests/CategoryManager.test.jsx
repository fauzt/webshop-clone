import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { CategoryManager } from '../src/components/CategoryManager';
import { server } from './mocks/server';
import { seedCategories } from './mocks/handlers';

const sampleCategories = [
  { id: 'cat-1', name: 'Fantasy' },
  { id: 'cat-2', name: 'Sci-Fi' },
];

describe('CategoryManager — rendering', () => {
  it('lists the given categories', () => {
    render(<CategoryManager categories={sampleCategories} onChanged={() => {}} />);

    expect(screen.getByText('Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('shows a placeholder when there are no categories', () => {
    render(<CategoryManager categories={[]} onChanged={() => {}} />);

    expect(screen.getByText('No categories yet.')).toBeInTheDocument();
  });
});

describe('CategoryManager — creating', () => {
  it('creates a category and notifies the parent via onChanged', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    seedCategories([]);
    render(<CategoryManager categories={[]} onChanged={onChanged} />);

    await user.type(screen.getByPlaceholderText('New category name'), 'Horror');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('shows the server error message on a duplicate name, without calling onChanged', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    seedCategories(sampleCategories);
    render(<CategoryManager categories={sampleCategories} onChanged={onChanged} />);

    await user.type(screen.getByPlaceholderText('New category name'), 'Fantasy');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('A category with this name already exists')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe('CategoryManager — renaming', () => {
  it('renames a category and notifies the parent via onChanged', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    seedCategories(sampleCategories);
    render(<CategoryManager categories={sampleCategories} onChanged={onChanged} />);

    await user.click(screen.getAllByRole('button', { name: 'Rename' })[0]);
    const input = screen.getByDisplayValue('Fantasy');
    await user.clear(input);
    await user.type(input, 'Epic Fantasy');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });
});

describe('CategoryManager — deleting', () => {
  it('deletes a category after confirmation and notifies the parent via onChanged', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seedCategories(sampleCategories);
    render(<CategoryManager categories={sampleCategories} onChanged={onChanged} />);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    window.confirm.mockRestore();
  });

  it('does not delete when the confirmation is declined', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    seedCategories(sampleCategories);
    render(<CategoryManager categories={sampleCategories} onChanged={onChanged} />);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(onChanged).not.toHaveBeenCalled();
    window.confirm.mockRestore();
  });

  it('shows the server error message when the category still has books assigned', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seedCategories(sampleCategories);
    server.use(
      http.delete('http://localhost:4000/categories/:id', () =>
        HttpResponse.json(
          { error: 'Cannot delete a category that still has books assigned to it' },
          { status: 409 }
        )
      )
    );
    render(<CategoryManager categories={sampleCategories} onChanged={onChanged} />);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(
      await screen.findByText('Cannot delete a category that still has books assigned to it')
    ).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    window.confirm.mockRestore();
  });
});
