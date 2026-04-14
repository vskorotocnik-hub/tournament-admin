import { apiFetch } from './api';

// ─── TYPES ──────────────────────────────────────────────

export interface RentalListingAdmin {
  id: string;
  ownerId: string;
  status: string;
  title: string;
  description: string | null;
  images: string[];
  collectionLevel: number;
  pubgId: string;
  pricePerHour: number;
  minHours: number;
  rentalTerms: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  listingType?: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; username: string; displayName: string | null; avatar: string | null };
  _count?: { rentals: number };
}

export interface RentalAdmin {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  status: string;
  pricePerHour: number;
  totalHours: number;
  totalPrice: number;
  siteFee: number;
  ownerPayout: number;
  ownerConfirmedAt: string | null;
  renterConfirmedAt: string | null;
  activeAt: string | null;
  expiresAt: string | null;
  pausedAt: string | null;
  remainingMs: number | null;
  disputeReason: string | null;
  disputeBy: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  completedAt: string | null;
  createdAt: string;
  listing: { title: string; images: string[] };
  renter: { id: string; username: string; displayName: string | null };
  owner: { id: string; username: string; displayName: string | null };
  messages?: any[];
  ratings?: any[];
}

// ─── LISTINGS ───────────────────────────────────────────

export function getPendingListings(): Promise<RentalListingAdmin[]> {
  return apiFetch('/api/admin/rental/pending-listings');
}

export function getAllListings(status?: string): Promise<RentalListingAdmin[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch(`/api/admin/rental/listings${qs}`);
}

export function approveListing(id: string): Promise<{ approved: boolean }> {
  return apiFetch(`/api/admin/rental/listing/${id}/approve`, { method: 'POST' });
}

export function rejectListing(id: string, reason: string): Promise<{ rejected: boolean }> {
  return apiFetch(`/api/admin/rental/listing/${id}/reject`, { method: 'POST', body: { reason } });
}

export function deleteListing(id: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/admin/rental/listing/${id}`, { method: 'DELETE' });
}

// ─── RENTALS ────────────────────────────────────────────

export function getAllRentals(status?: string): Promise<RentalAdmin[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch(`/api/admin/rental/rentals${qs}`);
}

export function getRentalDetail(id: string): Promise<RentalAdmin> {
  return apiFetch(`/api/admin/rental/${id}`);
}

export function resolveDispute(id: string, decision: string, partialOwnerPct?: number, note?: string): Promise<any> {
  return apiFetch(`/api/admin/rental/${id}/resolve`, { method: 'POST', body: { decision, partialOwnerPct, note } });
}

// ─── RENTAL CHAT (admin) ───────────────────────────────

export interface RentalMessageAdmin {
  id: string;
  rentalId: string;
  userId: string;
  content: string;
  isSystem: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export function getRentalMessages(id: string): Promise<RentalMessageAdmin[]> {
  return apiFetch(`/api/admin/rental/${id}/messages`);
}

export function sendAdminRentalMessage(id: string, content: string): Promise<RentalMessageAdmin> {
  return apiFetch(`/api/admin/rental/${id}/messages`, { method: 'POST', body: { content } });
}

export function checkExpired(): Promise<{ completed: number; cancelled: number }> {
  return apiFetch('/api/admin/rental/check-expired', { method: 'POST' });
}

// ─── STATS ─────────────────────────────────────────────

export interface RentalStats {
  total: number;
  active: number;
  disputed: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export function getRentalStats(): Promise<RentalStats> {
  return apiFetch('/api/admin/rental/stats');
}

// ─── FORCE CANCEL ──────────────────────────────────────

export function forceCancel(id: string): Promise<{ cancelled: boolean }> {
  return apiFetch(`/api/admin/rental/${id}/force-cancel`, { method: 'POST' });
}

// ─── REVIEWS MODERATION ────────────────────────────────

export interface ReviewAdmin {
  id: string;
  score: number;
  comment: string | null;
  serviceType: string;
  listingTitle: string | null;
  from: { id: string; nick: string };
  to: { id: string; nick: string };
  createdAt: string;
}

export function getReviews(): Promise<ReviewAdmin[]> {
  return apiFetch('/api/admin/rental/reviews');
}

export function deleteReview(id: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/admin/rental/reviews/${id}`, { method: 'DELETE' });
}
