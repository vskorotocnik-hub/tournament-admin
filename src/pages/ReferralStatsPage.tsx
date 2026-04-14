import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

interface LevelStat {
  level: number;
  paid: number;
  count: number;
}

interface TopReferrer {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  totalEarned: number;
  transactions: number;
}

interface ReferralAdminStats {
  totalReferred: number;
  totalPaid: number;
  totalTransactions: number;
  todayPaid: number;
  todayTx: number;
  levels: LevelStat[];
  subscriptions: number;
  topReferrers: TopReferrer[];
}

export default function ReferralStatsPage() {
  const [stats, setStats] = useState<ReferralAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/referral/stats')
      .then((data: any) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-20 text-zinc-500">Не удалось загрузить данные</div>;
  }

  const levelLabels = ['Друзья (15%)', 'Друзья друзей (5%)', 'Третий круг (2%)'];
  const levelColors = ['text-purple-400', 'text-blue-400', 'text-amber-400'];
  const levelBg = ['bg-purple-500/15', 'bg-blue-500/15', 'bg-amber-500/15'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Реферальная система</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Пришло по рефералам" value={stats.totalReferred} icon="👥" />
        <StatCard label="Выплачено всего" value={`$${stats.totalPaid.toFixed(2)}`} icon="💵" highlight />
        <StatCard label="Выплачено сегодня" value={`$${stats.todayPaid.toFixed(2)}`} icon="📈" />
        <StatCard label="Подписок Level 3" value={stats.subscriptions} icon="👑" />
      </div>

      {/* By level */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-sm font-bold text-white mb-4">По уровням</h2>
        <div className="space-y-3">
          {stats.levels.map((lvl, i) => (
            <div key={lvl.level} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${levelBg[i]} flex items-center justify-center shrink-0`}>
                <span className={`text-sm font-bold ${levelColors[i]}`}>L{lvl.level}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white font-medium">{levelLabels[i]}</span>
                  <span className="text-sm text-emerald-400 font-bold">${lvl.paid.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: stats.totalPaid > 0 ? `${(lvl.paid / stats.totalPaid) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 w-20 text-right">{lvl.count} начислений</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top referrers */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-sm font-bold text-white mb-4">Топ рефереров</h2>
        {stats.topReferrers.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-6">Пока нет данных</p>
        ) : (
          <div className="space-y-2">
            {stats.topReferrers.map((r, i) => (
              <div key={r.userId} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50">
                <span className="w-6 text-center text-xs font-bold text-zinc-500">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {r.avatar ? (
                    <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-400 text-xs font-bold">{r.displayName[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{r.displayName}</p>
                  <p className="text-[10px] text-zinc-500">@{r.username} · {r.transactions} начислений</p>
                </div>
                <span className="text-emerald-400 font-bold text-sm shrink-0">${r.totalEarned.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string | number; icon: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
