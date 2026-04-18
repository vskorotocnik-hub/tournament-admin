import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import type { AdminStatsResponse, FinanceStatsResponse } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const REASON_LABELS: Record<string, string> = {
  rental_payout: 'Аренда: выплата',
  rental_escrow: 'Аренда: эскроу',
  rental_extension: 'Аренда: продление',
  rental_listing_fee: 'Листинг: комиссия',
  rental_dispute_resolved: 'Аренда: спор решён',
  rental_dispute_partial: 'Аренда: частичный возврат',
  tournament_entry: 'Турнир: вступление',
  tournament_prize: 'Турнир: приз',
  tournament_refund: 'Турнир: возврат',
  tournament_cancel_refund: 'Турнир: отмена',
  classic_tournament_entry: 'Классик: вступление',
  classic_tournament_prize: 'Классик: приз',
  classic_tournament_refund: 'Классик: возврат',
  classic_registration_refund: 'Классик: возврат рег.',
  clan_entry_fee: 'Клан: вступление',
  clan_payout: 'Клан: выплата',
  clan_fee_refund: 'Клан: возврат',
  withdrawal_request: 'Вывод средств',
  withdrawal_rejected: 'Вывод: отклонён',
  admin_balance_change: 'Админ: изменение баланса',
};

function fmt(n: number, currency?: string): string {
  if (currency === 'UC' || (!currency && n > 100 && n === Math.floor(n))) return `${n.toLocaleString('ru-RU')} UC`;
  return `$${n.toFixed(2)}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-800 rounded animate-pulse ${className}`} />;
}

type Tab = 'overview' | 'rentals' | 'tournaments' | 'transactions';

