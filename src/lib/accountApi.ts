import { apiFetch } from './api';

// ─── TYPES ──────────────────────────────────────────────

export interface AccountListingAdmin {
  id: string;
  sellerId: string;
  category: string;
  status: string;
  title: string;
  description: string | null;
  images: string[];
  price: string;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  listingType?: string;
  createdAt: string;
  updatedAt: string;
  seller: { id: string; username: string; displayName: string | null; avatar: string | null };
  _count?: { deals: number };
}

export interface AccountDealAdmin {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  price: string;
  siteFee: string;
  sellerPayout: string;
  buyerGameId: string;
  sellerConfirmedAt: string | null;
  buyerConfirmedAt: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  disputeReason: string | null;
  disputeBy: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  completedAt: string | null;
  createdAt: string;
  listing: { title: string; images: string[]; category: string };
  buyer: { id: string; username: string; displayName: string | null };
  seller: { id: string; username: string; displayName: string | null };
}

export interface AccountMessageAdmin {
  id: string;
  dealId: string;
  userId: string;
  content: string;
  isSystem: boolean;
  isAdmin: boolean;
  visibility: string;
  createdAt: string;
}

export interface FlaggedAccount {
  id: string;
  gameUid: string;
  reason: string;
  flaggedBy: string;
  createdAt: string;
}

export interface PayoutScheduleItem {
  id: string;
  dealId: string;
  sellerId: string;
  amount: string;
  percentage: number;
  scheduledAt: string;
  paidAt: string | null;
  status: string;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: 'Аккаунты',
  COSTUME: 'Костюмы',
  CAR: 'Машины',
  METRO_ROYALE: 'Metro Royale',
  POPULARITY: 'Популярность',
  HOME_VOTES: 'Голоса дома',
  CLAN: 'Кланы',
};

export const CATEGORIES = ['ACCOUNT', 'COSTUME', 'CAR', 'METRO_ROYALE', 'POPULARITY', 'HOME_VOTES', 'CLAN'];

// ─── LISTINGS ───────────────────────────────────────────

export function getPendingListings(): Promise<AccountListingAdmin[]> {
  return apiFetch('/api/admin/account/pending-listings');
}

export function getAllListings(category?: string, status?: string): Promise<AccountListingAdmin[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  const qs = params.toString();
  return apiFetch(`/api/admin/account/listings${qs ? `?${qs}` : ''}`);
}

export function approveListing(id: string): Promise<{ approved: boolean }> {
  return apiFetch(`/api/admin/account/listing/${id}/approve`, { method: 'POST' });
}

export function rejectListing(id: string, reason: string): Promise<{ rejected: boolean }> {
  return apiFetch(`/api/admin/account/listing/${id}/reject`, { method: 'POST', body: { reason } });
}

// ─── DEALS ──────────────────────────────────────────────

export function getAllDeals(status?: string, category?: string): Promise<AccountDealAdmin[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  const qs = params.toString();
  return apiFetch(`/api/admin/account/deals${qs ? `?${qs}` : ''}`);
}

export function getDealMessages(id: string): Promise<AccountMessageAdmin[]> {
  return apiFetch(`/api/admin/account/deal/${id}/messages`);
}

export function sendAdminDealMessage(id: string, content: string): Promise<AccountMessageAdmin> {
  return apiFetch(`/api/admin/account/deal/${id}/messages`, { method: 'POST', body: { content } });
}

export function sendPrivateMessage(dealId: string, content: string, visibility: 'all' | 'seller' | 'buyer'): Promise<AccountMessageAdmin> {
  return apiFetch(`/api/admin/account/deal/${dealId}/private-message`, { method: 'POST', body: { content, visibility } });
}

export function resolveDispute(id: string, decision: string, partialSellerPct?: number, note?: string): Promise<any> {
  return apiFetch(`/api/admin/account/deal/${id}/resolve`, { method: 'POST', body: { decision, partialSellerPct, note } });
}

export function forceCancel(id: string): Promise<{ cancelled: boolean }> {
  return apiFetch(`/api/admin/account/deal/${id}/force-cancel`, { method: 'POST' });
}

