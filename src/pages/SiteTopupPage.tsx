import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/siteTopupApi';
import type { TopupOrder } from '../lib/siteTopupApi';

export default function SiteTopupPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">💰 Пополнение баланса сайта</h1>
        <p className="text-zinc-500 text-xs">Пакеты берутся из каталога UC · Зачисление автоматическое</p>
      </div>
      <OrdersSection />
    </div>
  );
}

function OrdersSection() {
  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({ status: filter || undefined, page, limit: 20 });
      setOrders(res.orders);
      setTotal(res.total);
      setFailed(res.pending);
      setPages(res.pages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s: string) => {
    switch (s) {
      case 'APPROVED': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">Зачислено</span>;
      case 'REJECTED': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Ошибка</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{s}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1">
          <p className="text-zinc-500 text-xs">Всего операций</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1">
          <p className="text-zinc-500 text-xs">Ошибок</p>
          <p className={`text-2xl font-bold ${failed > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{failed}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'APPROVED', 'REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
          >
            {s === '' ? 'Все' : s === 'APPROVED' ? '✅ Зачислены' : '❌ Ошибки'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Нет операций</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left pb-2 pl-3">Пользователь</th>
                <th className="text-left pb-2">Пакет</th>
                <th className="text-right pb-2">UC</th>
                <th className="text-right pb-2">Цена</th>
                <th className="text-center pb-2">Статус</th>
                <th className="text-right pb-2">Дата</th>
                <th className="text-left pb-2 pl-3">Причина ошибки</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition ${o.status === 'REJECTED' ? 'bg-red-950/10' : ''}`}>
                  <td className="py-3 pl-3">
                    <div className="flex items-center gap-2">
                      {o.user.avatar ? (
                        <img src={o.user.avatar} className="w-7 h-7 rounded-full" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                          {(o.user.displayName || o.user.username)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-xs font-medium">{o.user.displayName || o.user.username}</p>
                        <p className="text-zinc-500 text-[10px]">@{o.user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">{o.label || '—'}</td>
                  <td className="py-3 text-right">
                    <span className="text-white font-medium">{o.ucAmount}</span>
                    {o.bonusUc > 0 && <span className="text-amber-400 text-xs ml-1">+{o.bonusUc}</span>}
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-medium">${Number(o.price).toFixed(2)}</td>
                  <td className="py-3 text-center">{statusBadge(o.status)}</td>
                  <td className="py-3 text-right text-zinc-500 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-3 pl-3 text-xs max-w-[200px]">
                    {o.status === 'REJECTED' && o.adminNote ? (
                      <span className="text-red-400 break-words">{o.adminNote}</span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${p === page ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
