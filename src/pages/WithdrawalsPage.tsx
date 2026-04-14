import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../lib/api';

type WR = {
  id: string; userId: string; username: string; avatar: string | null;
  userUcBalance: number; amount: number; gameId: string; status: string;
  adminId: string | null; adminNote: string | null;
  processedAt: string | null; createdAt: string;
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  PROCESSING: 'bg-blue-500/15 text-blue-400',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-400',
};
const statusLabels: Record<string, string> = {
  PENDING: '⏳ Ожидает', PROCESSING: '🔄 Обработка',
  COMPLETED: '✅ Выполнен', REJECTED: '❌ Отклонён',
};

export default function WithdrawalsPage() {
  const [requests, setRequests] = useState<WR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listWithdrawals(filter || undefined)
      .then(r => setRequests(r.requests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (id: string) => {
    if (busy) return;
    if (!confirm('Вы уже отправили UC на игровой аккаунт? Подтвердить вывод?')) return;
    setBusy(true);
    try {
      await adminApi.completeWithdrawal(id, 'Отправлено вручную');
      load();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(false);
  };

  const handleReject = async (id: string) => {
    if (busy || !rejectNote.trim()) return;
    setBusy(true);
    try {
      await adminApi.rejectWithdrawal(id, rejectNote.trim());
      setActionId(null); setRejectNote('');
      load();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(false);
  };

  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.toLocaleDateString('ru-RU')} ${dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const pending = requests.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Вывод UC</h1>
          <p className="text-zinc-500 text-sm mt-1">Запросы на вывод игровой валюты</p>
        </div>
        {pending.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2">
            <span className="text-yellow-400 text-sm font-bold">⚠️ {pending.length} ожидают обработки</span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'Все' },
          { value: 'PENDING', label: '⏳ Ожидает' },
          { value: 'COMPLETED', label: '✅ Выполнен' },
          { value: 'REJECTED', label: '❌ Отклонён' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm text-center py-12">Загрузка...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-zinc-400 text-sm">Нет запросов на вывод</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className={`bg-zinc-900 border rounded-xl p-4 ${r.status === 'PENDING' ? 'border-yellow-500/30' : 'border-zinc-800'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {r.avatar ? (
                    <img src={r.avatar} alt="" className="w-10 h-10 rounded-full shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold shrink-0">
                      {r.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{r.username}</p>
                    <p className="text-zinc-500 text-xs">UC баланс: {r.userUcBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-orange-400 font-bold text-lg">{r.amount} UC</p>
                  <p className="text-zinc-500 text-xs">Game ID: <span className="text-white font-mono">{r.gameId}</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[r.status] || ''}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                  <span className="text-zinc-600 text-xs">{fmt(r.createdAt)}</span>
                  {r.processedAt && <span className="text-zinc-600 text-xs">→ {fmt(r.processedAt)}</span>}
                </div>

                {(r.status === 'PENDING' || r.status === 'PROCESSING') && (
                  <div className="flex gap-2">
                    {actionId === r.id ? (
                      <div className="flex items-center gap-2">
                        <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Причина отказа..."
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white w-48 outline-none" />
                        <button onClick={() => handleReject(r.id)} disabled={busy || !rejectNote.trim()}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg disabled:opacity-50">Отклонить</button>
                        <button onClick={() => { setActionId(null); setRejectNote(''); }}
                          className="px-2 py-1 text-zinc-500 text-xs hover:text-white">✕</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => handleComplete(r.id)} disabled={busy}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                          ✅ Выполнен
                        </button>
                        <button onClick={() => setActionId(r.id)} disabled={busy}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium rounded-lg border border-red-500/30 disabled:opacity-50">
                          ❌ Отклонить
                        </button>
                      </>
                    )}
                  </div>
                )}
                {r.adminNote && <p className="text-zinc-500 text-xs italic ml-2">«{r.adminNote}»</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
