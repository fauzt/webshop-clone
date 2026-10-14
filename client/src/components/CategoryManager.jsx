import { useState } from 'react';
import { createCategory, updateCategory, deleteCategory } from '../api/categories';

export function CategoryManager({ categories, onChanged }) {
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Controls which category is being renamed inline: null means none.
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createCategory(newName);
      setNewName('');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create category.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startRename(category) {
    setRenamingId(category.id);
    setRenameValue(category.name);
    setError(null);
  }

  async function handleRename(e, categoryId) {
    e.preventDefault();
    setError(null);
    try {
      await updateCategory(categoryId, renameValue);
      setRenamingId(null);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not rename category.');
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    setDeletingId(category.id);
    setError(null);
    try {
      await deleteCategory(category.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || `Could not delete "${category.name}".`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h2 className="font-medium text-slate-900">Categories</h2>

      <ul className="mt-3 divide-y divide-slate-100">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between py-2 text-sm">
            {renamingId === category.id ? (
              <form onSubmit={(e) => handleRename(e, category.id)} className="flex flex-1 gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <button type="submit" className="text-slate-900 hover:underline">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className="text-slate-500 hover:underline"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span className="text-slate-900">{category.name}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => startRename(category)}
                    className="text-slate-700 hover:text-slate-900"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={deletingId === category.id}
                    className="text-slate-700 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === category.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="py-2 text-sm text-slate-500">No categories yet.</li>
        )}
      </ul>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="mt-3 flex gap-2">
        <input
          required
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}
