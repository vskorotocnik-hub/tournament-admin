import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../lib/api';
import { toast } from '../lib/toast';

// ─── Action catalog & visual mapping ────────────────────────────────

interface ActionMeta {
  label: string;
  icon: string;
  color: string; // tailwind text color class
}

const ACTIONS: Record<string, ActionMeta> = {
  'user.ban':             { label: 'Бан пользователя',        icon: '🚫', color: 'text-red-400' },
  'user.unban':           { label: 'Разбан',                  icon: '✅', color: 'text-emerald-400' },
  'user.role_change':     { label: 'Смена роли',              icon: '🛡', color: 'text-amber-400' },
  'user.balance_change':  { label: 'Корректировка баланса',   icon: '💵', color: 'text-blue-400' },
  'user.uc_change':       { label: 'Корректировка UC',        icon: '💎', color: 'text-cyan-400' },
  'user.delete':          { label: 'Удаление пользователя',   icon: '🗑', color: 'text-red-500' },
  'config.update':        { label: 'Изменение настроек',      icon: '⚙️', color: 'text-purple-400' },
  'config.cache_flush':   { label: 'Сброс кеша',              icon: '🔄', color: 'text-zinc-400' },
  'withdrawal.complete':  { label: 'Вывод выполнен',          icon: '💸', color: 'text-emerald-400' },
  'withdrawal.reject':    { label: 'Вывод отклонён',          icon: '❌', color: 'text-red-400' },
  'tournament.cancel':    { label: 'Отмена турнира',          icon: '🏆', color: 'text-red-400' },
  'tournament.broadcast': { label: 'Рассылка в турнире',      icon: '📣', color: 'text-blue-400' },
  'uc.codes_add':         { label: 'Добавлены UC-коды',       icon: '💎', color: 'text-cyan-400' },
  'clan.payout':          { label: 'Выплата клану',           icon: '🏰', color: 'text-amber-400' },
};

const FILTER_ACTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все действия' },
  ...Object.entries(ACTIONS).map(([value, m]) => ({ value, label: `${m.icon} ${m.label}` })),
];

const metaFor = (action: string): ActionMeta =>
  ACTIONS[action] ?? { label: action, icon: '•', color: 'text-zinc-400' };

// ─── Helpers ─────────────────────────────────────────────────────────

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (isToday) return `Сегодня ${time}`;
  return `${d.toLocaleDateString('ru-RU')} ${time}`;
};

const fmtJson = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

// ─── Component ───────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof adminApi.auditLog>>['items']>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [admins, setAdmins] = useState<Array<{ adminId: string; adminName: string; count: number }>>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = useMemo(() => ({
    page,
    limit: 50,
    search: search.trim() || undefined,
    adminId: adminId || undefined,
    action: action || undefined,
    from: from || undefined,
    to:   to   || undefined,
  }), [page, search, adminId, action, from, to]);

  useEffect(() => {
    adminApi.auditLogAdmins().then(setAdmins).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    adminApi.auditLog(params)
      .then(r => { setItems(r.items); setTotal(r.total); setTotalPages(r.totalPages); })
      .catch(err => toast.error(err?.message || 'Не удалось загрузить аудит-лог'))
      .finally(() => setLoading(false));
  }, [params]);

  const resetFilters = () => {
    setSearch(''); setAdminId(''); setAction(''); setFrom(''); setTo(''); setPage(1);
  };

  const onFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-zinc-600';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">📜 Аудит действий</h1>
          <p className="text-zinc-500 text-sm mt-1">
            История всех действий админов и модераторов. Всего записей: <b className="text-zinc-300">{total.toLocaleString('ru-RU')}</b>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={e => onFilterChange(setSearch)(e.target.value)}
            placeholder="🔍 Поиск по админу, цели..."
            className={inp}
          />
          <select value={adminId} onChange={e => onFilterChange(setAdminId)(e.target.value)} className={inp}>
            <option value="">Любой админ</option>
            {admins.map(a => (
              <option key={a.adminId} value={a.adminId}>
                {a.adminName} ({a.count})
              </option>
            ))}
          </select>
          <select value={action} onChange={e => onFilterChange(setAction)(e.target.value)} className={inp}>
            {FILTER_ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg whitespace-nowrap"
            >
              Сбросить
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">С</label>
            <input type="datetime-local" value={from}
              onChange={e => onFilterChange(setFrom)(e.target.value)}
              className={`${inp} w-full`} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">По</label>
            <input type="datetime-local" value={to}
              onChange={e => onFilterChange(setTo)(e.target.value)}
              className={`${inp} w-full`} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-zinc-500 text-sm py-12 text-center">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-500 text-sm py-12 text-center">Ничего не найдено по заданным фильтрам</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {items.map(it => {
              const meta = metaFor(it.action);
              const isOpen = expanded === it.id;
              const hasDetails = !!it.metadata || !!it.ip || !!it.userAgent;
              return (
                <div key={it.id} className="hover:bg-zinc-800/30 transition-colors">
                  <button
                    type="button"
                    onClick={() => hasDetails && setExpanded(isOpen ? null : it.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`text-xl ${meta.color} shrink-0`}>{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                        {it.targetLabel && (
                          <span className="text-white text-sm truncate">→ {it.targetLabel}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>👤 <b className="text-zinc-300">{it.adminName}</b></span>
                        <span>•</span>
                        <span>{fmtTime(it.createdAt)}</span>
                        {it.ip && <><span>•</span><span className="font-mono">{it.ip}</span></>}
                      </div>
                    </div>
                    {hasDetails && (
                      <span className={`text-zinc-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                    )}
                  </button>

                  {isOpen && hasDetails && (
                    <div className="px-4 pb-4 pt-1 ml-10 space-y-2">
                      {it.metadata !== null && it.metadata !== undefined && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Детали</p>
                          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                            {fmtJson(it.metadata)}
                          </pre>
                        </div>
                      )}
                      {it.userAgent && (
                        <div className="text-[10px] text-zinc-500 truncate" title={it.userAgent}>
                          🖥 {it.userAgent}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm text-zinc-300 border border-zinc-700 rounded-lg disabled:opacity-30"
          >
            ← Назад
          </button>
          <span className="text-sm text-zinc-500">
            Стр. <b className="text-white">{page}</b> из <b className="text-white">{totalPages}</b>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm text-zinc-300 border border-zinc-700 rounded-lg disabled:opacity-30"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
