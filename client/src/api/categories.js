import { api } from './client';

export async function listCategories() {
  const { data } = await api.get('/categories');
  return data; // { categories }
}

export async function createCategory(name) {
  const { data } = await api.post('/categories', { name });
  return data; // { category }
}

export async function updateCategory(id, name) {
  const { data } = await api.put(`/categories/${id}`, { name });
  return data; // { category }
}

export async function deleteCategory(id) {
  await api.delete(`/categories/${id}`);
}
