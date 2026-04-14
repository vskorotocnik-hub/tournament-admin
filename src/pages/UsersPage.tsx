import { useState, useEffect, useCallback } from 'react';
import { adminApi, securityApi } from '../lib/api';
import type { AdminUserItem, UserRestriction, RestrictionType } from '../lib/api';

const RESTRICTION_LABELS: Record<RestrictionType, string> = {
  MARKETPLACE: '🛒 Маркетплейс аккаунтов',
  RENTAL: '🔑 Аренда аккаунтов',
  BOOST: '🚀 Буст / Напарники',
  TOURNAMENT: '🏆 TDM / WoW турниры',
  CLASSIC_TOURNAMENT: '🎮 Классические турниры',
  CLAN: '🏰 Клан',
  WITHDRAWAL: '💸 Вывод средств ($)',
  DEPOSIT: '💰 Пополнение баланса ($)',
  UC_PURCHASE: '💎 Покупка UC',
  CHAT: '💬 Чат в сделках',
  SUPPORT: '🎧 Поддержка',
};
const ALL_RESTRICTION_TYPES = Object.keys(RESTRICTION_LABELS) as RestrictionType[];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [roleFilter, setRoleFilter] = useState<'' | 'USER' | 'MODERATOR' | 'ADMIN'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUcModal, setShowUcModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txData, setTxData] = useState<{ transactions: any[]; total: number; ucBalance: number } | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([]);
  const [restrictLoading, setRestrictLoading] = useState(false);
  const [newRestrictType, setNewRestrictType] = useState<RestrictionType>('MARKETPLACE');
  const [newRestrictReason, setNewRestrictReason] = useState('');
  const [balanceChange, setBalanceChange] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [ucChange, setUcChange] = useState('');
  const [ucReason, setUcReason] = useState('');
  const [banReasonText, setBanReasonText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchDebounced) params.search = searchDebounced;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      const res = await adminApi.users(params);
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, statusFilter, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBanClick = (user: AdminUserItem) => {
    setSelectedUser(user);
    if (user.isBanned) {
      // Разбан — без модалки
      handleUnban(user);
    } else {
      // Бан — показать модалку с причиной
      setBanReasonText('');
      setShowBanModal(true);
    }
  };

  const handleUnban = async (user: AdminUserItem) => {
    setActionLoading(true);
    try {
      await adminApi.banUser(user.id, false);
      await fetchUsers();
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanSubmit = async () => {
    if (!selectedUser || !banReasonText.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.banUser(selectedUser.id, true, banReasonText.trim());
      setShowBanModal(false);
      setBanReasonText('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBalanceSubmit = async () => {
    if (!selectedUser || !balanceChange || !balanceReason) return;
    setActionLoading(true);
    try {
      await adminApi.changeBalance(selectedUser.id, Number(balanceChange), balanceReason);
      setShowBalanceModal(false);
      setBalanceChange('');
      setBalanceReason('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUcBalanceSubmit = async () => {
    if (!selectedUser || !ucChange || !ucReason) return;
    setActionLoading(true);
    try {
      await adminApi.changeUcBalance(selectedUser.id, Number(ucChange), ucReason);
      setShowUcModal(false);
      setUcChange('');
      setUcReason('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (role: string) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminApi.changeRole(selectedUser.id, role);
      setShowRoleModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  };

  const getStatusBadge = (user: AdminUserItem) => {
    if (user.isBanned) return <span className="px-2 py-0.5 bg-red-400/10 text-red-400 rounded-lg text-xs font-medium">Забанен</span>;
    if (user.isVerified) return <span className="px-2 py-0.5 bg-emerald-400/10 text-emerald-400 rounded-lg text-xs font-medium">Активен</span>;
    return <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 rounded-lg text-xs font-medium">Не верифицирован</span>;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') return <span className="px-2 py-0.5 bg-purple-400/10 text-purple-400 rounded-lg text-xs font-medium">Админ</span>;
    if (role === 'MODERATOR') return <span className="px-2 py-0.5 bg-blue-400/10 text-blue-400 rounded-lg text-xs font-medium">Модератор</span>;
    return null;
  };

  const getAuthMethod = (user: AdminUserItem) => {
    const methods = [];
    if (user.email) methods.push('📧');
    if (user.telegramAuth) methods.push('📱');
    if (user.googleAuth) methods.push('🔵');
    return methods.join(' ') || '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Пользователи</h1>
        <p className="text-zinc-500 text-sm mt-1">{total} зарегистрировано</p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по нику или email..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['all', 'active', 'banned'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Все' : s === 'active' ? 'Активные' : 'Забаненные'}
            </button>
          ))}
        </div>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value as any); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-600"
        >
          <option value="">Все роли</option>
          <option value="USER">Пользователь</option>
          <option value="MODERATOR">Модератор</option>
          <option value="ADMIN">Админ</option>
        </select>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 text-xs font-medium px-4 py-3">Пользователь</th>
                <th className="text-left text-zinc-500 text-xs font-medium px-4 py-3 hidden md:table-cell">Баланс</th>
                <th className="text-left text-zinc-500 text-xs font-medium px-4 py-3 hidden lg:table-cell">Роль</th>
                <th className="text-left text-zinc-500 text-xs font-medium px-4 py-3 hidden md:table-cell">Статус</th>
                <th className="text-left text-zinc-500 text-xs font-medium px-4 py-3 hidden lg:table-cell">Авторизация</th>
                <th className="text-left text-zinc-500 text-xs font-medium px-4 py-3 hidden xl:table-cell">Регистрация</th>
                <th className="text-right text-zinc-500 text-xs font-medium px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td colSpan={7} className="px-4 py-4"><div className="h-6 bg-zinc-800 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500 text-sm">Пользователи не найдены</td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{user.username}</p>
                        <p className="text-zinc-500 text-xs">{user.email || 'без email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-emerald-400 font-bold text-sm">${user.balance.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">{getRoleBadge(user.role) || <span className="text-zinc-500 text-xs">Юзер</span>}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{getStatusBadge(user)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm">{getAuthMethod(user)}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-zinc-500 text-xs">{formatDate(user.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedUser(user)} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-all">Профиль</button>
                      <button onClick={() => { setSelectedUser(user); setShowBalanceModal(true); }} className="px-2 py-1 bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-lg text-xs transition-all">$</button>
                      <button onClick={() => handleBanClick(user)} disabled={actionLoading || user.role === 'ADMIN'} className="px-2 py-1 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg text-xs transition-all disabled:opacity-30">
                        {user.isBanned ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <span className="text-zinc-500 text-xs">Стр. {page} из {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-lg disabled:opacity-30 transition-all">←</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-lg disabled:opacity-30 transition-all">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка профиля */}
      {selectedUser && !showBalanceModal && !showRoleModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setSelectedUser(null)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-2xl z-50 overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Профиль пользователя</h2>
                <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex items-center gap-4">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt="" className="w-16 h-16 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xl font-bold">
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-lg">{selectedUser.username}</p>
                  <p className="text-zinc-500 text-sm">{selectedUser.email || 'без email'}</p>
                  <div className="flex gap-2 mt-1">
                    {getStatusBadge(selectedUser)}
                    {getRoleBadge(selectedUser.role)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs">Баланс</p>
                  <p className="text-emerald-400 font-bold text-lg">${selectedUser.balance.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs">UC Баланс</p>
                  <p className="text-orange-400 font-bold text-lg">{Number((selectedUser as any).ucBalance || 0).toLocaleString()} UC</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs">Регистрация</p>
                  <p className="text-white font-medium text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs">Последний вход</p>
                  <p className="text-white font-medium text-sm">{formatDate(selectedUser.lastLoginAt)}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs">Авторизация</p>
                  <p className="text-white font-medium text-sm">{getAuthMethod(selectedUser)}</p>
                </div>
              </div>

              {selectedUser.telegramAuth && (
                <div className="bg-zinc-800/30 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs mb-1">Телеграм</p>
                  <p className="text-white text-sm">@{selectedUser.telegramAuth.username || 'без ника'} (ID: {selectedUser.telegramAuth.telegramId})</p>
                </div>
              )}
              {selectedUser.googleAuth && (
                <div className="bg-zinc-800/30 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs mb-1">Гугл</p>
                  <p className="text-white text-sm">{selectedUser.googleAuth.email}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowBalanceModal(true)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors">Баланс $</button>
                <button onClick={() => setShowUcModal(true)} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors">UC Баланс</button>
                <button onClick={() => {
                  setShowTxModal(true); setTxLoading(true);
                  adminApi.getUserTransactions(selectedUser.id).then(r => setTxData({ transactions: r.transactions, total: r.total, ucBalance: r.user.ucBalance })).catch(() => {}).finally(() => setTxLoading(false));
                }} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors">💰 История</button>
                <button onClick={() => setShowRoleModal(true)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">Роль</button>
                <button onClick={() => {
                  setShowRestrictModal(true); setRestrictLoading(true);
                  securityApi.getRestrictions(selectedUser.id).then(setRestrictions).catch(() => {}).finally(() => setRestrictLoading(false));
                }} className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-xl transition-colors">🛡 Ограничения</button>
                <button onClick={() => handleBanClick(selectedUser)} disabled={actionLoading || selectedUser.role === 'ADMIN'} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-30">
                  {selectedUser.isBanned ? 'Разбанить' : 'Забанить'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модалка баланса */}
      {showBalanceModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => { setShowBalanceModal(false); setBalanceChange(''); setBalanceReason(''); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px] bg-zinc-900 border border-zinc-800 rounded-2xl z-50">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Изменить баланс</h2>
              <p className="text-zinc-400 text-sm">Пользователь: <span className="text-white font-medium">{selectedUser.username}</span></p>
              <p className="text-zinc-400 text-sm">Текущий баланс: <span className="text-emerald-400 font-bold">${selectedUser.balance.toFixed(2)}</span></p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Сумма ($)</label>
                <input type="number" value={balanceChange} onChange={e => setBalanceChange(e.target.value)} placeholder="+100 или -50" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Причина</label>
                <textarea value={balanceReason} onChange={e => setBalanceReason(e.target.value)} placeholder="Причина изменения баланса..." rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowBalanceModal(false); setBalanceChange(''); setBalanceReason(''); }} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">Отмена</button>
                <button onClick={handleBalanceSubmit} disabled={actionLoading || !balanceChange || !balanceReason} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {actionLoading ? 'Загрузка...' : 'Применить'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модалка UC баланса */}
      {showUcModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => { setShowUcModal(false); setUcChange(''); setUcReason(''); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px] bg-zinc-900 border border-zinc-800 rounded-2xl z-50">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Изменить UC баланс</h2>
              <p className="text-zinc-400 text-sm">Пользователь: <span className="text-white font-medium">{selectedUser.username}</span></p>
              <p className="text-zinc-400 text-sm">Текущий UC баланс: <span className="text-orange-400 font-bold">{Number((selectedUser as any).ucBalance || 0).toLocaleString()} UC</span></p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Сумма (UC)</label>
                <input type="number" value={ucChange} onChange={e => setUcChange(e.target.value)} placeholder="+500 или -100" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Причина</label>
                <textarea value={ucReason} onChange={e => setUcReason(e.target.value)} placeholder="Бонус за активность, тест и т.д." rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowUcModal(false); setUcChange(''); setUcReason(''); }} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">Отмена</button>
                <button onClick={handleUcBalanceSubmit} disabled={actionLoading || !ucChange || !ucReason} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {actionLoading ? 'Загрузка...' : 'Применить'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модалка роли */}
      {showRoleModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowRoleModal(false)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[360px] bg-zinc-900 border border-zinc-800 rounded-2xl z-50">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Сменить роль</h2>
              <p className="text-zinc-400 text-sm">Пользователь: <span className="text-white font-medium">{selectedUser.username}</span></p>
              <p className="text-zinc-400 text-sm">Текущая роль: <span className="text-white font-medium">{selectedUser.role}</span></p>
              <div className="space-y-2">
                {([
                  { role: 'USER', label: 'Пользователь', cls: 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700' },
                  { role: 'MODERATOR', label: 'Модератор', cls: 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30' },
                  { role: 'ADMIN', label: 'Администратор', cls: 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30' },
                ] as const).map(r => (
                  <button
                    key={r.role}
                    onClick={() => handleRoleChange(r.role)}
                    disabled={actionLoading || r.role === selectedUser.role}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                      r.role === selectedUser.role ? 'bg-zinc-700 text-zinc-400 cursor-default' : r.cls
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRoleModal(false)} className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">Отмена</button>
            </div>
          </div>
        </>
      )}

      {/* Модалка бана */}
      {showBanModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => { setShowBanModal(false); setBanReasonText(''); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] bg-zinc-900 border border-red-500/30 rounded-2xl z-50">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                  <span className="text-xl">🚫</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Забанить пользователя</h2>
                  <p className="text-zinc-500 text-xs">{selectedUser.username}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">Причина бана</label>
                <textarea
                  value={banReasonText}
                  onChange={e => setBanReasonText(e.target.value)}
                  placeholder="Укажите причину блокировки..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 resize-none"
                />
                <p className="text-zinc-600 text-xs">Пользователь увидит эту причину при попытке входа</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowBanModal(false); setBanReasonText(''); }} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">Отмена</button>
                <button onClick={handleBanSubmit} disabled={actionLoading || !banReasonText.trim()} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {actionLoading ? 'Загрузка...' : 'Забанить'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модалка ограничений */}
      {showRestrictModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => { setShowRestrictModal(false); setNewRestrictReason(''); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[85vh] bg-zinc-900 border border-yellow-500/30 rounded-2xl z-50 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">🛡 Ограничения — {selectedUser.username}</h2>
                <p className="text-zinc-500 text-xs mt-0.5">Запрет доступа к разделам сайта</p>
              </div>
              <button onClick={() => setShowRestrictModal(false)} className="text-zinc-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Existing restrictions */}
              <div className="space-y-2">
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Активные ограничения</p>
                {restrictLoading ? (
                  <p className="text-zinc-500 text-sm">Загрузка...</p>
                ) : restrictions.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Нет ограничений</p>
                ) : (
                  restrictions.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                      <div>
                        <span className="text-yellow-400 font-medium text-sm">{RESTRICTION_LABELS[r.type]}</span>
                        {r.reason && <p className="text-zinc-500 text-xs mt-0.5">{r.reason}</p>}
                        <p className="text-zinc-600 text-xs">{new Date(r.createdAt).toLocaleString('ru')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          setRestrictLoading(true);
                          try {
                            await securityApi.removeRestriction(selectedUser.id, r.type);
                            const updated = await securityApi.getRestrictions(selectedUser.id);
                            setRestrictions(updated);
                          } catch (e: any) { alert(e.message); }
                          finally { setRestrictLoading(false); }
                        }}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-xs transition-colors"
                      >
                        Снять
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add restriction */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Добавить ограничение</p>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Раздел</label>
                  <select
                    value={newRestrictType}
                    onChange={e => setNewRestrictType(e.target.value as RestrictionType)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    {ALL_RESTRICTION_TYPES.filter(t => !restrictions.some(r => r.type === t)).map(t => (
                      <option key={t} value={t}>{RESTRICTION_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Причина (необязательно)</label>
                  <input
                    value={newRestrictReason}
                    onChange={e => setNewRestrictReason(e.target.value)}
                    placeholder="Причина ограничения..."
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  disabled={restrictLoading || ALL_RESTRICTION_TYPES.filter(t => !restrictions.some(r => r.type === t)).length === 0}
                  onClick={async () => {
                    setRestrictLoading(true);
                    try {
                      await securityApi.addRestriction(selectedUser.id, newRestrictType, newRestrictReason || undefined);
                      const updated = await securityApi.getRestrictions(selectedUser.id);
                      setRestrictions(updated);
                      setNewRestrictReason('');
                    } catch (e: any) { alert(e.message); }
                    finally { setRestrictLoading(false); }
                  }}
                  className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Добавить ограничение
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модалка истории транзакций */}
      {showTxModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => { setShowTxModal(false); setTxData(null); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl z-50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">💰 История UC — {selectedUser.username}</h2>
                {txData && <p className="text-xs text-zinc-500 mt-0.5">Текущий баланс: <span className="text-orange-400 font-bold">{txData.ucBalance.toLocaleString()} UC</span> · {txData.total} транзакций</p>}
              </div>
              <button onClick={() => { setShowTxModal(false); setTxData(null); }} className="text-zinc-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {txLoading ? (
                <p className="text-zinc-500 text-sm text-center py-8">Загрузка...</p>
              ) : !txData || txData.transactions.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет транзакций</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-800">
                    <th className="px-2 py-2 text-left">Дата</th>
                    <th className="px-2 py-2 text-left">Тип</th>
                    <th className="px-2 py-2 text-right">Сумма</th>
                    <th className="px-2 py-2 text-right">Баланс</th>
                    <th className="px-2 py-2 text-left">Причина</th>
                  </tr></thead>
                  <tbody>
                    {txData.transactions.map(tx => {
                      const isCredit = tx.type === 'CREDIT';
                      const dt = new Date(tx.createdAt);
                      const reasonLabels: Record<string, string> = {
                        tournament_entry: '🎮 Вступление в турнир',
                        tournament_prize: '🏆 Приз за турнир',
                        tournament_refund: '↩️ Возврат ставки',
                        admin_adjustment: '👑 Ручная корректировка',
                        manual: '✏️ Ручное',
                      };
                      return (
                        <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="px-2 py-2 text-zinc-400 text-xs whitespace-nowrap">{dt.toLocaleDateString('ru-RU')} {dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-2 py-2"><span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{isCredit ? 'Приход' : 'Расход'}</span></td>
                          <td className={`px-2 py-2 text-right font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>{isCredit ? '+' : ''}{tx.amount} UC</td>
                          <td className="px-2 py-2 text-right text-zinc-400">{tx.balanceAfter} UC</td>
                          <td className="px-2 py-2 text-zinc-300 text-xs max-w-[200px] truncate" title={tx.reason}>{reasonLabels[tx.reason] || tx.reason}{tx.refId ? ` · #${tx.refId.slice(-6)}` : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
