import { apiFetch } from './api';

// ─── Products ────────────────────────────────────────────────

export interface UcProduct {
  id: string;
  ucAmount: number;
  label: string;
  price: number;
  costPrice: number;
  bonusUc: number;
  imageUrl: string | null;
  originalPrice: number | null;
  discountPercent: number;
  sortOrder: number;
  isActive: boolean;
  _count?: { codes: number };
}

export function getProducts(): Promise<UcProduct[]> {
  return apiFetch('/api/admin/uc/products');
}

export function createProduct(data: {
  ucAmount: number;
  label: string;
  price: number;
  costPrice?: number;
  bonusUc?: number;
  imageUrl?: string | null;
  originalPrice?: number | null;
  discountPercent?: number;
  sortOrder?: number;
}): Promise<UcProduct> {
  return apiFetch('/api/admin/uc/products', { method: 'POST', body: data });
}

export function updateProduct(id: string, data: Partial<UcProduct>): Promise<UcProduct> {
  return apiFetch(`/api/admin/uc/products/${id}`, { method: 'PUT', body: data });
}

export function deleteProduct(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/products/${id}`, { method: 'DELETE' });
}

export function uploadImage(imageData: string): Promise<{ url: string }> {
  return apiFetch('/api/admin/uc/upload-image', { method: 'POST', body: { imageData } });
}

// ─── Codes ───────────────────────────────────────────────────

export interface CodeStats {
  productId: string;
  label: string;
  ucAmount: number;
  price: number;
  costPrice: number;
  isActive: boolean;
  available: number;
  reserved: number;
  redeemed: number;
  invalid: number;
  expired: number;
  total: number;
}

export function getCodeStats(): Promise<CodeStats[]> {
  return apiFetch('/api/admin/uc/codes/stats');
}

export function addCodes(productId: string, codes: string[]): Promise<{ added: number; total: number }> {
  return apiFetch('/api/admin/uc/codes', { method: 'POST', body: { productId, codes } });
}

// ─── Orders ──────────────────────────────────────────────────

export interface PendingOrder {
  id: string;
  user: { id: string; nick: string };
  playerId: string;
  playerNick: string;
  status: string;
  price: number;
  productLabel: string;
  ucAmount: number;
  bonusUc: number;
  fullCode: string | null;
  createdAt: string;
}

export function getPendingOrders(): Promise<PendingOrder[]> {
  return apiFetch('/api/admin/uc/orders/pending');
}

export function completeOrder(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/orders/${id}/complete`, { method: 'POST' });
}

export function failOrder(id: string, reason?: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/orders/${id}/fail`, { method: 'POST', body: { reason } });
}

export function refundOrder(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/orders/${id}/refund`, { method: 'POST' });
}

export function retryOrder(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/orders/${id}/retry`, { method: 'POST' });
}

export interface AdminOrder {
  id: string;
  user: { id: string; nick: string };
  playerId: string;
  playerNick: string;
  status: string;
  price: number;
  productLabel: string;
  ucAmount: number;
  code: string | null;
  fullCode: string | null;
  botAttempts: number;
  botError: string | null;
  completedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export function getOrders(status?: string, page?: number): Promise<{ orders: AdminOrder[]; total: number; page: number; pages: number }> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  return apiFetch(`/api/admin/uc/orders?${params}`);
}

// ─── Withdrawal orders (WITHDRAWAL type UcOrders) ───────────

export interface AdminWithdrawal {
  id: string;
  user: { id: string; nick: string };
  playerId: string;
  playerNick: string | null;
  status: string;
  ucCost: number;
  productLabel: string;
  botAttempts: number;
  botError: string | null;
  completedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export function getWithdrawals(status?: string, page?: number): Promise<{ orders: AdminWithdrawal[]; total: number; page: number; pages: number }> {
  const params = new URLSearchParams();
  params.set('orderType', 'WITHDRAWAL');
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  return apiFetch(`/api/admin/uc/orders?${params}`);
}

export function adminRefundWithdrawal(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/orders/${id}/refund`, { method: 'POST' });
}

export function adminCompleteWithdrawal(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/uc/orders/${id}/complete`, { method: 'POST' });
}

// ─── Statistics ─────────────────────────────────────────────

export interface UcStats {
  orders: { completed: number; failed: number; pending: number; processing: number; manual: number; refunded: number; total: number };
  revenue: { total: number; cost: number; profit: number; today: number; todayOrders: number };
  codes: { available: number; total: number; redeemed: number; invalid: number };
  totalUserUcBalance: number;
}

export function getStats(): Promise<UcStats> {
  return apiFetch('/api/admin/uc/stats');
}

// ─── Marketplace Stats ──────────────────────────────────────

export interface MarketplaceSeller {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  deals: number;
  revenue: number;
  platformFees: number;
  sellerEarnings: number;
}

export interface MarketplaceStats {
  sellers: MarketplaceSeller[];
  totals: { deals: number; revenue: number; platformFees: number; sellerEarnings: number };
}

export function getMarketplaceStats(): Promise<MarketplaceStats> {
  return apiFetch('/api/admin/marketplace-stats');
}
