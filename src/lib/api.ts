import { normalizeI18nResponse } from './i18n';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── ХРАНЕНИЕ ТОКЕНОВ ───────────────────────────────────────

const TOKEN_KEY = 'admin_access_token';
const REFRESH_KEY = 'admin_refresh_token';

export function getStoredTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── ОБНОВЛЕНИЕ ТОКЕНА ──────────────────────────────────────

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function refreshAccessToken(): Promise<AuthTokens | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data = await res.json();
      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      storeTokens(newTokens);
      return newTokens;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── ЗАПРОСЫ К API ──────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;
  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const tokens = getStoredTokens();

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (tokens?.accessToken) {
    reqHeaders['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && tokens?.refreshToken) {
    const newTokens = await refreshAccessToken();
    if (newTokens) {
      reqHeaders['Authorization'] = `Bearer ${newTokens.accessToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
    let msg = error.debug ? `${error.error}: ${error.debug}` : (error.error || 'Ошибка сервера');
    // Append field-level validation details if present
    if (error.details && typeof error.details === 'object') {
      const fieldErrors = Object.entries(error.details)
        .filter(([, v]) => Array.isArray(v) && (v as string[]).length > 0)
        .map(([field, errs]) => `• ${field}: ${(errs as string[]).join(', ')}`)
        .join('\n');
      if (fieldErrors) msg = `${msg}\n${fieldErrors}`;
    }
    throw new ApiError(res.status, msg, error.details);
  }

  const json = await res.json();
  return normalizeI18nResponse(json) as T;
}

// ─── ТИПЫ ───────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  avatar: string | null;
  balance: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: { id: string; username: string; email: string | null };
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: AuthUser;
}

export interface AdminUserItem {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  avatar: string | null;
  balance: number;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  telegramAuth: { telegramId: string; username: string | null } | null;
  googleAuth: { email: string } | null;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminStatsResponse {
  totalUsers: number;
  usersThisWeek: number;
  usersThisMonth: number;
  bannedUsers: number;
  verifiedUsers: number;
  activeLastWeek: number;
  totalBalance: number;
}

export interface FinanceStatsResponse {
  platform: {
    rentalFees: number;
    tournamentFeesTDM: number;
    tournamentFeesWoW: number;
    classicRevenue: number;
    listingFees: number;
    clanFees: number;
    totalUSD: number;
    totalUC: number;
  };
  userEarnings: {
    rentalPayouts: number;
    tournamentPrizes: number;
    classicPrizes: number;
    clanPayouts: number;
    totalUSD: number;
    totalUC: number;
  };
  volume: {
    totalTransactions: number;
    debitUSD: number;
    creditUSD: number;
    debitUC: number;
    creditUC: number;
    escrowHeld: number;
    escrowCount: number;
  };
  rentals: {
    total: number; active: number; disputed: number; completed: number; cancelled: number;
    totalVolume: number; platformRevenue: number; ownerPayouts: number;
    listingFees: number; listingCount: number;
  };
  tournaments: {
    tdm: { total: number; searching: number; inProgress: number; completed: number; revenue: number; prizes: number };
    wow: { total: number; searching: number; inProgress: number; completed: number; revenue: number; prizes: number };
    classic: { total: number; registration: number; inProgress: number; completed: number; entryFeesCollected: number; prizesAwarded: number; revenue: number };
  };
  withdrawals: { total: number; pending: number; completed: number; rejected: number; totalAmount: number };
  chart: Array<{ date: string; rental: number; listing: number; tournament: number; classic: number; total: number }>;
  topEarners: Array<{ userId: string; nick: string; totalEarned: number }>;
  recentTransactions: Array<{
    id: string;
    user: { id: string; nick: string };
    type: string; currency: string; amount: number; reason: string; createdAt: string;
  }>;
}

// ─── АВТОРИЗАЦИЯ ────────────────────────────────────────────

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: data }),

  me: () => apiFetch<MeResponse>('/api/auth/me'),

  logout: (refreshToken: string) =>
    apiFetch('/api/auth/logout', { method: 'POST', body: { refreshToken } }),

  setup: () =>
    apiFetch<{ message: string }>('/api/admin/setup', { method: 'POST' }),
};

// ─── АДМИН API ──────────────────────────────────────────────

export const adminApi = {
  stats: () =>
    apiFetch<AdminStatsResponse>('/api/admin/stats'),

  financeStats: (days = 30) =>
    apiFetch<FinanceStatsResponse>(`/api/admin/stats/finance?days=${days}`),

  users: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    const qs = query.toString();
    return apiFetch<AdminUsersResponse>(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },

  getUser: (id: string) =>
    apiFetch<AdminUserItem>(`/api/admin/users/${id}`),

  banUser: (id: string, isBanned: boolean, reason?: string) =>
    apiFetch<{ id: string; username: string; isBanned: boolean }>(`/api/admin/users/${id}/ban`, { method: 'PATCH', body: { isBanned, reason } }),

  changeRole: (id: string, role: string) =>
    apiFetch<{ id: string; username: string; role: string }>(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),

  changeBalance: (id: string, amount: number, reason: string) =>
    apiFetch<{ id: string; username: string; balance: number }>(`/api/admin/users/${id}/balance`, { method: 'PATCH', body: { amount, reason } }),

  changeUcBalance: (id: string, amount: number, reason: string) =>
    apiFetch<{ id: string; username: string; ucBalance: number }>(`/api/admin/users/${id}/uc-balance`, { method: 'PATCH', body: { amount, reason } }),

  deleteUser: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  getUserTransactions: (id: string, page = 1) =>
    apiFetch<{
      user: { id: string; username: string; ucBalance: number };
      transactions: Array<{ id: string; type: string; currency: string; amount: number; balanceAfter: number; reason: string; refType: string | null; refId: string | null; createdAt: string }>;
      total: number; page: number; totalPages: number;
    }>(`/api/admin/users/${id}/transactions?page=${page}&limit=50`),

  // Site Config
  getConfig: () =>
    apiFetch<Record<string, string>>('/api/admin/config'),
  updateConfig: (data: Record<string, string>) =>
    apiFetch<{ ok: boolean }>('/api/admin/config', { method: 'PUT', body: data }),

  // Withdrawals
  listWithdrawals: (status?: string) =>
    apiFetch<{ requests: Array<{ id: string; userId: string; username: string; avatar: string | null; userUcBalance: number; amount: number; gameId: string; status: string; adminId: string | null; adminNote: string | null; processedAt: string | null; createdAt: string }>; total: number }>(
      `/api/admin/withdrawals${status ? `?status=${status}` : ''}`
    ),
  completeWithdrawal: (id: string, note?: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/withdrawals/${id}/complete`, { method: 'PATCH', body: { note } }),
  rejectWithdrawal: (id: string, note: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/withdrawals/${id}/reject`, { method: 'PATCH', body: { note } }),

  // Tournaments
  tournamentAlerts: () =>
    apiFetch<{ openDisputes: number; searchingLong: number; classicRegOpen: number }>('/api/admin/tournaments/alerts'),

  tournamentRevenueChart: () =>
    apiFetch<{ days: Array<{ date: string; tdm: number; wow: number; total: number }> }>('/api/admin/tournaments/revenue-chart'),

  tournamentAdminLog: () =>
    apiFetch<{ log: Array<{ id: string; content: string; adminName: string; tournamentId: string; gameType: string; tournamentStatus: string; createdAt: string }> }>('/api/admin/tournaments/admin-log'),

  tournamentStats: () =>
    apiFetch<{
      tdm: { total: number; searching: number; inProgress: number; completed: number; cancelled: number; disputed: number; revenue: number; players: number };
      wow: { total: number; searching: number; inProgress: number; completed: number; cancelled: number; disputed: number; revenue: number; players: number };
      classic: { total: number; registration: number; inProgress: number; completed: number; cancelled: number; totalPrizePool: number; players: number };
    }>('/api/admin/tournaments/stats'),

  tournaments: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    const qs = query.toString();
    return apiFetch<AdminTournamentsResponse>(`/api/admin/tournaments${qs ? `?${qs}` : ''}`);
  },

  getTournament: (id: string) =>
    apiFetch<AdminTournamentDetail>(`/api/admin/tournaments/${id}`),

  sendMessage: (tournamentId: string, content: string, imageUrl?: string) =>
    apiFetch<AdminMessage>(`/api/admin/tournaments/${tournamentId}/messages`, { method: 'POST', body: { content, imageUrl } }),

  resolveDispute: (disputeId: string, resolution: string, winnerId?: string) =>
    apiFetch<{ resolved: boolean }>(`/api/admin/disputes/${disputeId}/resolve`, { method: 'POST', body: { resolution, winnerId } }),

  assignWinner: (tournamentId: string, winnerId: string, resolution: string) =>
    apiFetch<{ resolved: boolean }>(`/api/admin/tournaments/${tournamentId}/assign-winner`, { method: 'POST', body: { winnerId, resolution } }),

  cancelTournament: (tournamentId: string) =>
    apiFetch<{ cancelled: boolean; refunded: number }>(`/api/admin/tournaments/${tournamentId}/cancel`, { method: 'POST' }),
};

// ─── TOURNAMENT ADMIN TYPES ─────────────────────────────────

export interface AdminTournamentItem {
  id: string;
  status: string;
  teamMode: string;
  teamCount: number;
  bet: number;
  server: string;
  prizePool: number;
  platformFee: number;
  createdAt: string;
  teams: { id: string; slot: number; players: { user: { id: string; username: string; avatar: string | null }; isCaptain: boolean }[] }[];
  disputes: { id: string; reporterId: string; reason: string; status: string }[];
  _count: { messages: number; disputes: number };
}

export interface AdminTournamentsResponse {
  tournaments: AdminTournamentItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminMessage {
  id: string;
  content: string;
  isSystem: boolean;
  isAdmin: boolean;
  imageUrl: string | null;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
}

export interface AdminDispute {
  id: string;
  tournamentId: string;
  matchId: string;
  reporterId: string;
  reason: string;
  videoUrl: string | null;
  response: string | null;
  responderId: string | null;
  status: string;
  resolution: string | null;
  resolvedById: string | null;
  createdAt: string;
}

export interface AdminTournamentDetail {
  id: string;
  status: string;
  teamMode: string;
  teamCount: number;
  bet: number;
  server: string;
  prizePool: number;
  platformFee: number;
  createdAt: string;
  teams: { id: string; slot: number; players: { user: { id: string; username: string; avatar: string | null }; isCaptain: boolean }[] }[];
  matches: { id: string; round: number; matchOrder: number; status: string; teamAId: string | null; teamBId: string | null; winnerId: string | null }[];
  disputes: AdminDispute[];
  messages: AdminMessage[];
}

// ─── WOW MAP TYPES ──────────────────────────────────────────

export interface WoWMapAdmin {
  id: string;
  mapId: string;
  name: string;
  image: string;
  format: string;
  teamCount: number;
  playersPerTeam: number;
  rounds: number;
  rules: string | null;
  rating: number;
  gamesPlayed: number;
  isActive: boolean;
  prizeDistribution: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { tournaments: number };
}

// ─── CLASSIC TOURNAMENT TYPES ────────────────────────────────

export interface ClassicTournamentItem {
  id: string;
  title: string | null;
  description: string | null;
  map: string;
  mapImage: string | null;
  mode: string;
  server: string;
  startTime: string;
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  winnerCount: number;
  prize1: number;
  prize2: number;
  prize3: number;
  status: string;
  createdBy: string;
  winner1Id: string | null;
  winner2Id: string | null;
  winner3Id: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  _count: { registrations: number };
}

export interface ClassicRegistrationItem {
  id: string;
  tournamentId: string;
  userId: string;
  pubgIds: string[];
  place: number | null;
  prizeAmount: number;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  _count: { messages: number };
}

export interface ClassicTournamentDetail extends ClassicTournamentItem {
  registrations: ClassicRegistrationItem[];
}

export interface ClassicMessageItem {
  id: string;
  registrationId: string;
  userId: string;
  content: string;
  isSystem: boolean;
  isAdmin: boolean;
  imageUrl: string | null;
  createdAt: string;
}

export interface ClassicChatItem {
  registrationId: string;
  user: { id: string; username: string; avatar: string | null };
  tournament: { id: string; title: string | null; map: string; mode: string; status: string };
  messageCount: number;
  lastMessage: { content: string; createdAt: string; isAdmin: boolean } | null;
}

// ─── CLASSIC TOURNAMENT ADMIN API ───────────────────────────

export const classicApi = {
  list: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    const qs = query.toString();
    return apiFetch<{ tournaments: ClassicTournamentItem[]; total: number; page: number; totalPages: number }>(
      `/api/admin/classic${qs ? `?${qs}` : ''}`
    );
  },

  get: (id: string) =>
    apiFetch<ClassicTournamentDetail>(`/api/admin/classic/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch<ClassicTournamentItem>('/api/admin/classic', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<ClassicTournamentItem>(`/api/admin/classic/${id}`, { method: 'PUT', body: data }),

  start: (id: string) =>
    apiFetch<ClassicTournamentItem>(`/api/admin/classic/${id}/start`, { method: 'POST' }),

  complete: (id: string, winners: { registrationId: string; place: number }[]) =>
    apiFetch<{ completed: boolean }>(`/api/admin/classic/${id}/complete`, { method: 'POST', body: { winners } }),

  cancel: (id: string) =>
    apiFetch<{ cancelled: boolean }>(`/api/admin/classic/${id}/cancel`, { method: 'POST' }),

  remove: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/admin/classic/${id}`, { method: 'DELETE' }),

  // Chat
  chats: () =>
    apiFetch<{ chats: ClassicChatItem[] }>('/api/admin/classic/chats'),

  getMessages: (regId: string) =>
    apiFetch<{ messages: ClassicMessageItem[] }>(`/api/admin/classic/registrations/${regId}/messages`),

  sendMessage: (regId: string, content: string) =>
    apiFetch<ClassicMessageItem>(`/api/admin/classic/registrations/${regId}/messages`, { method: 'POST', body: { content } }),

  broadcast: (id: string, content: string) =>
    apiFetch<{ sent: number }>(`/api/admin/classic/${id}/broadcast`, { method: 'POST', body: { content } }),

  removeRegistration: (regId: string) =>
    apiFetch<{ removed: boolean; refunded: number }>(`/api/admin/classic/registrations/${regId}`, { method: 'DELETE' }),
};

// ─── WOW MAP API ────────────────────────────────────────────

// ─── SECURITY API TYPES ─────────────────────────────────────

export type RestrictionType = 'MARKETPLACE' | 'RENTAL' | 'BOOST' | 'TOURNAMENT' | 'CLASSIC_TOURNAMENT' | 'CLAN' | 'WITHDRAWAL' | 'DEPOSIT' | 'UC_PURCHASE' | 'CHAT' | 'SUPPORT';

export interface UserRestriction {
  id: string;
  userId: string;
  type: RestrictionType;
  reason: string | null;
  createdAt: string;
  createdBy: string;
}

export interface IpGroupUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  role: string;
}

export interface IpGroup {
  ip: string;
  count: number;
  lastSeen: string;
  users: IpGroupUser[];
}

export const securityApi = {
  getRestrictions: (userId: string) =>
    apiFetch<UserRestriction[]>(`/api/admin/users/${userId}/restrictions`),

  addRestriction: (userId: string, type: RestrictionType, reason?: string) =>
    apiFetch<UserRestriction>(`/api/admin/users/${userId}/restrictions`, { method: 'POST', body: { type, reason } }),

  removeRestriction: (userId: string, type: RestrictionType) =>
    apiFetch<{ ok: boolean }>(`/api/admin/users/${userId}/restrictions/${type}`, { method: 'DELETE' }),

  ipMonitor: (min = 3) =>
    apiFetch<{ groups: IpGroup[]; total: number }>(`/api/admin/ip-monitor?min=${min}`),

  userIpLogs: (userId: string) =>
    apiFetch<Array<{ id: string; ip: string; action: string; userAgent: string | null; loggedAt: string }>>(`/api/admin/ip-monitor/user/${userId}`),
};

export const wowMapApi = {
  list: () => apiFetch<{ maps: WoWMapAdmin[] }>('/api/admin/wow-maps'),
  create: (data: Record<string, unknown>) =>
    apiFetch<WoWMapAdmin>('/api/admin/wow-maps', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<WoWMapAdmin>(`/api/admin/wow-maps/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) =>
    apiFetch<{ deleted?: boolean; deactivated?: boolean }>(`/api/admin/wow-maps/${id}`, { method: 'DELETE' }),
};

// ─── LESSONS ADMIN API ───────────────────────────────────────

export interface AdminLessonCategory {
  id: string;
  title: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  _count: { lessons: number };
}

export interface AdminLesson {
  id: string;
  categoryId: string;
  category: { id: string; title: string };
  title: string;
  description: string | null;
  videoUrl: string;
  videoKey: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const lessonsAdminApi = {
  // Categories
  getCategories: () =>
    apiFetch<AdminLessonCategory[]>('/api/admin/lessons/categories'),

  createCategory: (data: { title: string; icon?: string; sortOrder?: number }) =>
    apiFetch<AdminLessonCategory>('/api/admin/lessons/categories', { method: 'POST', body: data }),

  updateCategory: (id: string, data: Partial<{ title: string; icon: string; sortOrder: number; isActive: boolean }>) =>
    apiFetch<AdminLessonCategory>(`/api/admin/lessons/categories/${id}`, { method: 'PUT', body: data }),

  deleteCategory: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/lessons/categories/${id}`, { method: 'DELETE' }),

  // Lessons
  getLessons: (categoryId?: string) =>
    apiFetch<AdminLesson[]>(`/api/admin/lessons${categoryId ? `?categoryId=${categoryId}` : ''}`),

  createLesson: async (data: {
    categoryId: string;
    title: string;
    description?: string;
    videoFile: File;
    thumbnailUrl?: string;
    duration?: number;
    sortOrder?: number;
  }): Promise<AdminLesson> => {
    const tokens = getStoredTokens();
    const fd = new FormData();
    fd.append('video', data.videoFile);
    fd.append('categoryId', data.categoryId);
    fd.append('title', data.title);
    if (data.description) fd.append('description', data.description);
    if (data.thumbnailUrl) fd.append('thumbnailUrl', data.thumbnailUrl);
    if (data.duration != null) fd.append('duration', String(data.duration));
    if (data.sortOrder != null) fd.append('sortOrder', String(data.sortOrder));
    const res = await fetch(`${API_BASE}/api/admin/lessons`, {
      method: 'POST',
      headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      body: fd,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || res.statusText); }
    return res.json();
  },

  updateLesson: async (id: string, data: Partial<{
    categoryId: string;
    title: string;
    description: string;
    videoFile: File;
    thumbnailUrl: string;
    duration: number;
    sortOrder: number;
    isActive: boolean;
  }>): Promise<AdminLesson> => {
    if (data.videoFile) {
      const tokens = getStoredTokens();
      const fd = new FormData();
      fd.append('video', data.videoFile);
      if (data.categoryId != null) fd.append('categoryId', data.categoryId);
      if (data.title != null) fd.append('title', data.title);
      if (data.description != null) fd.append('description', data.description);
      if (data.thumbnailUrl != null) fd.append('thumbnailUrl', data.thumbnailUrl);
      if (data.duration != null) fd.append('duration', String(data.duration));
      if (data.sortOrder != null) fd.append('sortOrder', String(data.sortOrder));
      if (data.isActive != null) fd.append('isActive', String(data.isActive));
      const res = await fetch(`${API_BASE}/api/admin/lessons/${id}`, {
        method: 'PUT',
        headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
        body: fd,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || res.statusText); }
      return res.json();
    }
    const { videoFile: _, ...rest } = data;
    return apiFetch<AdminLesson>(`/api/admin/lessons/${id}`, { method: 'PUT', body: rest });
  },

  deleteLesson: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/lessons/${id}`, { method: 'DELETE' }),
};

export interface AdminSubmission {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  videoUrl: string;
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  user: { id: string; username: string; displayName: string | null; avatar: string | null };
  lesson: { id: string; title: string; sortOrder: number; category: { title: string } };
}

export const submissionsApi = {
  getAll: (status?: string) =>
    apiFetch<{ submissions: AdminSubmission[] }>(`/api/admin/lesson-submissions${status ? `?status=${status}` : ''}`),
  approve: (id: string, note?: string) =>
    apiFetch(`/api/admin/lesson-submissions/${id}/approve`, { method: 'PUT', body: { note } }),
  reject: (id: string, note: string) =>
    apiFetch(`/api/admin/lesson-submissions/${id}/reject`, { method: 'PUT', body: { note } }),
};

export interface TrainingSettings {
  id: string;
  price: number;
  currency: string;
  rewards: string[];
  updatedAt: string;
}

export const trainingSettingsApi = {
  get: () => apiFetch<TrainingSettings>('/api/admin/training-settings'),
  update: (data: { price?: number; currency?: string; rewards?: string[] }) =>
    apiFetch<TrainingSettings>('/api/admin/training-settings', { method: 'PUT', body: data }),
};

export interface TrainingStats {
  paidCount: number;
  price: number;
  currency: string;
  totalRevenue: number;
}

export const trainingStatsApi = {
  get: () => apiFetch<TrainingStats>('/api/admin/training-stats'),
};
