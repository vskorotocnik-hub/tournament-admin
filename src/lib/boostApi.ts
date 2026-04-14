import { apiFetch } from './api';

// ─── TYPES ──────────────────────────────────────────────

export interface BoostListingAdmin {
  id: string;
  sellerId: string;
  type: string; // ACCOUNT | TEAM
  status: string;
  gameName: string;
  shortDesc: string;
  fullDesc: string;
  avatar: string | null;
  images: string[];
  platform: string;
  pricePerRank: Record<string, number> | null;
  pricePerHour: string | null;
  realName: string | null;
  age: number | null;
  gender: string | null;
  yearsPlaying: number | null;
  hasMic: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  listingType: string;
  createdAt: string;
  seller: { id: string; username: string; displayName: string | null; avatar: string | null };
}

export interface BoostDealAdmin {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  boostType: string;
  selectedRank: string | null;
  ratingAmount: number | null;
  hoursCount: number | null;
  price: string;
  siteFee: string;
  sellerPayout: string;
  disputeReason: string | null;
  disputeBy: string | null;
  resolution: string | null;
  createdAt: string;
  listing: { gameName: string; type: string; avatar: string | null };
  buyer: { id: string; username: string; displayName: string | null };
  seller: { id: string; username: string; displayName: string | null };
}

export interface BoostMessageAdmin {
  id: string;
  dealId: string;
  userId: string;
  content: string;
  isSystem: boolean;
  isAdmin: boolean;
  createdAt: string;
}

// ─── LISTINGS ───────────────────────────────────────────

export function getPendingListings(): Promise<BoostListingAdmin[]> {
  return apiFetch('/api/admin/boost/listings/pending');
}

export function getAllListings(params?: { status?: string; type?: string }): Promise<BoostListingAdmin[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.type) qs.set('type', params.type);
  const q = qs.toString();
  return apiFetch(`/api/admin/boost/listings${q ? `?${q}` : ''}`);
}

export function approveListing(id: string): Promise<{ approved: boolean }> {
  return apiFetch(`/api/admin/boost/listings/${id}/approve`, { method: 'POST' });
}

export function rejectListing(id: string, reason: string): Promise<{ rejected: boolean }> {
  return apiFetch(`/api/admin/boost/listings/${id}/reject`, { method: 'POST', body: { reason } });
}

// ─── DEALS ──────────────────────────────────────────────

export function getAllDeals(params?: { status?: string; type?: string }): Promise<BoostDealAdmin[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.type) qs.set('type', params.type);
  const q = qs.toString();
  return apiFetch(`/api/admin/boost/deals${q ? `?${q}` : ''}`);
}

export function getDealMessages(dealId: string): Promise<BoostMessageAdmin[]> {
  return apiFetch(`/api/admin/boost/deals/${dealId}/messages`);
}

export function sendDealMessage(dealId: string, content: string): Promise<BoostMessageAdmin> {
  return apiFetch(`/api/admin/boost/deals/${dealId}/message`, { method: 'POST', body: { content } });
}

export function resolveDispute(dealId: string, decision: 'refund' | 'payout', comment: string): Promise<{ resolved: boolean }> {
  return apiFetch(`/api/admin/boost/deals/${dealId}/resolve`, { method: 'POST', body: { decision, comment } });
}

export function forceCancel(dealId: string, reason: string): Promise<{ cancelled: boolean }> {
  return apiFetch(`/api/admin/boost/deals/${dealId}/force-cancel`, { method: 'POST', body: { reason } });
}

// ─── STATS ─────────────────────────────────────────────

export interface BoostStats {
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

export function getStats(): Promise<BoostStats> {
  return apiFetch('/api/admin/boost/stats');
}

export function splitPayout(dealId: string, buyerPct: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/boost/deals/${dealId}/split`, { method: 'POST', body: { buyerPct } });
}

export function dismissDispute(dealId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/boost/deals/${dealId}/dismiss-dispute`, { method: 'POST' });
}
