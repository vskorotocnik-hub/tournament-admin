import { apiFetch } from './api';

export type InboxPriority = 'normal' | 'high' | 'urgent';
export type AdminMessageVisibility = 'OWNER_ONLY' | 'ALL_ADMINS';
export type AdminMessageStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type AdminMessagePriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface InboxItem {
  id: string;
  type: string;
  section: string;
  icon: string;
  title: string;
  subtitle: string;
  createdAt: string;
  priority: InboxPriority;
  link: string;
  capability: string;
  message?: {
    id: string;
    body: string;
    visibility: AdminMessageVisibility;
    createdBy: { id: string; username: string | null } | null;
  };
}

export interface InboxCounts {
  total: number;
  urgent: number;
  ownerInbox: number;
  bySection: Record<string, number>;
}

export interface AdminMessage {
  id: string;
  title: string;
  body: string;
  link: string | null;
  sourceType: string | null;
  sourceId: string | null;
  visibility: AdminMessageVisibility;
  priority: AdminMessagePriority;
  status: AdminMessageStatus;
  createdBy: { id: string; username: string | null } | null;
  resolvedBy: { id: string; username: string | null } | null;
  resolvedAt: string | null;
  resolveNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export const inboxApi = {
  feed: () => apiFetch<{ items: InboxItem[]; total: number }>('/api/admin/inbox'),
  counts: () => apiFetch<InboxCounts>('/api/admin/inbox/counts'),

  listMessages: (status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL' = 'OPEN') =>
    apiFetch<{ messages: AdminMessage[] }>(`/api/admin/inbox/messages?status=${status}`),

  create: (body: {
    title: string;
    body: string;
    visibility: AdminMessageVisibility;
    priority?: AdminMessagePriority;
    link?: string;
    sourceType?: string;
    sourceId?: string;
    payload?: unknown;
  }) => apiFetch<AdminMessage>('/api/admin/inbox/messages', { method: 'POST', body }),

  resolve: (id: string, note?: string) =>
    apiFetch<AdminMessage>(`/api/admin/inbox/messages/${id}/resolve`, {
      method: 'POST',
      body: { note },
    }),

  dismiss: (id: string, note?: string) =>
    apiFetch<AdminMessage>(`/api/admin/inbox/messages/${id}/dismiss`, {
      method: 'POST',
      body: { note },
    }),
};
