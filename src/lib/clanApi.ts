import { apiFetch } from './api';

// ─── TYPES ──────────────────────────────────────────────

export interface ClanAdminMember {
  id: string;
  userId: string;
  nick: string;
  avatar: string | null;
  pid: string;
  floor: number;
  mp: number;
  w: number;
  earned: number;
  jd: string;
}

export interface ClanAdminApplication {
  id: string;
  userId: string;
  nick: string;
  avatar: string | null;
  pid: string;
  status: string;
  opponentId: string | null;
  opponentNick: string | null;
  evaluation: string | null;
  evaluationNote: string | null;
  adminNote: string | null;
  matchId: string | null;
  matchStatus: string | null;
  matchScoreMember: number | null;
  matchScoreCandidate: number | null;
  date: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface ClanAdminCheckpoint {
  id: string;
  floor: number;
  prize: number;
  currency: string;
  label: string | null;
}

export interface ClanAdminDistribution {
  id: string;
  clanId: string;
  season: number;
  startedAt: string;
  completedAt: string | null;
  results: string | null;
  newMemberIds: string | null;
  removedMemberIds: string | null;
  startedBy: string;
}

export interface ClanAdminSettings {
  id: string;
  name: string;
  game: string;
  season: number;
  maxMembers: number;
  entryFee: number;
  telegramChat: string | null;
  telegramChannel: string | null;
  rules: string | null;
  videoGuideUrl: string | null;
  distributionDate: string | null;
  distributionActive: boolean;
  treasury: number;
}

export interface ClanAdminData {
  clan: ClanAdminSettings;
  members: ClanAdminMember[];
  applications: ClanAdminApplication[];
  checkpoints: ClanAdminCheckpoint[];
  distributions: ClanAdminDistribution[];
}

export interface ClanFinancesData {
  feeIncome: number;
  treasury: number;
  prizesPaid: number;
  siteIncome: number;
  towerTotal: number;
  entries: Array<{
    id: string;
    type: string;
    target: string;
    amount: number;
    description: string;
    userId: string | null;
    status: string;
    date: string;
  }>;
}

// ─── API CALLS ──────────────────────────────────────────

export function getClanAdminData(): Promise<ClanAdminData> {
  return apiFetch('/api/admin/clan');
}

export function getClanFinances(): Promise<ClanFinancesData> {
  return apiFetch('/api/admin/clan/finances');
}

export function updateClanSettings(data: Partial<{
  name: string;
  entryFee: number;
  season: number;
  telegramChat: string | null;
  telegramChannel: string | null;
  rules: string | null;
  videoGuideUrl: string | null;
}>) {
  return apiFetch('/api/admin/clan/settings', { method: 'PUT', body: data });
}

export function decideApplication(applicationId: string, decision: 'approve' | 'reject', note?: string) {
  return apiFetch(`/api/admin/clan/applications/${applicationId}/decide`, {
    method: 'PATCH',
    body: { decision, note },
  });
}

export function reassignOpponent(applicationId: string, newMemberId: string) {
  return apiFetch(`/api/admin/clan/applications/${applicationId}/reassign`, {
    method: 'PATCH',
    body: { newMemberId },
  });
}

export function resolveMatchDispute(matchId: string, winnerId: string, scoreMember: number, scoreCandidate: number, resolution: string) {
  return apiFetch(`/api/admin/clan/matches/${matchId}/resolve`, {
    method: 'POST',
    body: { winnerId, scoreMember, scoreCandidate, resolution },
  });
}

export function addMember(userId: string, pubgId: string) {
  return apiFetch<{ id: string; userId: string; pubgId: string }>('/api/admin/clan/members', {
    method: 'POST',
    body: { userId, pubgId },
  });
}

export function kickMember(memberId: string, reason?: string) {
  return apiFetch(`/api/admin/clan/members/${memberId}`, { method: 'DELETE', body: reason ? { reason } : undefined });
}

export function updateMemberFloor(memberId: string, floor: number) {
  return apiFetch(`/api/admin/clan/members/${memberId}/floor`, {
    method: 'PATCH',
    body: { floor },
  });
}

export function updateDistributionTimer(date: string) {
  return apiFetch('/api/admin/clan/distribution/timer', {
    method: 'PATCH',
    body: { date },
  });
}

export function startDistribution() {
  return apiFetch<ClanAdminDistribution>('/api/admin/clan/distribution/start', { method: 'POST' });
}

export function finishDistribution(distributionId: string, results: Array<{ userId: string; pubgId: string; wins: number; losses: number; place: number }>) {
  return apiFetch('/api/admin/clan/distribution/finish', {
    method: 'POST',
    body: { distributionId, results },
  });
}

export function clearAllApplications() {
  return apiFetch<{ cleared: boolean; message: string; removed: number }>('/api/admin/clan/clear-applications', { method: 'POST' });
}

export function resetClanData() {
  return apiFetch<{ reset: boolean; message: string }>('/api/admin/clan/reset', { method: 'POST' });
}

// ─── DISPUTED MATCHES ────────────────────────────────────

export interface DisputedMatch {
  id: string;
  status: string;
  memberUser: { id: string; username: string };
  candidateUser: { id: string; username: string };
  memberScoreSelf: number | null;
  memberScoreOpp: number | null;
  candidateScoreSelf: number | null;
  candidateScoreOpp: number | null;
  createdAt: string;
}

export interface ClanMatchMessage {
  id: string;
  matchId: string;
  userId: string;
  content: string;
  isSystem: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export function getDisputedMatches() {
  return apiFetch<{ matches: DisputedMatch[] }>('/api/admin/clan/matches/disputed');
}

export function getMatchMessages(matchId: string) {
  return apiFetch<{ messages: ClanMatchMessage[] }>(`/api/admin/clan/matches/${matchId}/messages`);
}

export function sendAdminMatchMessage(matchId: string, content: string) {
  return apiFetch<ClanMatchMessage>(`/api/admin/clan/matches/${matchId}/messages`, {
    method: 'POST', body: { content },
  });
}

// ─── AUDIT LOG ──────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  clanId: string;
  adminUserId: string;
  adminName: string;
  action: string;
  details: string;
  targetId: string | null;
  targetName: string | null;
  createdAt: string;
}

export function getAuditLog(limit = 200) {
  return apiFetch<{ logs: AuditLogEntry[] }>(`/api/admin/clan/audit-log?limit=${limit}`);
}

export function adminCancelApplication(applicationId: string) {
  return apiFetch<{ cancelled: boolean }>(`/api/admin/clan/applications/${applicationId}/cancel`, { method: 'POST' });
}

// ─── PAYOUTS & DISTRIBUTION CONFIG ──────────────────────

export interface PendingPayout {
  userId: string;
  pendingAmount: number;
  entriesCount: number;
  user: { id: string; username: string; displayName: string; avatar: string | null } | null;
}

export interface PayoutAggregates {
  siteRevenue: number;
  treasuryBalance: number;
  pendingPayouts: number;
  paidTotal: number;
}

export interface LedgerEntry {
  id: string;
  clanId: string;
  type: string;
  target: string;
  userId: string | null;
  amount: number;
  description: string;
  comment: string | null;
  refType: string | null;
  refId: string | null;
  status: 'UNPAID' | 'PAID';
  paidAt: string | null;
  paidByAdminId: string | null;
  createdAt: string;
  userName?: string | null;
}

export interface DistConfigSplit {
  label: string;
  pct: number;
  target: string;
  userId?: string;
}

export interface DistConfig {
  id: string;
  revenueType: string;
  label: string;
  splits: DistConfigSplit[];
}

export function getPendingPayouts() {
  return apiFetch<{ pending: PendingPayout[]; aggregates: PayoutAggregates }>('/api/admin/clan/payouts/pending');
}

export function getUserPayoutHistory(userId: string, filters?: { type?: string; status?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  const qs = params.toString();
  return apiFetch<{ entries: LedgerEntry[] }>(`/api/admin/clan/payouts/history/${userId}${qs ? '?' + qs : ''}`);
}

export function getLedger(filters?: { type?: string; status?: string; target?: string; from?: string; to?: string }, limit = 200) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.target) params.set('target', filters.target);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  params.set('limit', String(limit));
  return apiFetch<{ entries: LedgerEntry[] }>(`/api/admin/clan/payouts/ledger?${params.toString()}`);
}

export function payUser(userId: string) {
  return apiFetch<{ paid: boolean; userId: string; amount: number; entries: number }>(`/api/admin/clan/payouts/${userId}/pay`, { method: 'POST' });
}

export function payAllUsers() {
  return apiFetch<{ totalPaid: number; usersCount: number; errors: any[] }>('/api/admin/clan/payouts/pay-all', { method: 'POST' });
}

export function addExternalEarning(userId: string, amount: number, description: string) {
  return apiFetch('/api/admin/clan/payouts/external', {
    method: 'POST',
    body: { userId, amount, description },
  });
}

export function getDistConfigs() {
  return apiFetch<{ configs: DistConfig[] }>('/api/admin/clan/dist-config');
}

export function updateDistConfig(revenueType: string, splits: DistConfigSplit[]) {
  return apiFetch('/api/admin/clan/dist-config', {
    method: 'PUT',
    body: { revenueType, splits },
  });
}
