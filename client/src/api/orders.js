import { api } from './client';

export async function checkout() {
  const { data } = await api.post('/orders/checkout');
  return data; // { order }
}
