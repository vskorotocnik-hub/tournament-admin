/**
 * Config tab — per-currency margin, withdrawal fee, platform limits,
 * master "enabled" toggles. Every PUT requires a `reason` field which
 * ends up in AdminAuditLog.
 */
import { useEffect, useState } from 'react';
import {
  adminCurrencyApi,
  type AdminCurrencyConfig,
  type Currency,
} from '../../lib/currencyApi';

const ALL: Currency[] = ['USD', 'UAH', 'RUB', 'EUR', 'PLN', 'KZT', 'UZS', 'MDL', 'RON'];
const NON_USD: Currency[] = ALL.filter((c): c is Currency => c !== 'USD');
const STORAGE: Array<'USD' | 'UAH' | 'RUB'> = ['USD', 'UAH', 'RUB'];

const CURRENCY_FLAGS: Record<Currency, string> = {
  USD: '🇺🇸', UAH: '🇺🇦', RUB: '🇷🇺', EUR: '🇪🇺',
  PLN: '🇵🇱', KZT: '🇰🇿', UZS: '🇺🇿', MDL: '🇲🇩', RON: '🇷🇴',
};

export default function CurrencyConfigTab() {
  const [cfg, setCfg] = useState<AdminCurrencyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft buffers — we stage edits, then require a reason on save.
  const [reason, setReason] = useState('');
  const [spreadDefault, setSpreadDefault] = useState('');
  const [perCurrencyDraft, setPerCurrencyDraft] = useState<Record<string, string>>({});
  const [feePct, setFeePct] = useState('');
  const [limitsDraft, setLimitsDraft] = useState<AdminCurrencyConfig['limits'] | null>(null);
  const [togglesDraft, setTogglesDraft] = useState<AdminCurrencyConfig['toggles'] | null>(null);
  /** Latest USD-based midmarket rates, refreshed with config for preview. */
  const [midmarketRates, setMidmarketRates] = useState<Record<string, number>>({});

  async function load() {
    try {
      const data = await adminCurrencyApi.getConfig();
      setCfg(data);
      setSpreadDefault(String(data.spread.defaultPct));
      // Seed per-currency drafts from the server, one entry per non-USD code
      // (missing overrides default to defaultPct until explicitly changed).
      const draft: Record<string, string> = {};
      for (const c of NON_USD) {
        const override = data.spread.perCurrencyPct?.[c];
        draft[c] = typeof override === 'number' ? String(override) : String(data.spread.defaultPct);
      }
      setPerCurrencyDraft(draft);
      setFeePct(String(data.fee.pct));
      setLimitsDraft(data.limits);
      setTogglesDraft(data.toggles);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }

    // Best-effort midmarket fetch for the live preview. Hide the preview
    // silently if the endpoint errors — it's non-critical.
    try {
      const view = await adminCurrencyApi.rates();
      const rates: Record<string, number> = {};
      for (const [code, entry] of Object.entries(view.snapshot?.rates ?? {})) {
        const e = entry as any;
        if (e?.rate) rates[code] = Number(e.rate);
      }
      setMidmarketRates(rates);
    } catch { /* silent */ }
  }

  useEffect(() => { load(); }, []);

  function requireReason(): string | null {
    if (reason.trim().length < 3) { setError('Укажите причину изменения (минимум 3 символа)'); return null; }
    return reason.trim();
  }

  async function saveSpread() {
    const r = requireReason(); if (!r) return;
    // Parse draft values, keep only explicit numeric overrides.
    // An empty input OR equal-to-default is treated as "inherit default".
    const defaultPct = Number(spreadDefault);
    if (!Number.isFinite(defaultPct) || defaultPct < 0 || defaultPct > 20) {
      setError('Маржа по умолчанию должна быть от 0 до 20 %'); return;
    }
    const perCurrencyPct: Record<string, number> = {};
    for (const [code, raw] of Object.entries(perCurrencyDraft)) {
      if (code === 'USD') continue;
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n)) continue;
      if (n < 0 || n > 20) { setError(`${code}: маржа должна быть от 0 до 20 %`); return; }
      if (n !== defaultPct) perCurrencyPct[code] = n;
    }
    setSaving('spread'); setError(null); setMessage(null);
    try {
      await adminCurrencyApi.setSpread({ defaultPct, perCurrencyPct, reason: r });
      setMessage('Маржа сохранена');
      setReason('');
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(null); }
  }

  async function saveFee() {
    const r = requireReason(); if (!r) return;
    setSaving('fee'); setError(null); setMessage(null);
    try {
      await adminCurrencyApi.setFee({ pct: Number(feePct), reason: r });
      setMessage('Комиссия сохранена');
      setReason('');
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(null); }
  }

  async function saveLimits() {
    if (!limitsDraft) return;
    const r = requireReason(); if (!r) return;
    setSaving('limits'); setError(null); setMessage(null);
    try {
      await adminCurrencyApi.setLimits({ ...limitsDraft, reason: r });
      setMessage('Лимиты сохранены');
      setReason('');
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(null); }
  }

  async function saveToggles() {
    if (!togglesDraft) return;
    const r = requireReason(); if (!r) return;
    setSaving('toggles'); setError(null); setMessage(null);
    try {
      await adminCurrencyApi.setToggles({ ...togglesDraft, reason: r });
      setMessage('Переключатели сохранены');
      setReason('');
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(null); }
  }

  if (loading || !cfg || !limitsDraft || !togglesDraft) {
    return <div className="text-zinc-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Banner messages */}
      {(message || error) && (
        <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'}`}>
          {error ?? message}
        </div>
      )}

      {/* Common reason input (required for every save) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Причина изменения</label>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Например: маркетинговая акция, повышение маржи..."
          className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
        />
        <p className="text-[11px] text-zinc-600 mt-1">
          Требуется для всех кнопок сохранения ниже. Сохраняется в журнале аудита (вкладка «Аудит»).
        </p>
      </div>

      {/* Per-currency margin */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">Платёжная маржа (spread)</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              USD — якорная валюта (0 %). Для остальных — процент, который закладывается в курс,
              когда пользователь видит цену или реально списывается кросс-валютой.
            </p>
          </div>
          <button
            onClick={saveSpread}
            disabled={saving === 'spread'}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold whitespace-nowrap"
          >
            {saving === 'spread' ? 'Сохранение…' : 'Сохранить маржу'}
          </button>
        </div>

        {/* Default margin row */}
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-white font-medium">По умолчанию</div>
              <div className="text-[11px] text-zinc-500">Применяется ко всем валютам без собственного значения</div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number" step="0.1" min={0} max={20}
                value={spreadDefault}
                onChange={e => setSpreadDefault(e.target.value)}
                className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-right"
              />
              <span className="text-zinc-400 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Per-currency grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {NON_USD.map(c => {
            const raw = perCurrencyDraft[c] ?? '';
            const defaultVal = Number(spreadDefault);
            const override = raw === '' ? null : Number(raw);
            const isOverride = override !== null && Number.isFinite(override) && override !== defaultVal;
            return (
              <div key={c} className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${isOverride ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-zinc-800/50 border-zinc-700/60'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{CURRENCY_FLAGS[c] ?? '🏳️'}</span>
                  <span className="text-white text-sm font-medium">{c}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.1" min={0} max={20}
                    value={raw}
                    onChange={e => setPerCurrencyDraft(d => ({ ...d, [c]: e.target.value }))}
                    placeholder={String(spreadDefault)}
                    className={`w-16 bg-zinc-900 border rounded-lg px-2 py-1 text-white text-xs text-right ${isOverride ? 'border-indigo-500' : 'border-zinc-700'}`}
                  />
                  <span className="text-zinc-500 text-[11px]">%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live preview: midmarket vs effective display rate */}
        {Object.keys(midmarketRates).length > 0 && (
          <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-3">
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Предпросмотр: 1 USD →</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {NON_USD.filter(c => midmarketRates[c] != null).map(c => {
                const mid = midmarketRates[c];
                const raw = perCurrencyDraft[c];
                const pct = raw === '' ? Number(spreadDefault) : Number(raw);
                const effective = mid * (1 + (Number.isFinite(pct) ? pct : 0) / 100);
                return (
                  <div key={c} className="flex flex-col bg-zinc-900/60 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span>{CURRENCY_FLAGS[c] ?? '🏳️'}</span>
                      <span className="text-zinc-400">{c}</span>
                    </div>
                    <div className="text-zinc-500 text-[10px] mt-0.5">
                      мид: <span className="text-zinc-400">{mid.toFixed(mid >= 100 ? 2 : 4)}</span>
                    </div>
                    <div className="text-emerald-400 font-mono">
                      {effective.toFixed(effective >= 100 ? 2 : 4)}
                      <span className="text-zinc-600 ml-1 text-[10px]">+{(effective - mid).toFixed(mid >= 100 ? 2 : 4)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">
              Пример: товар $30 из UAH-кошелька при марже {perCurrencyDraft['UAH'] || spreadDefault} % = <span className="text-emerald-400">
                {(() => {
                  const mid = midmarketRates['UAH'];
                  if (!mid) return '—';
                  const pct = Number(perCurrencyDraft['UAH'] ?? spreadDefault);
                  return (30 * mid * (1 + pct / 100)).toFixed(0) + ' ₴';
                })()}
              </span> (мид: {((midmarketRates['UAH'] ?? 0) * 30).toFixed(0)} ₴)
            </p>
          </div>
        )}
      </div>

      {/* Withdrawal fee */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">Комиссия вывода</h3>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-2 items-center">
          <label className="text-sm text-zinc-400">Комиссия (%)</label>
          <input
            type="number" step="0.1"
            value={feePct}
            onChange={e => setFeePct(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            onClick={saveFee}
            disabled={saving === 'fee'}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold"
          >
            {saving === 'fee' ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Limits */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">Лимиты</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <LimitField label="Мин. депозит (USD)"           value={limitsDraft.minDepositUsd}           onChange={v => setLimitsDraft({ ...limitsDraft, minDepositUsd: v })} />
          <LimitField label="Мин. вывод (USD)"             value={limitsDraft.minWithdrawalUsd}        onChange={v => setLimitsDraft({ ...limitsDraft, minWithdrawalUsd: v })} />
          <LimitField label="Авто-approve вывод ≤ (USD)"   value={limitsDraft.autoApproveWithdrawUsd}  onChange={v => setLimitsDraft({ ...limitsDraft, autoApproveWithdrawUsd: v })} />
          <LimitField label="Макс. активных holds"         value={limitsDraft.maxActiveHolds}          onChange={v => setLimitsDraft({ ...limitsDraft, maxActiveHolds: v })} />
          <LimitField label="Hold таймаут (часы)"          value={limitsDraft.holdTimeoutHours}        onChange={v => setLimitsDraft({ ...limitsDraft, holdTimeoutHours: v })} />
        </div>
        <button
          onClick={saveLimits}
          disabled={saving === 'limits'}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold"
        >
          {saving === 'limits' ? 'Сохранение...' : 'Сохранить лимиты'}
        </button>
      </div>

      {/* Toggles */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">Переключатели валют</h3>
        <label className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={togglesDraft.multicurrencyEnabled}
            onChange={e => setTogglesDraft({ ...togglesDraft, multicurrencyEnabled: e.target.checked })}
          />
          <span className="text-sm text-zinc-200">Мультивалютность включена (аварийный выключатель)</span>
        </label>

        <div className="mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Карманы хранения</p>
          <div className="flex flex-wrap gap-2">
            {STORAGE.map(s => {
              const on = togglesDraft.enabledStorage.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => setTogglesDraft({
                    ...togglesDraft,
                    enabledStorage: on
                      ? togglesDraft.enabledStorage.filter(c => c !== s)
                      : [...togglesDraft.enabledStorage, s],
                  })}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Валюты отображения</p>
          <div className="flex flex-wrap gap-2">
            {ALL.map(c => {
              const on = togglesDraft.enabledDisplay.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setTogglesDraft({
                    ...togglesDraft,
                    enabledDisplay: on
                      ? togglesDraft.enabledDisplay.filter(x => x !== c)
                      : [...togglesDraft.enabledDisplay, c],
                  })}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={saveToggles}
          disabled={saving === 'toggles'}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold"
        >
          {saving === 'toggles' ? 'Сохранение...' : 'Сохранить переключатели'}
        </button>
      </div>
    </div>
  );
}

function LimitField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="number" step="0.01"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
      />
    </label>
  );
}
