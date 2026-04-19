/**
 * Rates tab — current USD→X snapshot, per-source health and a small
 * sparkline-less table of the last 7 days (full charts can come
 * later; this is enough for an operator to sanity-check).
 */
import { useEffect, useState } from 'react';
import {
  adminCurrencyApi,
  type Currency,
  type RatesAdminView,
  type RateHistoryPoint,
} from '../../lib/currencyApi';

const ALL: Currency[] = ['UAH', 'RUB', 'EUR', 'PLN', 'KZT', 'UZS', 'MDL', 'RON'];

export default function CurrencyRatesTab() {
  const [view, setView] = useState<RatesAdminView | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('UAH');
  const [history, setHistory] = useState<RateHistoryPoint[]>([]);
  const [manualRate, setManualRate] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const v = await adminCurrencyApi.rates();
      setView(v);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }
  async function loadHistory() {
    try {
      const h = await adminCurrencyApi.rateHistory(selectedCurrency, 7);
      setHistory(h.history);
    } catch {}
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadHistory(); }, [selectedCurrency]);

  async function submitManual() {
    setMessage(null); setError(null);
    if (!manualRate || !manualReason) {
      setError('Укажите курс и причину');
      return;
    }
    try {
      await adminCurrencyApi.setManualRate(selectedCurrency, manualRate, manualReason);
      setMessage('Ручной курс применён. Он будет перезаписан при следующем авто-обновлении, если не отключён rate-updater.');
      setManualRate(''); setManualReason('');
      await load();
      await loadHistory();
    } catch (err) { setError((err as Error).message); }
  }

  if (loading) return <div className="text-zinc-500">Загрузка...</div>;

  const snapshot = (view?.snapshot?.rates ?? {}) as RatesAdminView['snapshot']['rates'];

  return (
    <div className="space-y-4">
      {/* Current snapshot */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-semibold">Текущие курсы (USD→X)</h3>
          <button onClick={load} className="text-zinc-400 hover:text-white text-sm">↻ обновить</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL.map(c => {
            const r = snapshot[c];
            return (
              <div key={c} className={`rounded-xl p-3 border ${r?.stale ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-zinc-800 bg-zinc-950'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-500 uppercase">{c}</span>
                  <span className="text-[10px] text-zinc-600 uppercase">{r?.source ?? '—'}</span>
                </div>
                <p className="text-white font-semibold">{r?.rate ?? '—'}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {r?.updatedAt ? new Date(r.updatedAt).toLocaleString('ru-RU') : '—'}
                </p>
                {r?.stale && <p className="text-[10px] text-yellow-400 mt-0.5">⚠ устарел</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual override */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">Ручное изменение курса</h3>
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-2 mb-3">
          <select
            value={selectedCurrency}
            onChange={e => setSelectedCurrency(e.target.value as Currency)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            {ALL.map(c => <option key={c} value={c}>USD → {c}</option>)}
          </select>
          <input
            type="number"
            step="0.0001"
            value={manualRate}
            onChange={e => setManualRate(e.target.value)}
            placeholder="Курс (напр. 41.2500)"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            value={manualReason}
            onChange={e => setManualReason(e.target.value)}
            placeholder="Причина (обязательно)"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={submitManual}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
          >
            Применить курс
          </button>
          {message && <span className="text-emerald-400 text-xs">{message}</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
        <p className="text-[11px] text-zinc-600 mt-2">
          Ручной курс сохраняется в истории с source="manual" и подпадёт под следующий
          автоматический апдейт от Fondy/ЦБ. Чтобы закрепить — отключите соответствующий источник.
        </p>
      </div>

      {/* History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">История за 7 дней ({selectedCurrency})</h3>
        {history.length === 0 ? (
          <p className="text-zinc-500 text-sm">Данных нет</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-1.5">Дата</th>
                  <th className="text-left py-1.5">Курс</th>
                  <th className="text-left py-1.5">Источник</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {history.map(p => (
                  <tr key={p.id} className="border-b border-zinc-900">
                    <td className="py-1.5">{new Date(p.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="py-1.5 font-mono">{Number(p.rate).toFixed(6)}</td>
                    <td className="py-1.5 text-zinc-500">{p.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
