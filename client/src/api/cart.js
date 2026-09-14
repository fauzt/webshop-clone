import { api } from './client';

export async function getCart() {
  const { data } = await api.get('/cart');
  return data; // { items, total }
}

export async function addToCart(bookId, quantity = 1) {
  const { data } = await api.post('/cart/items', { bookId, quantity });
  return data; // { item }
}

export async function updateCartItemQuantity(cartItemId, quantity) {
  const { data } = await api.put(`/cart/items/${cartItemId}`, { quantity });
  return data; // { item }
}

export async function removeCartItem(cartItemId) {
  await api.delete(`/cart/items/${cartItemId}`);
}
