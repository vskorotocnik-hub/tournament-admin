/**
 * Staff management — admins and moderators.
 *
 * Features:
 *   - List every ADMIN / MODERATOR with 2FA status and activity counts
 *     (last 24h / 7d / 30d + timestamp of last action from AdminAction log)
 *   - Click a row to open a drawer:
 *       • edit capability set (grouped checkboxes)
 *       • revoke all refresh tokens (force re-login everywhere)
 *       • demote to USER (reuses existing /users/:id/role endpoint)
 *       • delete the account (reuses /users/:id DELETE)
 *   - "Новый модератор" shortcut redirects to Users with role=MODERATOR
 *     filter so the admin can promote an existing user.
 *
 * Requires `staff.view` capability to render, `staff.manage` to mutate.
 * ADMIN is a wildcard and always has both.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';
import { adminApi, type StaffMember } from '../lib/api';
import { CAPABILITY_GROUPS } from '../lib/capabilities';
import { useAuth } from '../context/AuthContext';

const CARD = 'bg-zinc-900 border border-zinc-800 rounded-2xl p-5';

function formatRelative(iso: string | null): string {
  if (!iso) return 'никогда';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} д назад`;
  const mo = Math.floor(d / 30);
  return `${mo} мес назад`;
}

export default function StaffPage() {
  const { user: me, hasCapability } = useAuth();
  const navigate = useNavigate();
  const canManage = hasCapability('staff.manage');

  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MODERATOR'>('ALL');

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listStaff()
      .then(r => setStaff(r.staff))
      .catch(err => toast.error(err?.message || 'Не удалось загрузить персонал'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!staff) return [];
    const q = search.trim().toLowerCase();
    return staff.filter(s => {
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      if (!q) return true;
      return s.username.toLowerCase().includes(q) ||
             (s.email ?? '').toLowerCase().includes(q);
    });
  }, [staff, search, roleFilter]);

  const selected = staff?.find(s => s.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Персонал</h1>
          <p className="text-zinc-500 text-sm">Список админов и модераторов с правами и активностью</p>
        </div>
        <Link
          to="/users?role=MODERATOR"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
        >
          + Повысить пользователя
        </Link>
      </div>

      {/* Filters */}
      <div className={CARD + ' flex flex-wrap items-center gap-3'}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по нику / email..."
          className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          {(['ALL', 'ADMIN', 'MODERATOR'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                roleFilter === r ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'Все' : r === 'ADMIN' ? 'Админы' : 'Модераторы'}
            </button>
          ))}
        </div>
        <div className="text-zinc-500 text-xs">
          {staff ? `${filtered.length} из ${staff.length}` : ''}
        </div>
      </div>

      {/* Table */}
      <div className={CARD + ' p-0 overflow-x-auto'}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wide border-b border-zinc-800">
              <th className="text-left px-5 py-3 font-semibold">Пользователь</th>
              <th className="text-left px-3 py-3 font-semibold">Роль</th>
              <th className="text-left px-3 py-3 font-semibold">2FA</th>
              <th className="text-right px-3 py-3 font-semibold">Прав</th>
              <th className="text-right px-3 py-3 font-semibold">24ч</th>
              <th className="text-right px-3 py-3 font-semibold">7д</th>
              <th className="text-right px-3 py-3 font-semibold">30д</th>
              <th className="text-left px-3 py-3 font-semibold">Последнее действие</th>
              <th className="text-left px-5 py-3 font-semibold">Вход</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center text-zinc-500 py-10">Загрузка...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-zinc-500 py-10">Ничего не найдено</td></tr>
            )}
            {filtered.map(s => (
              <tr
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  selectedId === s.id ? 'bg-emerald-500/5' : 'hover:bg-zinc-800/40'
                }`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {s.avatar ? (
                      <img src={s.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                        {s.username[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">
                        {s.username}
                        {s.id === me?.id && <span className="ml-2 text-[10px] text-emerald-400">это вы</span>}
                      </div>
                      <div className="text-zinc-500 text-xs">{s.email ?? '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.role === 'ADMIN'
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {s.role}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {s.twoFactorEnabled
                    ? <span className="text-emerald-400 text-xs">🔐 вкл</span>
                    : <span className="text-red-400 text-xs">выкл</span>}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300">
                  {s.role === 'ADMIN' ? '∞' : s.capabilitiesCount}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300">{s.activity.last24h}</td>
                <td className="px-3 py-3 text-right text-zinc-300">{s.activity.last7d}</td>
                <td className="px-3 py-3 text-right text-zinc-300">{s.activity.last30d}</td>
                <td className="px-3 py-3 text-zinc-400 text-xs">{formatRelative(s.activity.lastActionAt)}</td>
                <td className="px-5 py-3 text-zinc-400 text-xs">{formatRelative(s.lastLoginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <StaffDrawer
          member={selected}
          canManage={canManage}
          isSelf={selected.id === me?.id}
          onClose={() => setSelectedId(null)}
          onChanged={() => { load(); }}
          onDeleted={() => { setSelectedId(null); load(); }}
          onDemoted={() => { setSelectedId(null); load(); navigate('/users'); }}
        />
      )}
    </div>
  );
}

function StaffDrawer({
  member, canManage, isSelf,
  onClose, onChanged, onDeleted, onDemoted,
}: {
  member: StaffMember;
  canManage: boolean;
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
  onDemoted: () => void;
}) {
  const [caps, setCaps] = useState<Set<string>>(new Set(member.capabilities));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setCaps(new Set(member.capabilities)); }, [member.id, member.capabilities]);

  const dirty = useMemo(() => {
    if (caps.size !== member.capabilities.length) return true;
    return member.capabilities.some(c => !caps.has(c));
  }, [caps, member.capabilities]);

  const toggle = (id: string) => {
    setCaps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const saveCaps = async () => {
    if (!canManage || isSelf) return;
    setSaving(true);
    try {
      await adminApi.updateStaffCapabilities(member.id, Array.from(caps));
      toast.success('Права сохранены');
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const revokeSessions = async () => {
    if (!canManage || isSelf) return;
    if (!confirm(`Разлогинить ${member.username} на всех устройствах?`)) return;
    try {
      const r = await adminApi.revokeStaffSessions(member.id);
      toast.success(`Сессии разлогинены (${r.revoked})`);
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    }
  };

  const demote = async () => {
    if (!canManage || isSelf) return;
    if (!confirm(`Понизить ${member.username} до обычного пользователя?\n\nВсе капабилити сбросятся и сайдбар станет пустым.`)) return;
    try {
      await adminApi.changeRole(member.id, 'USER');
      await adminApi.updateStaffCapabilities(member.id, []).catch(() => {});
      toast.success('Роль понижена');
      onDemoted();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    }
  };

  const deleteUser = async () => {
    if (!canManage || isSelf) return;
    if (!confirm(`УДАЛИТЬ аккаунт ${member.username}?\n\nЭто действие необратимо.`)) return;
    if (!confirm('Точно удалить? Данные пропадут навсегда.')) return;
    try {
      await adminApi.deleteUser(member.id);
      toast.success('Аккаунт удалён');
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка удаления');
    }
  };

  const disabled = !canManage || isSelf;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white">{member.username}</h2>
            <p className="text-zinc-500 text-xs">{member.email ?? 'без email'} · {member.role}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Self banner */}
        {isSelf && (
          <div className="m-6 mb-0 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            Это вы. Чтобы исключить самоблокировку, редактирование прав и действия недоступны.
          </div>
        )}

        {/* Capabilities grouped */}
        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm">Права доступа</h3>
              <div className="text-xs text-zinc-500">
                {member.role === 'ADMIN'
                  ? 'Администратор — доступно всё'
                  : `${caps.size} из ${CAPABILITY_GROUPS.flatMap(g => g.caps).length} прав`}
              </div>
            </div>

            {member.role === 'ADMIN' ? (
              <p className="text-zinc-400 text-xs p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                ADMIN — специальная роль. Он имеет все права автоматически, редактирование чекбоксов не влияет на доступ.
              </p>
            ) : (
              <div className="space-y-4">
                {CAPABILITY_GROUPS.map(group => (
                  <div key={group.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-zinc-200 text-sm font-semibold">{group.label}</h4>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          const allIds = group.caps.map(c => c.id);
                          const allOn = allIds.every(id => caps.has(id));
                          setCaps(prev => {
                            const next = new Set(prev);
                            if (allOn) allIds.forEach(id => next.delete(id));
                            else allIds.forEach(id => next.add(id));
                            return next;
                          });
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600"
                      >
                        вкл/выкл все
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {group.caps.map(c => (
                        <label
                          key={c.id}
                          className={`flex items-start gap-2 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={caps.has(c.id)}
                            disabled={disabled}
                            onChange={() => toggle(c.id)}
                            className="mt-0.5 w-4 h-4 accent-emerald-500"
                          />
                          <span className="flex-1">
                            <span className="text-zinc-300">{c.label}</span>
                            <span className="ml-2 text-zinc-600 font-mono text-[10px]">{c.id}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur -mx-6 px-6 py-3 border-t border-zinc-800 flex items-center gap-3">
                  <button
                    disabled={disabled || !dirty || saving}
                    onClick={saveCaps}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-semibold transition-colors"
                  >
                    {saving ? 'Сохраняю...' : dirty ? 'Сохранить изменения' : 'Сохранено'}
                  </button>
                  {dirty && (
                    <button
                      onClick={() => setCaps(new Set(member.capabilities))}
                      disabled={saving}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 space-y-3">
            <h3 className="text-red-400 font-semibold text-sm">⚠️ Опасная зона</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                disabled={disabled}
                onClick={revokeSessions}
                className="px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚪 Разлогинить везде
              </button>
              <button
                disabled={disabled}
                onClick={demote}
                className="px-3 py-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⬇️ Понизить до USER
              </button>
              <button
                disabled={disabled}
                onClick={deleteUser}
                className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🗑️ Удалить аккаунт
              </button>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3">📈 Активность</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric label="за 24ч" value={member.activity.last24h} />
              <Metric label="за 7 дней" value={member.activity.last7d} />
              <Metric label="за 30 дней" value={member.activity.last30d} />
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Последнее действие: {formatRelative(member.activity.lastActionAt)} ·
              <Link
                to={`/audit?adminId=${member.id}`}
                className="ml-2 text-emerald-400 hover:text-emerald-300"
                onClick={onClose}
              >
                открыть журнал →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg py-3">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}
