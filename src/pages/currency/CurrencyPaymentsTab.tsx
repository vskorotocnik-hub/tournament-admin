/**
 * Payments tab — global payment log with status filter and inline
 * approve/reject for PENDING withdrawals (requires `reason`).
 */
import { useEffect, useState } from 'react';
import { adminCurrencyApi, type AdminPaymentLog } from '../../lib/currencyApi';

const STATUS_FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;
type Status = typeof STATUS_FILTERS[number];

export default function CurrencyPaymentsTab() {
  const [rows, setRows] = useState<AdminPaymentLog[]>([]);
  const [status, setStatus] = useState<Status>('PENDING');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await adminCurrencyApi.payments({
        limit: 200,
        status: status === 'ALL' ? undefined : status,
      });
      setRows(res.payments);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [status]);

  async function approve(id: string) {
    const reason = window.prompt('Причина одобрения (для аудит-лога):', 'manual-approval');
    if (!reason) return;
    setBusyId(id); setError(null); setMessage(null);
    try {
      await adminCurrencyApi.approveWithdrawal(id, reason);
      setMessage('Одобрено, выплата запущена');
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusyId(null); }
  }

  async function reject(id: string) {
    const reason = window.prompt('Причина отклонения (обязательно):');
    if (!reason || reason.trim().length < 3) return;
    setBusyId(id); setError(null); setMessage(null);
    try {
      await adminCurrencyApi.rejectWithdrawal(id, reason);
      setMessage('Отклонено, средства возвращены на баланс');
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-3">
      {(message || error) && (
        <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'}`}>
          {error ?? message}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${status === s ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'}`}
          >
            {s}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-zinc-500 hover:text-white text-sm">↻ обновить</button>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8 text-center">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-zinc-500 py-8 text-center">Нет платежей</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2">Дата</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Тип</th>
                <th className="text-left px-3 py-2">Provider</th>
                <th className="text-right px-3 py-2">Сумма</th>
                <th className="text-left px-3 py-2">Статус</th>
                <th className="text-right px-3 py-2 w-40">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map(p => (
                <tr key={p.id} className="hover:bg-zinc-950/50">
                  <td className="px-3 py-2 text-zinc-400">{new Date(p.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2 text-white">{p.user?.username ?? p.userId.slice(0, 8)}</td>
                  <td className="px-3 py-2">
                    <span className={p.kind === 'DEPOSIT' ? 'text-emerald-400' : 'text-yellow-400'}>{p.kind}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{p.provider} / {p.method}</td>
                  <td className="px-3 py-2 text-right text-white font-mono">
                    {Number(p.amount).toFixed(2)} {p.currency}
                    {p.feeAmount && Number(p.feeAmount) > 0 && (
                      <div className="text-[10px] text-zinc-500">fee {Number(p.feeAmount).toFixed(2)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={p.status} />
                    {p.failureReason && <div className="text-[10px] text-red-400 mt-0.5 max-w-xs truncate">{p.failureReason}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.kind === 'WITHDRAWAL' && p.status === 'PENDING' && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => approve(p.id)}
                          disabled={busyId === p.id}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] disabled:bg-zinc-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject(p.id)}
                          disabled={busyId === p.id}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] disabled:bg-zinc-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminPaymentLog['status'] }) {
  const tone =
    status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
    status === 'FAILED'    ? 'bg-red-500/15 text-red-300 border-red-500/30' :
    status === 'REFUNDED'  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
    status === 'PENDING'   ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' :
                             'bg-blue-500/15 text-blue-300 border-blue-500/30';
  return <span className={`text-[10px] px-2 py-0.5 rounded border ${tone}`}>{status}</span>;
}
