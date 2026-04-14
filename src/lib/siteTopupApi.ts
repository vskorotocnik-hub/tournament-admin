import { apiFetch } from './api';

export interface TopupOrder {
  id: string;
  userId: string;
  user: { id: string; username: string; displayName: string | null; avatar: string | null };
  ucAmount: number;
  bonusUc: number;
  price: number;
  label: string | null;
  status: 'APPROVED' | 'REJECTED';
  adminNote: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface OrdersResponse {
  orders: TopupOrder[];
  total: number;
  pending: number;
  page: number;
  pages: number;
}

export async function getOrders(params: {
  status?: string; page?: number; limit?: number;
} = {}): Promise<OrdersResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiFetch(`/api/admin/site-topup/orders?${qs}`);
}
