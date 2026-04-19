/**
 * Dashboard tab — top-of-funnel "is this thing healthy?" view.
 * Pulls three endpoints in parallel: totals, rate snapshot + health,
 * and the latest 5 failed payments. Refresh every 30s.
 */
import { useEffect, useState } from 'react';
import { adminCurrencyApi, type RatesAdminView, type PlatformTotals, type AdminPaymentLog } from '../../lib/currencyApi';

export default function CurrencyDashboardTab() {
  const [rates, setRates] = useState<RatesAdminView | null>(null);
  const [totals, setTotals] = useState<PlatformTotals | null>(null);
  const [recentFailures, setRecentFailures] = useState<AdminPaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [r, t, f] = await Promise.all([
        adminCurrencyApi.rates(),
        adminCurrencyApi.totals(),
        adminCurrencyApi.payments({ limit: 10, status: 'FAILED' }),
      ]);
      setRates(r);
      setTotals(t);
      setRecentFailures(f.payments);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="text-zinc-500">Загрузка...</div>;
  if (error)   return <div className="text-red-400">Ошибка: {error}</div>;

  const health = rates?.health;
  const healthy = health?.healthy;
  const lastRun = rates?.updater.lastRun
    ? new Date(rates.updater.lastRun).toLocaleString('ru-RU')
    : 'никогда';

  return (
    <div className="space-y-4">
      {/* Traffic-light health strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric
          label="Обновление курсов"
          value={rates?.updater.running ? 'АКТИВНО' : 'ОСТАНОВЛЕНО'}
          tone={rates?.updater.running ? 'ok' : 'err'}
          sub={`Последнее: ${lastRun}`}
        />
        <Metric
          label="Кэш курсов"
          value={healthy ? 'В НОРМЕ' : 'ДЕГРАДАЦИЯ'}
          tone={healthy ? 'ok' : 'warn'}
          sub={`в кэше: ${health?.cachedPairs ?? 0} пар`}
        />
        <Metric
          label="Fondy API"
          value={rates?.sources.fondy.state === 'closed' ? 'РАБОТАЕТ' : 'ОТКЛЮЧЕН'}
          tone={rates?.sources.fondy.state === 'closed' ? 'ok' : 'err'}
          sub={`Сбоев: ${rates?.sources.fondy.failures ?? 0}`}
        />
        <Metric
          label="ЦБ РФ"
          value={rates?.sources.cbr.state === 'closed' ? 'РАБОТАЕТ' : 'ОТКЛЮЧЕН'}
          tone={rates?.sources.cbr.state === 'closed' ? 'ok' : 'err'}
          sub={`Сбоев: ${rates?.sources.cbr.failures ?? 0}`}
        />
      </div>

      {/* Totals */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">Всего на платформе</h3>
        <div className="grid grid-cols-3 gap-3">
          <Pocket label="USD" balance={totals?.pockets.usdBalance} hold={totals?.holds.usdHold} />
          <Pocket label="UAH" balance={totals?.pockets.uahBalance} hold={totals?.holds.uahHold} />
          <Pocket label="RUB" balance={totals?.pockets.rubBalance} hold={totals?.holds.rubHold} />
        </div>
        <div className="mt-3 text-sm text-zinc-400">
          Ожидают обработки: <span className="text-white font-semibold">{totals?.pendingPayments ?? 0}</span> платежей
        </div>
      </div>

      {/* Stale / missing */}
      {health && (health.staleCurrencies.length > 0 || health.missingPairs.length > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-sm">
          <h4 className="text-yellow-300 font-semibold mb-1">Предупреждения по курсам</h4>
          {health.staleCurrencies.length > 0 && (
            <p className="text-yellow-200/90">Устарели: {health.staleCurrencies.join(', ')}</p>
          )}
          {health.missingPairs.length > 0 && (
            <p className="text-yellow-200/90">Отсутствуют: {health.missingPairs.join(', ')}</p>
          )}
        </div>
      )}

      {/* Recent failures */}
      {recentFailures.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Последние сбои платежей</h3>
          <div className="space-y-2">
            {recentFailures.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-zinc-950 rounded-xl p-3 text-xs">
                <div className="min-w-0">
                  <p className="text-white truncate">{paymentKindLabel(p.kind)} · {p.amount} {p.currency}</p>
                  <p className="text-zinc-500 truncate">{p.failureReason || '—'}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-red-400 font-medium">{paymentStatusLabel(p.status)}</p>
                  <p className="text-zinc-500">{new Date(p.createdAt).toLocaleString('ru-RU')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone, sub }: { label: string; value: string; tone: 'ok' | 'warn' | 'err'; sub?: string }) {
  const color =
    tone === 'ok'   ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  : tone === 'warn' ? 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30'
                    : 'text-red-400 bg-red-500/10 border-red-500/30';
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function Pocket({ label, balance, hold }: { label: string; balance?: string | null; hold?: string | null }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className="text-lg font-bold text-white mt-1">{Number(balance ?? 0).toFixed(2)}</p>
      <p className="text-[10px] text-yellow-400 mt-0.5">+{Number(hold ?? 0).toFixed(2)} в задержке</p>
    </div>
  );
}

// Small label helpers reused from the Payments tab. Kept inline to avoid
// a shared i18n module for a handful of strings.
function paymentKindLabel(kind: 'DEPOSIT' | 'WITHDRAWAL'): string {
  return kind === 'DEPOSIT' ? 'Пополнение' : 'Вывод';
}
function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':    return 'ожидание';
    case 'PROCESSING': return 'в обработке';
    case 'COMPLETED':  return 'завершен';
    case 'FAILED':     return 'ошибка';
    case 'REFUNDED':   return 'возврат';
    default:           return status;
  }
}
