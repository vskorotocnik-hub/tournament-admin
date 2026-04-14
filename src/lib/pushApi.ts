import { apiFetch } from './api';

// ─── Types ───────────────────────────────────────────────────

export interface NotificationSetting {
  id: string;
  type: string;
  enabled: boolean;
  title: string;
  body: string;
  icon: string | null;
  updatedAt: string;
}

export interface TgSubscriber {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  email: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SearchUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface PushStats {
  totalUsers: number;
  telegramSubscribers: number;
  newSubsThisWeek: number;
  newSubsThisMonth: number;
  activeThisWeek: number;
}

// ─── Labels ──────────────────────────────────────────────────

export const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  CHAT_MESSAGE:      { label: 'Чат турнира',       desc: 'Новое сообщение в турнирном чате',             icon: '💬' },
  TOURNAMENT_FOUND:  { label: 'Турнир найден',     desc: 'Турнир начинается — заходите в игру',          icon: '🎮' },
  TOURNAMENT_RESULT: { label: 'Результат матча',   desc: 'Победа/поражение в турнире',                   icon: '🏆' },
  UC_ORDER_COMPLETE: { label: 'UC зачислены',      desc: 'UC успешно отправлены на аккаунт',             icon: '💎' },
  UC_ORDER_FAILED:   { label: 'Ошибка UC',         desc: 'Не удалось выполнить заказ, средства возвращены', icon: '❌' },
  BALANCE_CREDIT:    { label: 'Баланс',            desc: 'Пополнение баланса',                           icon: '💰' },
  DEAL_MESSAGE:      { label: 'Чат сделки',        desc: 'Новое сообщение в чате сделки аккаунта',       icon: '📩' },
  DEAL_STATUS:       { label: 'Статус сделки',     desc: 'Изменение статуса сделки аккаунта',            icon: '📦' },
  BOOST_STATUS:      { label: 'Статус буста',      desc: 'Изменение статуса буст-заказа',                icon: '⚡' },
  BOOST_MESSAGE:     { label: 'Чат буста',         desc: 'Новое сообщение в чате буста',                 icon: '💬' },
  REFERRAL_BONUS:    { label: 'Реф. бонус',        desc: 'Начислен реферальный бонус',                   icon: '🎁' },
  ADMIN_BROADCAST:   { label: 'Рассылка',          desc: 'Ручная рассылка от администратора',             icon: '📢' },
  SUPPORT_MESSAGE:   { label: 'Поддержка',         desc: 'Ответ поддержки / системное уведомление',      icon: '🛟' },
  RENTAL_MESSAGE:    { label: 'Чат аренды',        desc: 'Новое сообщение в чате аренды',                icon: '📝' },
  RENTAL_STATUS:     { label: 'Статус аренды',     desc: 'Изменение статуса аренды',                     icon: '🔑' },
};

// ─── API ─────────────────────────────────────────────────────

export async function getSettings(): Promise<NotificationSetting[]> {
  const data = await apiFetch<{ settings: NotificationSetting[] }>('/api/admin/push/settings');
  return data.settings;
}

export async function updateSetting(type: string, updates: Partial<Pick<NotificationSetting, 'enabled' | 'title' | 'body' | 'icon'>>): Promise<NotificationSetting> {
  const data = await apiFetch<{ setting: NotificationSetting }>(`/api/admin/push/settings/${type}`, {
    method: 'PUT',
    body: updates,
  });
  return data.setting;
}

export async function getStats(): Promise<PushStats> {
  return apiFetch('/api/admin/push/stats');
}

export async function broadcast(title: string, body: string, url?: string, userIds?: string[]): Promise<{ sent: number }> {
  return apiFetch<{ sent: number }>('/api/admin/push/broadcast', {
    method: 'POST',
    body: { title, body, url, userIds },
  });
}

export async function getSubscribers(page = 1, limit = 20, search = ''): Promise<{ subscribers: TgSubscriber[]; total: number; page: number; pages: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return apiFetch(`/api/admin/push/subscribers?${params}`);
}

export async function searchUsers(q: string): Promise<SearchUser[]> {
  if (!q || q.length < 2) return [];
  const data = await apiFetch<{ users: SearchUser[] }>(`/api/admin/push/users-search?q=${encodeURIComponent(q)}`);
  return data.users;
}
