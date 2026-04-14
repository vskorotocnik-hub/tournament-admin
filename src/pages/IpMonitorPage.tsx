import { useState, useEffect, useCallback } from 'react';
import { securityApi, adminApi, type IpGroup, type IpGroupUser } from '../lib/api';

const ROLES: Record<string, string> = { ADMIN: '👑 Админ', MODERATOR: '🛡 Модер', USER: '👤 Юзер' };

export default function IpMonitorPage() {
  const [groups, setGroups] = useState<IpGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minAccounts, setMinAccounts] = useState(3);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IpGroupUser | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await securityApi.ipMonitor(minAccounts);
      setGroups(res.groups);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [minAccounts]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleBan = (user: IpGroupUser) => {
    setSelectedUser(user);
    setBanReason('Множественные аккаунты с одного IP');
    setShowBanModal(true);
  };

  const confirmBan = async () => {
    if (!selectedUser) return;
    setBanningId(selectedUser.id);
    try {
      await adminApi.banUser(selectedUser.id, !selectedUser.isBanned, banReason || undefined);
      setShowBanModal(false);
      await fetchGroups();
    } catch (err: any) {
      alert(err.message || 'Ошибка');
    } finally {
      setBanningId(null);
    }
  };

  const riskColor = (count: number) => {
    if (count >= 10) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (count >= 5) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🔍 IP Monitor
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Аккаунты с одного IP-адреса — подозрительная активность</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-zinc-400 text-sm">Мин. аккаунтов:</label>
          <select
            value={minAccounts}
            onChange={e => setMinAccounts(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            {[2, 3, 4, 5, 10].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
          <button onClick={fetchGroups} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            Обновить
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">Подозрительных IP</p>
            <p className="text-2xl font-bold text-red-400">{total}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">Всего аккаунтов</p>
            <p className="text-2xl font-bold text-white">{groups.reduce((s, g) => s + g.users.length, 0)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">Уже забанено</p>
            <p className="text-2xl font-bold text-orange-400">{groups.reduce((s, g) => s + g.users.filter(u => u.isBanned).length, 0)}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">{error}</div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">✅</p>
          <p>Подозрительных IP не найдено (мин. {minAccounts} аккаунтов)</p>
        </div>
      )}

      {/* Groups list */}
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.ip} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* IP header */}
            <button
              onClick={() => setExpanded(expanded === group.ip ? null : group.ip)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold border ${riskColor(group.count)}`}>
                  ⚠️ {group.count} акк.
                </span>
                <span className="font-mono text-white font-medium">{group.ip}</span>
                <span className="text-zinc-500 text-xs">
                  последняя активность: {new Date(group.lastSeen).toLocaleString('ru')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 text-xs">{group.users.filter(u => u.isBanned).length} забанено</span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${expanded === group.ip ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded users */}
            {expanded === group.ip && (
              <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                {group.users.map(user => (
                  <div key={user.id} className={`flex items-center gap-4 px-4 py-3 ${user.isBanned ? 'bg-red-500/5' : ''}`}>
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                      onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm">{user.username}</span>
                        {user.displayName && user.displayName !== user.username && (
                          <span className="text-zinc-500 text-xs">({user.displayName})</span>
                        )}
                        <span className="text-xs text-zinc-500">{ROLES[user.role] || user.role}</span>
                        {user.isBanned && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">Забанен</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Рег: {new Date(user.createdAt).toLocaleDateString('ru')}
                        {user.lastLoginAt && ` · Последний вход: ${new Date(user.lastLoginAt).toLocaleString('ru')}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleBan(user)}
                      disabled={banningId === user.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        user.isBanned
                          ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30'
                          : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30'
                      }`}
                    >
                      {user.isBanned ? 'Разбанить' : 'Забанить'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ban modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              {selectedUser.isBanned ? 'Разбанить' : 'Забанить'} {selectedUser.username}
            </h2>
            {!selectedUser.isBanned && (
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Причина</label>
                <input
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Причина бана"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowBanModal(false)} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors">
                Отмена
              </button>
              <button
                onClick={confirmBan}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedUser.isBanned ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
