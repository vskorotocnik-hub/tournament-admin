/**
 * Conversions tab — every money movement in CurrencyConversion,
 * filterable by reason. Also lets an admin open the "adjust balance"
 * mini-form for any user.
 */
import { useEffect, useState } from 'react';
import { adminCurrencyApi, type AdminConversionLog } from '../../lib/currencyApi';

const REASONS = [
  'ALL',
  'DEPOSIT', 'UC_PURCHASE', 'MARKETPLACE_PURCHASE', 'MARKETPLACE_PAYOUT',
  'WITHDRAWAL', 'WITHDRAWAL_FEE',
  'HOLD', 'HOLD_RELEASE', 'HOLD_COMMIT',
  'REFUND', 'MANUAL',
] as const;

type Reason = typeof REASONS[number];

// Wire value → Russian label. Values are what the API filters by.
const REASON_LABELS: Record<Reason, string> = {
  ALL:                   'Все причины',
  DEPOSIT:               'Пополнение',
  UC_PURCHASE:           'Покупка UC',
  MARKETPLACE_PURCHASE:  'Покупка на маркетплейсе',
  MARKETPLACE_PAYOUT:    'Выплата продавцу',
  WITHDRAWAL:            'Вывод средств',
  WITHDRAWAL_FEE:        'Комиссия за вывод',
  HOLD:                  'Задержка (hold)',
  HOLD_RELEASE:          'Снятие задержки',
  HOLD_COMMIT:           'Списание из задержки',
  REFUND:                'Возврат',
  MANUAL:                'Ручная коррекция',
};

export default function CurrencyConversionsTab() {
  const [rows, setRows] = useState<AdminConversionLog[]>([]);
  const [reason, setReason] = useState<Reason>('ALL');
  const [userFilter, setUserFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await adminCurrencyApi.conversions({
        limit: 200,
        reason: reason === 'ALL' ? undefined : reason,
        userId: userFilter || undefined,
      });
      setRows(res.conversions);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [reason]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={reason}
          onChange={e => setReason(e.target.value as Reason)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs"
        >
          {REASONS.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
        </select>
        <input
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          placeholder="ID пользователя (опционально)"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs w-60"
        />
        <button onClick={load} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700">Применить</button>
        <button
          onClick={() => setShowAdjust(true)}
          className="ml-auto px-3 py-1.5 rounded bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 text-xs border border-yellow-500/30"
        >
          Ручная корректировка...
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8 text-center">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-zinc-500 py-8 text-center">Нет операций</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2">Дата</th>
                <th className="text-left px-3 py-2">Пользователь</th>
                <th className="text-left px-3 py-2">Причина</th>
                <th className="text-left px-3 py-2">Карман</th>
                <th className="text-right px-3 py-2">Откуда</th>
                <th className="text-right px-3 py-2">Куда</th>
                <th className="text-right px-3 py-2">Курс</th>
                <th className="text-right px-3 py-2">Маржа</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map(r => (
                <tr key={r.id} className={`hover:bg-zinc-950/50 ${r.parentId ? 'opacity-70 text-[10px]' : ''}`}>
                  <td className="px-3 py-2 text-zinc-400">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2 text-white">{r.user?.username ?? r.userId.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.parentId ? '↳ ' : ''}{REASON_LABELS[r.reason as Reason] ?? r.reason}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.pocketFrom ?? '—'} → {r.pocketTo ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-zinc-300 font-mono">{Number(r.fromAmount).toFixed(2)} {r.fromCurrency}</td>
                  <td className="px-3 py-2 text-right text-white font-mono">{Number(r.toAmount).toFixed(2)} {r.toCurrency}</td>
                  <td className="px-3 py-2 text-right text-zinc-500 font-mono">{Number(r.midMarketRate).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-yellow-400 font-mono">
                    {Number(r.platformMargin) > 0 ? Number(r.platformMargin).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdjust && <AdjustModal onClose={() => { setShowAdjust(false); load(); }} />}
    </div>
  );
}

// ─── Adjust balance modal ──────────────────────────────────

function AdjustModal({ onClose }: { onClose: () => void }) {
  const [userId, setUserId] = useState('');
  const [pocket, setPocket] = useState<'USD' | 'UAH' | 'RUB'>('USD');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null); setSuccess(null);
    if (!userId || !delta || !reason || reason.trim().length < 3) {
      setError('Все поля обязательны (причина ≥ 3 символов)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminCurrencyApi.adjustBalance({ userId, pocket, delta, reason });
      setSuccess(`Готово. Conversion: ${res.conversionId}`);
      setDelta('');
    } catch (err) {
      setError((err as Error).message);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Ручная корректировка баланса</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-zinc-500 uppercase">ID пользователя</span>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="uuid / id пользователя"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 uppercase">Карман</span>
            <select
              value={pocket}
              onChange={e => setPocket(e.target.value as any)}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="USD">USD</option>
              <option value="UAH">UAH</option>
              <option value="RUB">RUB</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 uppercase">Дельта (может быть отрицательной)</span>
            <input
              type="number" step="0.01"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              placeholder="напр. -10.00 или 25.00"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 uppercase">Причина (обязательно)</span>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        {success && <p className="mt-3 text-emerald-400 text-xs">{success}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full mt-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-700 text-white text-sm font-semibold"
        >
          {submitting ? 'Применение...' : 'Применить'}
        </button>
        <p className="text-[10px] text-zinc-600 mt-2">
          Операция запишется в журнал конверсий с причиной «Ручная коррекция» и отдельной записью в аудит-логе.
        </p>
      </div>
    </div>
  );
}
