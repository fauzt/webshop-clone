import { api } from './client';

export async function checkout() {
  const { data } = await api.post('/orders/checkout');
  return data; // { order }
}

export async function listOrders() {
  const { data } = await api.get('/orders');
  return data; // { orders }
}
