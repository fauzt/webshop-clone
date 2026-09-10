import { api } from './client';

// params: { page, limit, search, categoryId, sort }
export async function listBooks(params) {
  const { data } = await api.get('/books', { params });
  return data; // { books, pagination }
}
