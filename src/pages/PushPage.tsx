import { useState, useEffect, useRef } from 'react';
import * as pushApi from '../lib/pushApi';
import type { NotificationSetting, TgSubscriber, SearchUser, PushStats } from '../lib/pushApi';
import { NOTIFICATION_TYPE_LABELS } from '../lib/pushApi';

type Tab = 'dashboard' | 'settings' | 'broadcast' | 'subscribers';

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient }: { icon: string; label: string; value: number; sub?: string; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient}`}>
      <div className="absolute top-3 right-3 text-3xl opacity-20">{icon}</div>
      <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-white text-3xl font-bold mt-1">{(value ?? 0).toLocaleString('ru')}</p>
      {sub && <p className="text-white/50 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function PushPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [stats, setStats] = useState<PushStats>({ totalUsers: 0, telegramSubscribers: 0, newSubsThisWeek: 0, newSubsThisMonth: 0, activeThisWeek: 0 });
  const [loading, setLoading] = useState(true);

  // Broadcast
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');
  const [bcUrl, setBcUrl] = useState('');
  const [bcMode, setBcMode] = useState<'all' | 'targeted'>('all');
  const [bcTargets, setBcTargets] = useState<SearchUser[]>([]);
  const [bcSearch, setBcSearch] = useState('');
  const [bcSearchResults, setBcSearchResults] = useState<SearchUser[]>([]);
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Edit modal
  const [editType, setEditType] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Subscribers
  const [subs, setSubs] = useState<TgSubscriber[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subPages, setSubPages] = useState(1);
  const [subSearch, setSubSearch] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (tab === 'subscribers') loadSubscribers(); }, [tab, subPage, subSearch]);

  async function loadData() {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        pushApi.getSettings().catch(() => []),
        pushApi.getStats().catch(() => ({} as Partial<PushStats>)),
      ]);
      if (Array.isArray(s)) setSettings(s);
      if (st && typeof st === 'object') setStats(prev => ({ ...prev, ...st }));
    } catch {} finally { setLoading(false); }
  }

  async function loadSubscribers() {
    try {
      const data = await pushApi.getSubscribers(subPage, 20, subSearch);
      setSubs(Array.isArray(data?.subscribers) ? data.subscribers : []);
      setSubTotal(data?.total ?? 0);
      setSubPages(data?.pages ?? 1);
    } catch {
      setSubs([]);
      setSubTotal(0);
      setSubPages(1);
    }
  }

  async function toggleSetting(type: string, enabled: boolean) {
    try {
      const updated = await pushApi.updateSetting(type, { enabled });
      setSettings(prev => prev.map(s => s.type === type ? updated : s));
    } catch {}
  }

  function openEdit(s: NotificationSetting) {
    setEditType(s.type);
    setEditTitle(s.title);
    setEditBody(s.body);
  }

  async function saveEdit() {
    if (!editType) return;
    setEditSaving(true);
    try {
      const updated = await pushApi.updateSetting(editType, { title: editTitle, body: editBody });
      setSettings(prev => prev.map(s => s.type === editType ? updated : s));
      setEditType(null);
    } catch {} finally { setEditSaving(false); }
  }

  function handleBcSearch(q: string) {
    setBcSearch(q);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setBcSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await pushApi.searchUsers(q);
        setBcSearchResults((Array.isArray(results) ? results : []).filter(u => !bcTargets.find(t => t.id === u.id)));
      } catch { setBcSearchResults([]); }
    }, 300);
  }

  function addTarget(u: SearchUser) {
    setBcTargets(prev => [...prev, u]);
    setBcSearchResults(prev => prev.filter(r => r.id !== u.id));
    setBcSearch('');
  }

  function removeTarget(id: string) {
    setBcTargets(prev => prev.filter(t => t.id !== id));
  }

  async function sendBroadcast() {
    if (!bcTitle.trim() || !bcBody.trim()) return;
    if (bcMode === 'targeted' && bcTargets.length === 0) return;
    setBcSending(true);
    setBcResult(null);
    try {
      const userIds = bcMode === 'targeted' ? bcTargets.map(t => t.id) : undefined;
      const result = await pushApi.broadcast(bcTitle.trim(), bcBody.trim(), bcUrl.trim() || undefined, userIds);
      setBcResult(`Отправлено ${result.sent} пользователям`);
      setBcTitle(''); setBcBody(''); setBcUrl(''); setBcTargets([]); setBcSearch('');
    } catch (err: any) {
      setBcResult(`Ошибка: ${err.message}`);
    } finally { setBcSending(false); }
  }

  const pct = stats.totalUsers > 0 ? Math.round((stats.telegramSubscribers / stats.totalUsers) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Обзор', icon: '📊' },
    { key: 'settings', label: 'Автоматические', icon: '⚙️' },
    { key: 'broadcast', label: 'Рассылка', icon: '📢' },
    { key: 'subscribers', label: 'Подписчики', icon: '👥' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Уведомления</h1>
        <p className="text-zinc-500 text-sm mt-1">Telegram-уведомления и рассылки</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.key
                ? 'bg-zinc-700 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ DASHBOARD ═══════════ */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="👥" label="Всего пользователей" value={stats.totalUsers} gradient="bg-gradient-to-br from-zinc-800 to-zinc-700" />
            <StatCard icon="✈️" label="Telegram подписчики" value={stats.telegramSubscribers} sub={`${pct}% от всех`} gradient="bg-gradient-to-br from-blue-900/80 to-blue-800/60" />
            <StatCard icon="🆕" label="Новые за неделю" value={stats.newSubsThisWeek} gradient="bg-gradient-to-br from-emerald-900/80 to-emerald-800/60" />
            <StatCard icon="🔥" label="Активные за неделю" value={stats.activeThisWeek} gradient="bg-gradient-to-br from-amber-900/80 to-amber-800/60" />
          </div>

          {/* Progress bar */}
          <div className="bg-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">Охват Telegram</span>
              <span className="text-white text-sm font-bold">{stats.telegramSubscribers} / {stats.totalUsers}</span>
            </div>
            <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>За месяц: +{stats.newSubsThisMonth}</span>
              <span>{pct}% подключены</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setTab('broadcast')} className="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-2xl p-5 text-left transition-colors group">
              <div className="text-2xl mb-2">📢</div>
              <p className="text-white font-semibold">Отправить рассылку</p>
              <p className="text-zinc-500 text-sm mt-1">Всем или конкретным пользователям</p>
            </button>
            <button onClick={() => setTab('settings')} className="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-2xl p-5 text-left transition-colors group">
              <div className="text-2xl mb-2">⚙️</div>
              <p className="text-white font-semibold">Настройки ({settings.filter(s => s.enabled).length}/{settings.length})</p>
              <p className="text-zinc-500 text-sm mt-1">Управление автоматическими уведомлениями</p>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ SETTINGS ═══════════ */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-sm">Автоматические Telegram-уведомления. Переменные: <code className="text-emerald-400">{'{sender}'}</code>, <code className="text-emerald-400">{'{status}'}</code>, <code className="text-emerald-400">{'{amount}'}</code>, <code className="text-emerald-400">{'{result}'}</code></p>
            <span className="text-xs text-zinc-500 shrink-0 ml-4">{settings.filter(s => s.enabled).length} из {settings.length} активны</span>
          </div>

          <div className="grid gap-3">
            {settings.map(s => {
              const meta = NOTIFICATION_TYPE_LABELS[s.type];
              return (
                <div key={s.type} className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl mt-0.5 w-8 text-center shrink-0">{meta?.icon || '🔔'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-semibold text-sm">{meta?.label || s.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-600/30 text-zinc-500'}`}>
                          {s.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">{meta?.desc || ''}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-zinc-600">Шаблон:</span>
                        <span className="text-zinc-400 font-mono">{s.title}</span>
                        {s.body && <span className="text-zinc-600">—</span>}
                        {s.body && <span className="text-zinc-500 font-mono truncate">{s.body}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleSetting(s.type, !s.enabled)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${s.enabled ? 'bg-emerald-600' : 'bg-zinc-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.enabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Modal */}
          {editType && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditType(null)}>
              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{NOTIFICATION_TYPE_LABELS[editType]?.icon || '🔔'}</span>
                  <h3 className="text-lg font-bold text-white">{NOTIFICATION_TYPE_LABELS[editType]?.label || editType}</h3>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 block mb-1.5">Заголовок</label>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-600 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 block mb-1.5">Текст сообщения</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-600 focus:border-blue-500 outline-none text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditType(null)} className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-700 transition-colors">
                    Отмена
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
                  >
                    {editSaving ? 'Сохраняю...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ BROADCAST ═══════════ */}
      {tab === 'broadcast' && (
        <div className="max-w-2xl space-y-5">
          {/* Mode selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setBcMode('all')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                bcMode === 'all'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="text-xl mb-1">🌍</div>
              <p className={`font-semibold text-sm ${bcMode === 'all' ? 'text-blue-400' : 'text-white'}`}>Всем подписчикам</p>
              <p className="text-zinc-500 text-xs mt-0.5">{stats.telegramSubscribers} получателей</p>
            </button>
            <button
              onClick={() => setBcMode('targeted')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                bcMode === 'targeted'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="text-xl mb-1">🎯</div>
              <p className={`font-semibold text-sm ${bcMode === 'targeted' ? 'text-blue-400' : 'text-white'}`}>Конкретным пользователям</p>
              <p className="text-zinc-500 text-xs mt-0.5">Выбрать из списка</p>
            </button>
          </div>

          {/* Targeted user search */}
          {bcMode === 'targeted' && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-3">
              <label className="text-sm text-zinc-400">Поиск пользователей (мин. 2 символа)</label>
              <input
                value={bcSearch}
                onChange={e => handleBcSearch(e.target.value)}
                placeholder="Имя пользователя..."
                className="w-full px-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-600 focus:border-blue-500 outline-none text-sm"
              />
              {/* Search results */}
              {bcSearchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {bcSearchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => addTarget(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-700 transition-colors text-left"
                    >
                      {u.avatar
                        ? <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center text-xs text-zinc-300 font-bold">{(u.displayName || u.username)[0]?.toUpperCase()}</div>
                      }
                      <span className="text-white text-sm">{u.displayName || u.username}</span>
                      <span className="text-zinc-500 text-xs">@{u.username}</span>
                      <span className="ml-auto text-blue-400 text-xs">+ Добавить</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Selected targets */}
              {bcTargets.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Выбрано: {bcTargets.length}</p>
                  <div className="flex flex-wrap gap-2">
                    {bcTargets.map(u => (
                      <span key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        {u.displayName || u.username}
                        <button onClick={() => removeTarget(u.id)} className="hover:text-red-400 transition-colors">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message form */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">Заголовок *</label>
              <input
                value={bcTitle}
                onChange={e => setBcTitle(e.target.value)}
                placeholder="Новое обновление!"
                className="w-full px-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-600 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">Текст сообщения *</label>
              <textarea
                value={bcBody}
                onChange={e => setBcBody(e.target.value)}
                placeholder="Мы добавили новые функции..."
                rows={4}
                className="w-full px-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-600 focus:border-blue-500 outline-none text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">Ссылка (опционально)</label>
              <input
                value={bcUrl}
                onChange={e => setBcUrl(e.target.value)}
                placeholder="/tournaments"
                className="w-full px-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-600 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {/* Preview */}
            {(bcTitle || bcBody) && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-2">Предпросмотр:</p>
                <p className="text-white text-sm font-medium">📢 {bcTitle || '...'}</p>
                <p className="text-zinc-300 text-sm mt-1 whitespace-pre-wrap">{bcBody || '...'}</p>
                {bcUrl && <p className="text-blue-400 text-xs mt-2">🔗 {bcUrl}</p>}
              </div>
            )}

            <button
              onClick={sendBroadcast}
              disabled={bcSending || !bcTitle.trim() || !bcBody.trim() || (bcMode === 'targeted' && bcTargets.length === 0)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 text-sm"
            >
              {bcSending ? 'Отправляю...' : bcMode === 'all'
                ? `Отправить всем (${stats.telegramSubscribers})`
                : `Отправить ${bcTargets.length} пользователям`}
            </button>
            {bcResult && (
              <p className={`text-sm text-center ${bcResult.startsWith('Ошибка') ? 'text-red-400' : 'text-emerald-400'}`}>
                {bcResult}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ SUBSCRIBERS ═══════════ */}
      {tab === 'subscribers' && (
        <div className="space-y-4">
          {/* Search + count */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                value={subSearch}
                onChange={e => { setSubSearch(e.target.value); setSubPage(1); }}
                placeholder="Поиск по имени, username или email..."
                className="w-full px-4 py-2.5 pl-10 bg-zinc-800 text-white rounded-xl border border-zinc-700 focus:border-blue-500 outline-none text-sm"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <span className="text-zinc-500 text-sm shrink-0">{subTotal} подписчиков</span>
          </div>

          {/* List */}
          <div className="space-y-2">
            {subs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <div className="text-4xl mb-3">📭</div>
                <p>{subSearch ? 'Никого не найдено' : 'Нет подписчиков Telegram'}</p>
              </div>
            ) : (
              subs.map(u => (
                <div key={u.id} className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600/50 transition-colors">
                  {u.avatar
                    ? <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-sm font-bold shrink-0">{(u.displayName || u.username)[0]?.toUpperCase()}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{u.displayName || u.username}</p>
                    <p className="text-zinc-500 text-xs truncate">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-zinc-500 text-xs">{new Date(u.createdAt).toLocaleDateString('ru')}</p>
                    {u.lastLoginAt && (
                      <p className="text-zinc-600 text-[10px]">Был: {new Date(u.lastLoginAt).toLocaleDateString('ru')}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {subPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setSubPage(p => Math.max(1, p - 1))}
                disabled={subPage <= 1}
                className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg disabled:opacity-30 transition-colors"
              >
                ← Назад
              </button>
              <span className="text-zinc-500 text-sm">{subPage} из {subPages}</span>
              <button
                onClick={() => setSubPage(p => Math.min(subPages, p + 1))}
                disabled={subPage >= subPages}
                className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg disabled:opacity-30 transition-colors"
              >
                Далее →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
