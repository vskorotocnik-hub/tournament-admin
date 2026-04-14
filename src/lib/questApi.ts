import { apiFetch } from './api';

// ─── Types ──────────────────────────────────────────────────

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  conditionType: string;
  conditionParams: Record<string, any>;
  rewardType: 'USD' | 'UC';
  rewardAmount: number;
  targetValue: number;
  maxParticipants: number | null;
  sortOrder: number;
  isDaily: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  totalParticipants: number;
  completedCount: number;
  pendingReviewCount: number;
  totalRewardGiven: number;
}

export interface QuestProgressItem {
  id: string;
  questId: string;
  userId: string;
  currentValue: number;
  status: 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'REJECTED';
  claimedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export interface QuestDetail extends Omit<Quest, 'totalParticipants' | 'completedCount' | 'pendingReviewCount'> {
  progress: QuestProgressItem[];
}

export interface CreateQuestData {
  title: string;
  description: string;
  icon?: string;
  conditionType: string;
  conditionParams?: Record<string, any>;
  rewardType?: 'USD' | 'UC';
  rewardAmount: number;
  targetValue?: number;
  maxParticipants?: number | null;
  sortOrder?: number;
  isDaily?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
}

// ─── API ────────────────────────────────────────────────────

export function listQuests(): Promise<Quest[]> {
  return apiFetch('/api/admin/quests');
}

export function getQuest(id: string): Promise<QuestDetail> {
  return apiFetch(`/api/admin/quests/${id}`);
}

export function createQuest(data: CreateQuestData): Promise<Quest> {
  return apiFetch('/api/admin/quests', { method: 'POST', body: data });
}

export function updateQuest(id: string, data: Partial<CreateQuestData> & { status?: string }): Promise<Quest> {
  return apiFetch(`/api/admin/quests/${id}`, { method: 'PUT', body: data });
}

export function deleteQuest(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/quests/${id}`, { method: 'DELETE' });
}

export function approveProgress(progressId: string, note?: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/quests/progress/${progressId}/approve`, {
    method: 'POST',
    body: { note },
  });
}

export function rejectProgress(progressId: string, note?: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/quests/progress/${progressId}/reject`, {
    method: 'POST',
    body: { note },
  });
}

export function duplicateQuest(id: string): Promise<Quest> {
  return apiFetch(`/api/admin/quests/${id}/duplicate`, { method: 'POST' });
}
