import { apiFetch } from './api';

export type ModerationStatus = 'PENDING' | 'DISMISSED' | 'RESOLVED';
export type ModerationReason =
  | 'EXTERNAL_PLATFORM'
  | 'OFFSITE_CONTACT'
  | 'SUSPICIOUS_LINK'
  | 'TOXICITY'
  | 'OTHER';

export interface ModerationFlag {
  id: string;
  chatType: string;
  chatRefId: string;
  messageId: string;
  userId: string;
  snippet: string;
  reason: ModerationReason;
  details: { matches?: string[] } | null;
  status: ModerationStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isBanned: boolean;
  };
}

export interface ThreadMessage {
  id: string;
  userId: string | null;
  content: string;
  createdAt: string;
  isSystem?: boolean;
  isAdmin?: boolean;
  senderType: 'user' | 'system' | 'support' | 'admin';
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null;
}

export interface ListFlagsResponse {
  flags: ModerationFlag[];
  total: number;
  pendingCount: number;
  page: number;
  totalPages: number;
}

export const moderationApi = {
  listFlags: (status: ModerationStatus | 'all' = 'PENDING', page = 1) =>
    apiFetch<ListFlagsResponse>(`/api/admin/moderation/flags?status=${status}&page=${page}`),

  getThread: (flagId: string) =>
    apiFetch<{ flag: ModerationFlag; thread: ThreadMessage[] }>(
      `/api/admin/moderation/flags/${flagId}/thread`,
    ),

  resolve: (flagId: string, status: 'DISMISSED' | 'RESOLVED', note?: string) =>
    apiFetch<ModerationFlag>(`/api/admin/moderation/flags/${flagId}/resolve`, {
      method: 'POST',
      body: { status, note: note ?? null },
    }),
};
