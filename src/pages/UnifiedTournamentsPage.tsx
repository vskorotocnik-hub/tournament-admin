import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';
import TournamentsPage from './TournamentsPage';
import ClassicTournamentsPage from './ClassicTournamentsPage';
import WoWMapsPage from './WoWMapsPage';

type Tab = 'tdm' | 'wow' | 'classic' | 'wow-maps';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'tdm', label: 'TDM', icon: '⚔️' },
  { id: 'wow', label: 'Мир чудес', icon: '🎯' },
  { id: 'classic', label: 'Classic', icon: '🏆' },
  { id: 'wow-maps', label: 'Карты МЧ', icon: '🗺️' },
];

type Stats = Awaited<ReturnType<typeof adminApi.tournamentStats>>;
type Alerts = Awaited<ReturnType<typeof adminApi.tournamentAlerts>>;
type ChartDay = { date: string; tdm: number; wow: number; total: number };

export default function UnifiedTournamentsPage() {
  const [tab, setTab] = useState<Tab>('tdm');
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [chart, setChart] = useState<ChartDay[]>([]);

  useEffect(() => {
    adminApi.tournamentStats().then(setStats).catch(() => {});
    adminApi.tournamentAlerts().then(setAlerts).catch(() => {});
    adminApi.tournamentRevenueChart().then(r => setChart(r.days)).catch(() => {});
  }, [tab]);

  const fmtMoney = (n: number) => n >= 1000 ? n.toLocaleString('ru-RU') : String(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Турниры</h1>
          <p className="text-zinc-500 text-sm mt-1">Все режимы: TDM, Мир чудес, Classic</p>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500">Всего: <span className="text-white font-bold">{(stats.tdm.total + stats.wow.total + stats.classic.total)}</span></span>
            <span className="text-zinc-500">Игроков: <span className="text-white font-bold">{(stats.tdm.players + stats.wow.players + stats.classic.players)}</span></span>
            <span className="text-zinc-500">Прибыль: <span className="text-emerald-400 font-bold">{fmtMoney(Math.round(stats.tdm.revenue + stats.wow.revenue))} UC</span></span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts && (alerts.openDisputes > 0 || alerts.searchingLong > 0) && (
        <div className="flex flex-wrap gap-3">
          {alerts.openDisputes > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
              <span className="text-red-400 text-sm font-bold">⚠️ {alerts.openDisputes}</span>
              <span className="text-red-300 text-xs">открытых споров — требуют решения</span>
            </div>
          )}
          {alerts.searchingLong > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-amber-400 text-sm font-bold">🕐 {alerts.searchingLong}</span>
              <span className="text-amber-300 text-xs">турниров в поиске &gt;1 часа</span>
            </div>
          )}
        </div>
      )}

      {/* Revenue chart (last 30 days) */}
      {chart.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">📈 Прибыль за 30 дней (комиссия UC)</h3>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/admin/tournaments/export`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs hover:text-white transition-colors"
            >📥 Экспорт CSV</a>
          </div>
          <div className="flex items-end gap-px h-24">
            {chart.map((d, i) => {
              const max = Math.max(...chart.map(c => c.total), 1);
              const h = Math.max((d.total / max) * 100, 2);
              const tdmH = d.total > 0 ? (d.tdm / d.total) * h : 0;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end group relative" title={`${d.date}: ${d.total} UC`}>
                  <div className="rounded-t-sm bg-blue-500/60" style={{ height: `${tdmH}%` }} />
                  <div className="rounded-t-sm bg-purple-500/60" style={{ height: `${h - tdmH}%` }} />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                    {d.date.slice(5)}: {d.total} UC
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
            <span><span className="inline-block w-2 h-2 bg-blue-500/60 rounded-sm mr-1" />TDM</span>
            <span><span className="inline-block w-2 h-2 bg-purple-500/60 rounded-sm mr-1" />МЧ</span>
            <span className="ml-auto">Итого: {fmtMoney(chart.reduce((s, d) => s + d.total, 0))} UC</span>
          </div>
        </div>
      )}

      {/* Dashboard cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TDM */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚔️</span>
              <span className="text-white font-bold text-sm">TDM</span>
              <span className="ml-auto text-zinc-500 text-xs">{stats.tdm.total} всего</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Поиск', value: stats.tdm.searching, color: 'text-blue-400' },
                { label: 'Идёт', value: stats.tdm.inProgress, color: 'text-yellow-400' },
                { label: 'Споры', value: stats.tdm.disputed, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-zinc-600 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs border-t border-zinc-800 pt-2">
              <span className="text-zinc-500">✅ {stats.tdm.completed} завершено</span>
              <span className="text-zinc-500">❌ {stats.tdm.cancelled} отменено</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-zinc-500">👥 {stats.tdm.players} игроков</span>
              <span className="text-emerald-400 font-medium">💰 {fmtMoney(Math.round(stats.tdm.revenue))} UC</span>
            </div>
          </div>

          {/* WoW */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎯</span>
              <span className="text-white font-bold text-sm">Мир чудес</span>
              <span className="ml-auto text-zinc-500 text-xs">{stats.wow.total} всего</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Поиск', value: stats.wow.searching, color: 'text-blue-400' },
                { label: 'Идёт', value: stats.wow.inProgress, color: 'text-yellow-400' },
                { label: 'Споры', value: stats.wow.disputed, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-zinc-600 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs border-t border-zinc-800 pt-2">
              <span className="text-zinc-500">✅ {stats.wow.completed} завершено</span>
              <span className="text-zinc-500">❌ {stats.wow.cancelled} отменено</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-zinc-500">👥 {stats.wow.players} игроков</span>
              <span className="text-emerald-400 font-medium">💰 {fmtMoney(Math.round(stats.wow.revenue))} UC</span>
            </div>
          </div>

          {/* Classic */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏆</span>
              <span className="text-white font-bold text-sm">Classic</span>
              <span className="ml-auto text-zinc-500 text-xs">{stats.classic.total} всего</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Регистрация', value: stats.classic.registration, color: 'text-blue-400' },
                { label: 'Идёт', value: stats.classic.inProgress, color: 'text-yellow-400' },
                { label: 'Завершено', value: stats.classic.completed, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-zinc-600 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs border-t border-zinc-800 pt-2">
              <span className="text-zinc-500">❌ {stats.classic.cancelled} отменено</span>
              <span className="text-zinc-500">👥 {stats.classic.players} регистраций</span>
            </div>
            <div className="text-xs mt-1">
              <span className="text-amber-400 font-medium">🏆 Призовой фонд: {fmtMoney(Math.round(stats.classic.totalPrizePool))} UC</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 pb-px">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${
              tab === t.id
                ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-400'
                : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'tdm' && <TournamentsPage />}
      {tab === 'wow' && <TournamentsPage gameTypeFilter="WOW" />}
      {tab === 'classic' && <ClassicTournamentsPage />}
      {tab === 'wow-maps' && <WoWMapsPage />}
    </div>
  );
}
