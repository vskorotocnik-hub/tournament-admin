import { apiFetch } from './api';

// ─── TYPES ───────────────────────────────────────────────────

export type GTStatus = 'DRAFT' | 'REGISTRATION' | 'CHECKIN' | 'LIVE' | 'FINISHED' | 'CANCELLED';
export type GTGameMode = 'CLASSIC' | 'TDM' | 'CLAN' | 'CLAN_DISTRIBUTION';
export type GTFormat = 'SOLO' | 'DUO' | 'SQUAD';

export interface GTStageInfo {
  id: string;
  name: string;
  date: string;
  status: string;
  sortOrder: number;
}

export interface GTPrize {
  id: string;
  place: string;
  amount: number;
  icon: string | null;
  sortOrder: number;
}

export interface GTRegistration {
  id: string;
  userId: string;
  teamName: string | null;
  pubgIds: string[];
  captainPubgId: string | null;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  isPaid: boolean;
  isDisqualified: boolean;
  disqualifyReason: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatar: string | null };
}

export interface GTChampion {
  id: string;
  gameMode: GTGameMode;
  format: GTFormat;
  year: number;
  place: number;
  championName: string;
  championPubgId: string | null;
  championAvatar: string | null;
  championCountry: string | null;
  teamMembers: string[];
  prizeWon: number;
  kills: number;
  winRate: string | null;
  points: number;
}

export interface GTListItem {
  id: string;
  name: string;
  subtitle: string | null;
  gameMode: GTGameMode;
  format: GTFormat;
  status: GTStatus;
  currentStage: string;
  prizePool: number;
  entryFee: number;
  maxParticipants: number;
  tournamentStart: string | null;
  createdAt: string;
  stages: GTStageInfo[];
  prizes: GTPrize[];
  _count: { registrations: number; teams: number; matches: number };
}

export interface GTDetail extends GTListItem {
  description: string | null;
  rules: string | null;
  commission: number;
  minLevel: number | null;
  minRank: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  checkInStart: string | null;
  checkInEnd: string | null;
  tournamentEnd: string | null;
  region: string | null;
  server: string;
  bannerImage: string | null;
  streamUrl: string | null;
  createdBy: string;
  registrations: GTRegistration[];
  teams: any[];
  matches: any[];
  champions: GTChampion[];
}

export interface GTFormData {
  name: string;
  subtitle?: string;
  description?: string;
  rules?: string;
  gameMode: GTGameMode;
  format: GTFormat;
  status?: GTStatus;
  prizePool: number;
  entryFee: number;
  commission: number;
  maxParticipants: number;
  minLevel?: number | null;
  minRank?: string | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  checkInStart?: string | null;
  checkInEnd?: string | null;
  tournamentStart?: string | null;
  tournamentEnd?: string | null;
  region?: string | null;
  server: string;
  bannerImage?: string | null;
  bannerImageData?: string | null;
  streamUrl?: string | null;
  stages?: { name: string; date: string; status: string }[];
  prizes?: { place: string; amount: number; icon?: string }[];
}

// ─── API ─────────────────────────────────────────────────────

export const globalTournamentApi = {
  list: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    const qs = query.toString();
    return apiFetch<{ tournaments: GTListItem[]; total: number; page: number; totalPages: number }>(
      `/api/admin/global-tournaments${qs ? `?${qs}` : ''}`
    );
  },

  get: (id: string) =>
    apiFetch<GTDetail>(`/api/admin/global-tournaments/${id}`),

  create: (data: GTFormData) =>
    apiFetch<GTListItem>('/api/admin/global-tournaments', { method: 'POST', body: data }),

  update: (id: string, data: Partial<GTFormData>) =>
    apiFetch<GTListItem>(`/api/admin/global-tournaments/${id}`, { method: 'PUT', body: data }),

  changeStatus: (id: string, status: GTStatus, currentStage?: string) =>
    apiFetch(`/api/admin/global-tournaments/${id}/status`, { method: 'POST', body: { status, currentStage } }),

  remove: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/admin/global-tournaments/${id}`, { method: 'DELETE' }),

  disqualifyRegistration: (tournamentId: string, regId: string, reason?: string) =>
    apiFetch(`/api/admin/global-tournaments/${tournamentId}/registrations/${regId}/disqualify`, { method: 'POST', body: { reason } }),

  removeRegistration: (tournamentId: string, regId: string) =>
    apiFetch<{ deleted: boolean }>(`/api/admin/global-tournaments/${tournamentId}/registrations/${regId}`, { method: 'DELETE' }),

  addChampion: (tournamentId: string, data: Omit<GTChampion, 'id'>) =>
    apiFetch<GTChampion>(`/api/admin/global-tournaments/${tournamentId}/champions`, { method: 'POST', body: data }),

  removeChampion: (champId: string) =>
    apiFetch<{ deleted: boolean }>(`/api/admin/global-tournaments/champions/${champId}`, { method: 'DELETE' }),

  generateTeams: (tournamentId: string) =>
    apiFetch<{ teams: any[]; totalTeams: number; unassigned: number }>(`/api/admin/global-tournaments/${tournamentId}/generate-teams`, { method: 'POST' }),

  generateMatches: (tournamentId: string) =>
    apiFetch<{ created: number; type: string }>(`/api/admin/global-tournaments/${tournamentId}/generate-matches`, { method: 'POST' }),

  createMatch: (tournamentId: string, data: { stage?: string; round?: number; matchNumber?: number; teamAId?: string; teamBId?: string; map?: string; scheduledTime?: string }) =>
    apiFetch<any>(`/api/admin/global-tournaments/${tournamentId}/matches`, { method: 'POST', body: data }),

  updateMatch: (matchId: string, data: { scoreA?: number; scoreB?: number; winnerId?: string; status?: string }) =>
    apiFetch<any>(`/api/admin/global-tournaments/matches/${matchId}`, { method: 'PUT', body: data }),

  deleteMatch: (matchId: string) =>
    apiFetch<{ deleted: boolean }>(`/api/admin/global-tournaments/matches/${matchId}`, { method: 'DELETE' }),
};