// ─── STATS ─────────────────────────────────────────────

export interface CategoryStats {
  totalDeals: number;
  completedDeals: number;
  cancelledDeals: number;
  disputedDeals: number;
  resolvedDeals: number;
  activeDeals: number;
  revenue: number;
  totalVolume: number;
  avgCheck: number;
  conversionRate: number;
  listingFeeIncome: number;
  listingFeeCount: number;
}

export function getCategoryStats(category?: string): Promise<CategoryStats> {
  const qs = category ? `?category=${category}` : '';
  return apiFetch(`/api/admin/account/stats${qs}`);
}

// ─── CANCELLED DEALS ───────────────────────────────────

export function getCancelledDeals(category?: string): Promise<AccountDealAdmin[]> {
  const qs = category ? `?category=${category}` : '';
  return apiFetch(`/api/admin/account/cancelled${qs}`);
}

// ─── FLAGGED ACCOUNTS ──────────────────────────────

export function getFlaggedAccounts(): Promise<FlaggedAccount[]> {
  return apiFetch('/api/admin/flagged-accounts');
}

export function addFlaggedAccount(gameUid: string, reason: string): Promise<FlaggedAccount> {
  return apiFetch('/api/admin/flagged-accounts', { method: 'POST', body: { gameUid, reason } });
}

export function removeFlaggedAccount(id: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/admin/flagged-accounts/${id}`, { method: 'DELETE' });
}

export function getFlaggedListings(): Promise<AccountListingAdmin[]> {
  return apiFetch('/api/admin/account/listings/flagged');
}

// ─── PAYOUTS ──────────────────────────────────

export function getDealPayouts(dealId: string): Promise<PayoutScheduleItem[]> {
  return apiFetch(`/api/admin/account/deal/${dealId}/payouts`);
}

export function freezePayouts(dealId: string): Promise<{ frozen: number }> {
  return apiFetch(`/api/admin/account/deal/${dealId}/freeze-payouts`, { method: 'POST' });
}

export function unfreezePayouts(dealId: string): Promise<{ unfrozen: number }> {
  return apiFetch(`/api/admin/account/deal/${dealId}/unfreeze-payouts`, { method: 'POST' });
}

export function cancelPayoutsRefund(dealId: string): Promise<{ refunded: number; cancelledPayouts: number }> {
  return apiFetch(`/api/admin/account/deal/${dealId}/cancel-payouts-refund`, { method: 'POST' });
}

export function closeChat(dealId: string): Promise<{ closed: boolean }> {
  return apiFetch(`/api/admin/account/deal/${dealId}/close-chat`, { method: 'POST' });
}

export function reopenChat(dealId: string): Promise<{ reopened: boolean }> {
  return apiFetch(`/api/admin/account/deal/${dealId}/reopen-chat`, { method: 'POST' });
}

export function dismissDispute(dealId: string): Promise<{ dismissed: boolean }> {
  return apiFetch(`/api/admin/account/deal/${dealId}/dismiss-dispute`, { method: 'POST' });
}

export function deleteListing(id: string, reason: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/admin/account/listing/${id}`, { method: 'DELETE', body: { reason } });
}

// ─── SELLER VIDEO MODERATION ──────────────────────

export interface SellerVideoItem {
  dealId: string;
  status: string;
  price: number;
  sellerVideoUrl: string | null;
  sellerVideoStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  sellerVideoRejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  listing: { id: string; title: string; category: string; gameUid: string | null; images: string[] };
  buyer: { id: string; nick: string; avatar: string | null };
  seller: { id: string; nick: string; avatar: string | null };
}

export function getSellerVideos(): Promise<SellerVideoItem[]> {
  return apiFetch('/api/admin/account/seller-videos');
}

export function approveVideo(dealId: string): Promise<{ approved: boolean }> {
  return apiFetch(`/api/admin/account/seller-video/${dealId}/approve`, { method: 'POST' });
}

export function rejectVideo(dealId: string, reason: string): Promise<{ rejected: boolean }> {
  return apiFetch(`/api/admin/account/seller-video/${dealId}/reject`, { method: 'POST', body: { reason } });
}
