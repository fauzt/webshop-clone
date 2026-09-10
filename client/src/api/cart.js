import { api } from './client';

export async function addToCart(bookId, quantity = 1) {
  const { data } = await api.post('/cart/items', { bookId, quantity });
  return data; // { item }
}