export default function DashboardPage() {
  const { hasCapability } = useAuth();
  // Moderators without `finances.revenue` see all the operational metrics
  // (counts of users, transactions, active escrow) but every concrete amount
  // is masked with bullets. Prevents low-trust staff from learning revenue
  // figures while still letting them do their job (audit, support, moderation).
  const canSeeMoney = hasCapability('finances.revenue');
  const mask = (s: string): string => canSeeMoney ? s : '•••';

  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [finance, setFinance] = useState<FinanceStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [chartDays, setChartDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.stats().catch(() => null),
      adminApi.financeStats(chartDays).catch(() => null),
    ]).then(([s, f]) => {
      if (s) setStats(s);
      if (f) setFinance(f);
    }).finally(() => setLoading(false));
  }, [chartDays]);

  const maxChartVal = finance ? Math.max(...finance.chart.map(d => d.total), 1) : 1;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Обзор' },
    { key: 'rentals', label: 'Аренда' },
    { key: 'tournaments', label: 'Турниры' },
    { key: 'transactions', label: 'Транзакции' },
  ];

  return (
    <div className="space-y-6">
      {!canSeeMoney && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-xs">
          🔒 <strong>Суммы скрыты.</strong> Право <code className="font-mono">finances.revenue</code> не выдано — вы видите количество транзакций и активность, но не конкретные цифры.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Финансы и статистика</h1>
          <p className="text-zinc-500 text-sm mt-1">Полный обзор платформы</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setChartDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${chartDays === d ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'}`}>
              {d}д
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* ═══ OVERVIEW TAB ═══ */}
          {tab === 'overview' && finance && (
            <div className="space-y-5">
              {/* Top metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '💵', label: 'Доход платформы (USD)', value: mask(fmt(finance.platform.totalUSD)), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { icon: '🎮', label: 'Доход платформы (UC)', value: mask(fmt(finance.platform.totalUC, 'UC')), color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { icon: '👤', label: 'Заработок юзеров (USD)', value: mask(fmt(finance.userEarnings.totalUSD)), color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { icon: '🏆', label: 'Заработок юзеров (UC)', value: mask(fmt(finance.userEarnings.totalUC, 'UC')), color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map(m => (
                  <div key={m.label} className={`${m.bg} border border-zinc-800 rounded-xl p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{m.icon}</span>
                      <span className={`text-xs font-medium ${m.color}`}>{m.label}</span>
                    </div>
                    <p className="text-white font-bold text-xl">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { icon: '👥', label: 'Пользователи', value: stats?.totalUsers ?? 0, sub: `+${stats?.usersThisWeek ?? 0} за нед.` },
                  { icon: '🟢', label: 'Активные (7д)', value: stats?.activeLastWeek ?? 0 },
                  { icon: '📊', label: 'Транзакций', value: finance.volume.totalTransactions.toLocaleString('ru-RU') },
                  { icon: '🔒', label: 'Эскроу', value: mask(`$${finance.volume.escrowHeld.toFixed(2)}`), sub: `${finance.volume.escrowCount} шт.` },
                  { icon: '📤', label: 'Выводы (ожид.)', value: finance.withdrawals.pending, sub: mask(`всего: ${finance.withdrawals.totalAmount.toLocaleString()} UC`) },
                  { icon: '💰', label: 'Общий баланс', value: mask(`$${(stats?.totalBalance ?? 0).toFixed(2)}`) },
                ].map(m => (
                  <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{m.icon}</span>
                      {'sub' in m && m.sub && <span className="text-xs font-medium text-emerald-400">{m.sub}</span>}
                    </div>
                    <p className="text-white font-bold text-lg">{m.value}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Platform revenue breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">Доход платформы — разбивка</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Аренда (комиссия 10%)', value: finance.platform.rentalFees, unit: 'USD', color: 'bg-emerald-500' },
                      { label: 'Листинги (комиссия)', value: finance.platform.listingFees, unit: 'USD', color: 'bg-teal-500' },
                      { label: 'Клан (вступление)', value: finance.platform.clanFees, unit: 'USD', color: 'bg-cyan-500' },
                      { label: 'TDM турниры', value: finance.platform.tournamentFeesTDM, unit: 'UC', color: 'bg-blue-500' },
                      { label: 'WoW турниры', value: finance.platform.tournamentFeesWoW, unit: 'UC', color: 'bg-indigo-500' },
                      { label: 'Классик турниры', value: finance.platform.classicRevenue, unit: 'UC', color: 'bg-violet-500' },
                    ].map(r => {
                      const maxVal = Math.max(finance.platform.totalUSD, finance.platform.totalUC, 1);
                      const pct = Math.min(100, (r.value / maxVal) * 100);
                      return (
                        <div key={r.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">{r.label}</span>
                            <span className="text-white font-medium">{mask(r.unit === 'USD' ? `$${r.value.toFixed(2)}` : `${r.value.toLocaleString('ru-RU')} UC`)}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${Math.max(pct, r.value > 0 ? 2 : 0)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User earnings breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">Заработок пользователей — разбивка</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Аренда (выплаты)', value: finance.userEarnings.rentalPayouts, unit: 'USD', color: 'bg-amber-500' },
                      { label: 'Клан (выплаты)', value: finance.userEarnings.clanPayouts, unit: 'USD', color: 'bg-orange-500' },
                      { label: 'Турнирные призы', value: finance.userEarnings.tournamentPrizes, unit: 'UC', color: 'bg-purple-500' },
                      { label: 'Классик призы', value: finance.userEarnings.classicPrizes, unit: 'UC', color: 'bg-pink-500' },
                    ].map(r => {
                      const maxVal = Math.max(finance.userEarnings.totalUSD, finance.userEarnings.totalUC, 1);
                      const pct = Math.min(100, (r.value / maxVal) * 100);
                      return (
                        <div key={r.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">{r.label}</span>
                            <span className="text-white font-medium">{mask(r.unit === 'USD' ? `$${r.value.toFixed(2)}` : `${r.value.toLocaleString('ru-RU')} UC`)}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${Math.max(pct, r.value > 0 ? 2 : 0)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Revenue chart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Доход по дням (последние {chartDays} дн.)</h3>
                <div className="flex items-end gap-[2px] h-44 overflow-x-auto">
                  {finance.chart.map((d, i) => {
                    const pct = (d.total / maxChartVal) * 100;
                    const dateObj = new Date(d.date);
                    const dayLabel = `${dateObj.getDate()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                    const showLabel = finance.chart.length <= 14 || i % Math.ceil(finance.chart.length / 15) === 0;
                    return (
                      <div key={d.date} className="flex-1 min-w-[8px] flex flex-col items-center gap-0.5 group relative">
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                          <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                            <p className="text-zinc-400">{dayLabel}</p>
                            {d.rental > 0 && <p className="text-emerald-400">Аренда: ${d.rental.toFixed(2)}</p>}
                            {d.listing > 0 && <p className="text-teal-400">Листинг: ${d.listing.toFixed(2)}</p>}
                            {d.tournament > 0 && <p className="text-blue-400">Турниры: {d.tournament.toFixed(0)} UC</p>}
                            <p className="text-white font-medium">Итого: ${d.total.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="w-full rounded-t relative overflow-hidden cursor-pointer"
                          style={{ height: `${Math.max(pct, d.total > 0 ? 2 : 0.5)}%`, minHeight: '2px' }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/60 to-emerald-500/20 group-hover:from-emerald-400/80 group-hover:to-emerald-400/30 transition" />
                        </div>
                        {showLabel && <span className="text-zinc-600 text-[9px] mt-0.5">{dayLabel}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top earners + Flow */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Top earners */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">Топ заработавших</h3>
                  {finance.topEarners.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Нет данных</p>
                  ) : (
                    <div className="space-y-2">
                      {finance.topEarners.map((e, i) => (
                        <div key={e.userId} className="flex items-center gap-3 py-1.5">
                          <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-400' : 'text-zinc-500'}`}>{i + 1}</span>
                          <span className="text-white text-sm flex-1 truncate">{e.nick}</span>
                          <span className="text-emerald-400 text-sm font-medium">${e.totalEarned.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Money flow */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">Денежный поток</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Расход USD (дебит)', value: `$${finance.volume.debitUSD.toFixed(2)}`, color: 'text-red-400' },
                      { label: 'Приход USD (кредит)', value: `$${finance.volume.creditUSD.toFixed(2)}`, color: 'text-emerald-400' },
                      { label: 'Расход UC (дебит)', value: `${finance.volume.debitUC.toLocaleString('ru-RU')} UC`, color: 'text-red-400' },
                      { label: 'Приход UC (кредит)', value: `${finance.volume.creditUC.toLocaleString('ru-RU')} UC`, color: 'text-emerald-400' },
                      { label: 'В эскроу сейчас', value: `$${finance.volume.escrowHeld.toFixed(2)} (${finance.volume.escrowCount})`, color: 'text-amber-400' },
                      { label: 'Всего транзакций', value: finance.volume.totalTransactions.toLocaleString('ru-RU'), color: 'text-white' },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between items-center py-1 border-b border-zinc-800 last:border-0">
                        <span className="text-zinc-400 text-sm">{f.label}</span>
                        <span className={`text-sm font-medium ${f.color}`}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ RENTALS TAB ═══ */}
          {tab === 'rentals' && finance && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Всего аренд', value: finance.rentals.total, icon: '🔑' },
                  { label: 'Активные', value: finance.rentals.active, icon: '🟢' },
                  { label: 'Споры', value: finance.rentals.disputed, icon: '⚠️' },
                  { label: 'Завершены', value: finance.rentals.completed, icon: '✅' },
                  { label: 'Отменены', value: finance.rentals.cancelled, icon: '❌' },
                ].map(m => (
                  <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <span className="text-lg">{m.icon}</span>
                    <p className="text-white font-bold text-lg mt-1">{m.value}</p>
                    <p className="text-zinc-500 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">Финансы аренды</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Общий оборот', value: `$${finance.rentals.totalVolume.toFixed(2)}` },
                      { label: 'Доход платформы (10%)', value: `$${finance.rentals.platformRevenue.toFixed(2)}`, color: 'text-emerald-400' },
                      { label: 'Выплаты владельцам', value: `$${finance.rentals.ownerPayouts.toFixed(2)}`, color: 'text-amber-400' },
                      { label: 'Комиссии за листинги', value: `$${finance.rentals.listingFees.toFixed(2)}`, color: 'text-teal-400' },
                      { label: 'Платных листингов', value: `${finance.rentals.listingCount}` },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-zinc-800 last:border-0">
                        <span className="text-zinc-400 text-sm">{r.label}</span>
                        <span className={`text-sm font-medium ${r.color || 'text-white'}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">Выводы (UC)</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Всего заявок', value: `${finance.withdrawals.total}` },
                      { label: 'Ожидают', value: `${finance.withdrawals.pending}`, color: finance.withdrawals.pending > 0 ? 'text-amber-400' : 'text-zinc-400' },
                      { label: 'Выполнены', value: `${finance.withdrawals.completed}`, color: 'text-emerald-400' },
                      { label: 'Отклонены', value: `${finance.withdrawals.rejected}`, color: 'text-red-400' },
                      { label: 'Выведено (UC)', value: `${finance.withdrawals.totalAmount.toLocaleString('ru-RU')} UC`, color: 'text-blue-400' },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-zinc-800 last:border-0">
                        <span className="text-zinc-400 text-sm">{r.label}</span>
                        <span className={`text-sm font-medium ${r.color || 'text-white'}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TOURNAMENTS TAB ═══ */}
          {tab === 'tournaments' && finance && (
            <div className="space-y-5">
              {[
                { title: 'TDM Турниры', data: finance.tournaments.tdm, unit: 'UC' },
                { title: 'WoW Турниры', data: finance.tournaments.wow, unit: 'UC' },
              ].map(section => (
                <div key={section.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-4">{section.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Всего', value: section.data.total },
                      { label: 'Поиск', value: section.data.searching },
                      { label: 'В процессе', value: section.data.inProgress },
                      { label: 'Завершены', value: section.data.completed },
                      { label: 'Доход (комиссия)', value: `${section.data.revenue.toLocaleString('ru-RU')} ${section.unit}`, color: 'text-emerald-400' },
                      { label: 'Призы выплачены', value: `${section.data.prizes.toLocaleString('ru-RU')} ${section.unit}`, color: 'text-amber-400' },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className={`font-bold text-lg ${m.color || 'text-white'}`}>{m.value}</p>
                        <p className="text-zinc-500 text-xs">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Классические турниры</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'Всего', value: finance.tournaments.classic.total },
                    { label: 'Регистрация', value: finance.tournaments.classic.registration },
                    { label: 'В процессе', value: finance.tournaments.classic.inProgress },
                    { label: 'Завершены', value: finance.tournaments.classic.completed },
                    { label: 'Входные сборы', value: `${finance.tournaments.classic.entryFeesCollected.toLocaleString('ru-RU')} UC` },
                    { label: 'Призы выданы', value: `${finance.tournaments.classic.prizesAwarded.toLocaleString('ru-RU')} UC`, color: 'text-amber-400' },
                    { label: 'Доход платформы', value: `${finance.tournaments.classic.revenue.toLocaleString('ru-RU')} UC`, color: 'text-emerald-400' },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <p className={`font-bold text-lg ${m.color || 'text-white'}`}>{m.value}</p>
                      <p className="text-zinc-500 text-xs">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Tournaments */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span>🌍</span>
                  <h3 className="text-white font-semibold text-sm">Глобальные турниры</h3>
                  <a href="/global-tournaments" className="text-xs text-blue-400 hover:text-blue-300 ml-auto">Управление →</a>
                </div>
                <p className="text-zinc-500 text-xs">Статистика глобальных турниров доступна на странице управления глобальными турнирами.</p>
              </div>
            </div>
          )}

          {/* ═══ TRANSACTIONS TAB ═══ */}
          {tab === 'transactions' && finance && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-white font-semibold text-sm">Крупнейшие транзакции за {chartDays} дн.</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                        <th className="text-left px-4 py-2 font-medium">Пользователь</th>
                        <th className="text-left px-4 py-2 font-medium">Тип</th>
                        <th className="text-left px-4 py-2 font-medium">Причина</th>
                        <th className="text-right px-4 py-2 font-medium">Сумма</th>
                        <th className="text-right px-4 py-2 font-medium">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finance.recentTransactions.map(tx => (
                        <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                          <td className="px-4 py-2.5 text-white">{tx.user.nick}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              tx.type === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-400' :
                              tx.type === 'DEBIT' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>{tx.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400">{REASON_LABELS[tx.reason] || tx.reason}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.type === 'CREDIT' ? '+' : '-'}{tx.currency === 'USD' ? `$${tx.amount.toFixed(2)}` : `${tx.amount.toLocaleString('ru-RU')} UC`}
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-500 text-xs">
                            {new Date(tx.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                      {finance.recentTransactions.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Нет транзакций за выбранный период</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
