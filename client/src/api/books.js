import { api } from './client';

// params: { page, limit, search, categoryId, sort }
export async function listBooks(params) {
  const { data } = await api.get('/books', { params });
  return data; // { books, pagination }
}

// bookData: title, author, description, price, stock,
// optional: coverImage, categoryId
export async function createBook(bookData) {
  const { data } = await api.post('/books', bookData);
  return data;
}

export async function updateBook(id, bookData) {
  const { data } = await api.put(`/books/${id}`, bookData);
  return data; // { book }
}
 
export async function deleteBook(id) {
  await api.delete(`/books/${id}`);
}
