/**
 * IP whitelist page — owner-only actions, staff.view listing.
 *
 * Shows every IP request / approval for ADMIN / MODERATOR accounts so the
 * OWNER can police who logs in from where. Non-owner staff see a read-only
 * view (useful for auditing or understanding why they got locked out).
 *
 * Layout:
 *   - Sticky banner with OWNER's current IP + status
 *   - Tabs by status (PENDING / APPROVED / REJECTED / ALL)
 *   - Rows grouped by user → list of (ip, label, status, attempts, lastSeen)
 *   - Inline actions: approve, reject, delete, edit label
 *   - "Pre-approve IP" form for owner to add a known IP in advance
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminIpEntry } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const STATUS_META: Record<AdminIpEntry['status'], { label: string; className: string; dot: string }> = {
  PENDING:  { label: 'Ожидает',  className: 'text-amber-300 bg-amber-500/10 border-amber-500/30',  dot: 'bg-amber-400' },
  APPROVED: { label: 'Одобрен',  className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  REJECTED: { label: 'Отклонён', className: 'text-red-300 bg-red-500/10 border-red-500/30',         dot: 'bg-red-400' },
};

function formatRel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const min = Math.floor(d / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const dd = Math.floor(h / 24);
  return `${dd} д назад`;
}

export default function IpWhitelistPage() {
  const { isOwner, user } = useAuth();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [entries, setEntries] = useState<AdminIpEntry[] | null>(null);
  const [myIp, setMyIp] = useState<{ ip: string; entry: AdminIpEntry | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, mine] = await Promise.all([
        adminApi.listIpEntries(status),
        adminApi.myIp().catch(() => null),
      ]);
      setEntries(list.entries);
      if (mine) setMyIp(mine);
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось загрузить IP-список');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    if (!entries) return [] as { user: AdminIpEntry['user']; items: AdminIpEntry[] }[];
    const map = new Map<string, { user: AdminIpEntry['user']; items: AdminIpEntry[] }>();
    for (const e of entries) {
      const key = e.userId;
      if (!map.has(key)) map.set(key, { user: e.user, items: [] });
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values());
  }, [entries]);

  const pendingCount = useMemo(
    () => entries?.filter(e => e.status === 'PENDING').length ?? 0,
    [entries],
  );

  const doApprove = async (e: AdminIpEntry) => {
    if (!isOwner) return;
    const label = prompt(`Метка для ${e.ip} (опционально, например "Дом Киев"):`, e.label ?? '') ?? undefined;
    setBusy(e.id);
    try {
      await adminApi.approveIp(e.id, label || undefined);
      toast.success('IP одобрен');
      load();
    } catch (err: any) { toast.error(err?.message || 'Ошибка'); }
    finally { setBusy(null); }
  };

  const doReject = async (e: AdminIpEntry) => {
    if (!isOwner) return;
    if (!confirm(`Отклонить IP ${e.ip} для ${e.user?.username}?\n\nВсе активные сессии этого пользователя будут разлогинены.`)) return;
    setBusy(e.id);
    try {
      await adminApi.rejectIp(e.id);
      toast.success('IP отклонён, сессии сброшены');
      load();
    } catch (err: any) { toast.error(err?.message || 'Ошибка'); }
    finally { setBusy(null); }
  };

  const doDelete = async (e: AdminIpEntry) => {
    if (!isOwner) return;
    if (!confirm(`Удалить запись IP ${e.ip}?\n\nПользователь сможет повторно запросить доступ с этого IP.`)) return;
    setBusy(e.id);
    try {
      await adminApi.deleteIp(e.id);
      toast.success('Запись удалена');
      load();
    } catch (err: any) { toast.error(err?.message || 'Ошибка'); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">IP-доступ персонала</h1>
          <p className="text-zinc-500 text-sm">
            {isOwner
              ? 'Одобряйте новые IP для админов и модераторов. Без одобрения логин блокируется.'
              : 'Только владелец может одобрять IP. Вы видите список для справки.'}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            🔔 {pendingCount} {pendingCount === 1 ? 'запрос ожидает' : 'запросов ожидают'} одобрения
          </div>
        )}
      </div>

      {/* My IP banner */}
      {myIp && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-zinc-500 text-xs uppercase">Ваш IP:</span>
          <code className="text-white font-mono text-sm bg-zinc-800 px-2 py-1 rounded">{myIp.ip}</code>
          {myIp.entry ? (
            <StatusBadge status={myIp.entry.status} />
          ) : (
            <span className="text-xs text-zinc-500">(запись не создана)</span>
          )}
          {user?.id && (
            <span className="ml-auto text-xs text-zinc-600">userId: {user.id.slice(0, 12)}…</span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              status === s ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'Все' : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && <div className="text-zinc-500 text-sm">Загрузка…</div>}
      {!loading && grouped.length === 0 && (
        <div className="text-zinc-500 text-sm py-10 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
          Записей нет.
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(g => (
          <div key={g.user?.id ?? Math.random()} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/70">
              {g.user?.avatar ? (
                <img src={g.user.avatar} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                  {(g.user?.username ?? '?')[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{g.user?.username ?? '—'}</div>
                <div className="text-zinc-500 text-xs">{g.user?.email ?? '—'} · {g.user?.role}</div>
              </div>
              <span className="text-xs text-zinc-500">{g.items.length} IP</span>
            </div>
            <div className="divide-y divide-zinc-800/70">
              {g.items.map(e => (
                <div key={e.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <span className={`w-2 h-2 rounded-full ${STATUS_META[e.status].dot}`} />
                    <code className="text-white font-mono text-sm">{e.ip}</code>
                  </div>
                  <StatusBadge status={e.status} />
                  {(e.geoCountry || e.geoCity) && (
                    <span className="text-xs text-zinc-400 bg-zinc-800/70 px-2 py-0.5 rounded flex items-center gap-1">
                      <span>📍</span>
                      <span>{[e.geoCity, e.geoCountry].filter(Boolean).join(', ')}</span>
                    </span>
                  )}
                  {e.label && (
                    <span className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                      {e.label}
                    </span>
                  )}
                  <div className="text-xs text-zinc-500 flex flex-wrap gap-x-3 gap-y-0.5 flex-1 min-w-[160px]">
                    <span>последний: {formatRel(e.lastSeenAt)}</span>
                    <span>попыток: {e.attempts}</span>
                    {e.approvedBy && <span>одобрил: {e.approvedBy.username}</span>}
                  </div>
                  {isOwner && (
                    <div className="flex gap-1.5 ml-auto">
                      {e.status !== 'APPROVED' && (
                        <button
                          onClick={() => doApprove(e)}
                          disabled={busy === e.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold"
                        >
                          Одобрить
                        </button>
                      )}
                      {e.status !== 'REJECTED' && (
                        <button
                          onClick={() => doReject(e)}
                          disabled={busy === e.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-300 text-xs font-semibold"
                        >
                          Отклонить
                        </button>
                      )}
                      <button
                        onClick={() => doDelete(e)}
                        disabled={busy === e.id}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-semibold"
                        title="Удалить запись"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isOwner && <PreApproveForm onDone={load} />}

      {!isOwner && (
        <div className="mt-6 text-xs text-zinc-500">
          Нужно добавить нового сотрудника? Сначала создайте аккаунт, затем владелец
          одобрит его IP здесь. Смотрите{' '}
          <Link to="/staff" className="text-emerald-400 hover:text-emerald-300">список персонала</Link>.
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminIpEntry['status'] }) {
  const meta = STATUS_META[status];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.className}`}>
      {meta.label}
    </span>
  );
}

/**
 * Tiny owner-only form to pre-approve an IP for a known userId (copy-paste
 * from /staff). This avoids the bootstrap problem when onboarding a new
 * moderator who can't even log in once to trigger a PENDING request.
 */
function PreApproveForm({ onDone }: { onDone: () => void }) {
  const [userId, setUserId] = useState('');
  const [ip, setIp] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !ip.trim()) return;
    setBusy(true);
    try {
      await adminApi.preapproveIp({ userId: userId.trim(), ip: ip.trim(), label: label.trim() || undefined });
      toast.success('IP предварительно одобрен');
      setIp(''); setLabel('');
      onDone();
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <h3 className="text-white font-semibold text-sm">Предварительно одобрить IP</h3>
      <p className="text-zinc-500 text-xs">
        Используйте, когда добавляете нового модератора и хотите, чтобы он сразу
        мог войти. ID пользователя берите из <Link to="/staff" className="text-emerald-400 hover:text-emerald-300">раздела персонала</Link>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="userId"
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 font-mono"
        />
        <input
          value={ip}
          onChange={e => setIp(e.target.value)}
          placeholder="IP (например 203.0.113.42)"
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 font-mono"
        />
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Метка (необяз.)"
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !userId.trim() || !ip.trim()}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-semibold"
      >
        {busy ? 'Сохраняю…' : 'Одобрить заранее'}
      </button>
    </form>
  );
}
