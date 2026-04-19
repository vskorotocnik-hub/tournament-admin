/**
 * Admin-facing currency API client. Mirrors
 * `server/src/routes/admin-currency.ts`. All endpoints require the
 * admin JWT + IP whitelist — authentication is handled by the shared
 * `apiFetch` wrapper in `./api.ts`.
 *
 * Added 2026-04-19 when the multicurrency subsystem landed. Keep in
 * lockstep with server types (see server/src/domains/currency/*).
 */
import { apiFetch } from './api';

export type Currency = 'USD' | 'UAH' | 'RUB' | 'EUR' | 'PLN' | 'KZT' | 'UZS' | 'MDL' | 'RON';
export type StorageCurrency = 'USD' | 'UAH' | 'RUB';

// ─── Config shapes ─────────────────────────────────────────

export interface SpreadConfig {
  /** Default margin for any non-USD currency without an override (percent). */
  defaultPct: number;
  /** Per-currency override. Key = Currency code, value = percent. USD is always 0. */
  perCurrencyPct: Record<string, number>;
}

export interface WithdrawalFeeConfig {
  pct: number;
}

export interface LimitsConfig {
  minDepositUsd: number;
  minWithdrawalUsd: number;
  autoApproveWithdrawUsd: number;
  maxActiveHolds: number;
  holdTimeoutHours: number;
}

export interface CurrencyToggles {
  enabledStorage: StorageCurrency[];
  enabledDisplay: Currency[];
  multicurrencyEnabled: boolean;
}

export interface AdminCurrencyConfig {
  spread: SpreadConfig;
  fee: WithdrawalFeeConfig;
  limits: LimitsConfig;
  toggles: CurrencyToggles;
}

// ─── Rate / monitoring shapes ─────────────────────────────

export interface RateSnapshot {
  rates: Record<Currency, {
    rate: string;
    /** Optional — set when `displaySnapshot` populated the entry. */
    midmarketRate?: string;
    /** Percent margin applied to produce `rate` from `midmarketRate`. */
    marginPct?: number;
    updatedAt: string;
    source: string;
    stale: boolean;
  } | undefined>;
  health: {
    healthy: boolean;
    staleCurrencies: Currency[];
    missingPairs: string[];
    cachedPairs: number;
  };
}

export interface RateSourceHealth {
  fondy: { state: 'closed' | 'open' | 'half-open'; failures: number };
  cbr:   { state: 'closed' | 'open' | 'half-open'; failures: number };
}

export interface RatesAdminView {
  snapshot: RateSnapshot;
  health: RateSnapshot['health'];
  sources: RateSourceHealth;
  updater: { running: boolean; lastRun: string | null };
}

export interface RateHistoryPoint {
  id: string;
  base: Currency;
  currency: Currency;
  rate: string;
  source: string;
  createdAt: string;
}

// ─── Logs ──────────────────────────────────────────────────

export interface AdminConversionLog {
  id: string;
  userId: string;
  user?: { id: string; username: string };
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  toAmount: string;
  midMarketRate: string;
  providerRate: string;
  platformMargin: string;
  pocketFrom: StorageCurrency | null;
  pocketTo: StorageCurrency | null;
  reason: string;
  createdAt: string;
  parentId: string | null;
}

export interface AdminPaymentLog {
  id: string;
  userId: string;
  user?: { id: string; username: string };
  kind: 'DEPOSIT' | 'WITHDRAWAL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: string;
  method: string;
  amount: string;
  currency: Currency;
  pocket?: StorageCurrency;
  pocketAmount?: string;
  feeAmount?: string;
  failureReason?: string;
  requiresApproval: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface AdminAuditEntry {
  id: string;
  actorId: string | null;
  actor?: { id: string; username: string; displayName?: string };
  actorRole: 'ADMIN' | 'OWNER' | 'SYSTEM';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST';
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  ip: string | null;
  createdAt: string;
}

export interface PlatformTotals {
  pockets: { usdBalance: string | null; uahBalance: string | null; rubBalance: string | null };
  holds:   { usdHold: string | null; uahHold: string | null; rubHold: string | null };
  pendingPayments: number;
}

// ─── API surface ───────────────────────────────────────────

export const adminCurrencyApi = {
  // ─── Config ────────────────────────────────────────────
  getConfig: () => apiFetch<AdminCurrencyConfig>('/api/admin/currency/config'),
  setSpread: (body: SpreadConfig & { reason?: string }) =>
    apiFetch<{ spread: SpreadConfig }>('/api/admin/currency/config/spread', { method: 'PUT', body }),
  setFee: (body: WithdrawalFeeConfig & { reason?: string }) =>
    apiFetch<{ fee: WithdrawalFeeConfig }>('/api/admin/currency/config/fee', { method: 'PUT', body }),
  setLimits: (body: LimitsConfig & { reason?: string }) =>
    apiFetch<{ limits: LimitsConfig }>('/api/admin/currency/config/limits', { method: 'PUT', body }),
  setToggles: (body: CurrencyToggles & { reason?: string }) =>
    apiFetch<{ toggles: CurrencyToggles }>('/api/admin/currency/config/toggles', { method: 'PUT', body }),

  // ─── Rates ─────────────────────────────────────────────
  rates: () => apiFetch<RatesAdminView>('/api/admin/currency/rates'),
  setManualRate: (currency: Currency, rate: string, reason: string) =>
    apiFetch<{ ok: boolean }>('/api/admin/currency/rates/manual', {
      method: 'POST',
      body: { currency, rate, reason },
    }),
  rateHistory: (currency: Currency, days = 7) =>
    apiFetch<{ history: RateHistoryPoint[] }>(`/api/admin/currency/rates/history?currency=${currency}&days=${days}`),

  // ─── Logs ──────────────────────────────────────────────
  conversions: (params: { limit?: number; reason?: string; userId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.reason) qs.set('reason', params.reason);
    if (params.userId) qs.set('userId', params.userId);
    return apiFetch<{ conversions: AdminConversionLog[] }>(`/api/admin/currency/conversions?${qs}`);
  },
  payments: (params: { limit?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    return apiFetch<{ payments: AdminPaymentLog[] }>(`/api/admin/currency/payments?${qs}`);
  },
  totals: () => apiFetch<PlatformTotals>('/api/admin/currency/totals'),

  // ─── Mutations ─────────────────────────────────────────
  adjustBalance: (body: { userId: string; pocket: StorageCurrency; delta: string; reason: string }) =>
    apiFetch<{ ok: boolean; conversionId: string }>('/api/admin/currency/wallet/adjust', {
      method: 'POST', body,
    }),
  approveWithdrawal: (id: string, reason?: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/currency/withdraw/approve/${id}`, {
      method: 'POST', body: { reason },
    }),
  rejectWithdrawal: (id: string, reason: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/currency/withdraw/reject/${id}`, {
      method: 'POST', body: { reason },
    }),

  // ─── Audit ─────────────────────────────────────────────
  audit: (params: { entity?: string; entityId?: string; actorId?: string; action?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<{ audit: AdminAuditEntry[] }>(`/api/admin/currency/audit?${qs}`);
  },

  // ─── Sandbox ───────────────────────────────────────────
  simulate: (body: unknown) =>
    apiFetch<unknown>('/api/admin/currency/sandbox/simulate', { method: 'POST', body }),
};
