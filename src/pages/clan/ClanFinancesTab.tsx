import { useState, useEffect } from 'react';
import { getClanFinances } from '../../lib/clanApi';
import type { ClanFinancesData } from '../../lib/clanApi';

const typeIcon: Record<string, string> = {
  ENTRY_FEE: '💵', TOWER: '🏰', INTERNAL_TOURNAMENT: '🏆', EXTERNAL_TOURNAMENT: '�',
};
const targetLabel: Record<string, string> = {
  USER: '� Пользователь', SITE: '🏷️ Сайт', TREASURY: '🏦 Казна',
};
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
};
const fmtMoney = (n: number) => n >= 1000 ? `$${n.toLocaleString('ru-RU')}` : `$${n}`;

export default function ClanFinancesTab() {
  const [data, setData] = useState<ClanFinancesData | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    getClanFinances().then(setData).catch(e => console.error('Finances error:', e));
  }, []);

  if (!data) return <div className="text-center py-10 text-zinc-500">Загрузка...</div>;

  const filtered = typeFilter === 'all'
    ? data.entries
    : data.entries.filter(e => e.type === typeFilter);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Доход от взносов', value: fmtMoney(data.feeIncome), sub: 'ENTRY_FEE (все сплиты)', color: 'text-emerald-400' },
          { label: 'Казна клана', value: fmtMoney(data.treasury), sub: 'Начисления в казну', color: 'text-blue-400' },
          { label: 'Выплачено', value: fmtMoney(data.prizesPaid), sub: 'Оплаченные записи (USER)', color: 'text-amber-400' },
          { label: 'Доход сайта', value: fmtMoney(data.siteIncome), sub: 'Начисления SITE', color: 'text-purple-400' },
          { label: 'Призы башни', value: fmtMoney(data.towerTotal), sub: 'TOWER (все сплиты)', color: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-white font-bold text-sm">📑 Книга операций (ClanPayoutLedger)</h3>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'ENTRY_FEE', 'TOWER', 'EXTERNAL_TOURNAMENT'] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${typeFilter === f ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {f === 'all' ? 'Все' : f === 'ENTRY_FEE' ? 'Взносы' : f === 'TOWER' ? 'Башня' : 'Внешние'}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {filtered.map(entry => (
            <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{typeIcon[entry.type] || '💵'}</span>
                <div>
                  <p className="text-white text-sm">{entry.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-zinc-600 text-xs">{fmtDate(entry.date)}</span>
                    <span className="text-zinc-700 text-xs">|</span>
                    <span className="text-zinc-500 text-xs">{targetLabel[entry.target] || entry.target}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-bold text-sm ${entry.target === 'SITE' ? 'text-purple-400' : entry.target === 'TREASURY' ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {fmtMoney(entry.amount)}
                </span>
                <p className={`text-xs mt-0.5 ${entry.status === 'PAID' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                  {entry.status === 'PAID' ? '✓ Оплачено' : '⏳ Ожидает'}
                </p>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-zinc-600">Нет записей</div>}
      </div>
    </div>
  );
}
