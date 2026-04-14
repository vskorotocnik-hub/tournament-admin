import { useState, useEffect, useCallback, useRef } from 'react';
import * as accountApi from '../lib/accountApi';

type ActionTab = 'stats' | 'pending' | 'listings' | 'deals' | 'disputes' | 'cancelled' | 'flagged' | 'videos';

const SC: Record<string, string> = {
  PENDING_REVIEW: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  PAUSED: 'bg-zinc-500/20 text-zinc-400',
  SOLD: 'bg-blue-500/20 text-blue-400',
  PENDING_TRANSFER: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  DISPUTED: 'bg-red-500/20 text-red-400',
  RESOLVED: 'bg-purple-500/20 text-purple-400',
  CANCELLED_BY_SELLER: 'bg-zinc-500/20 text-zinc-400',
  CANCELLED_BY_BUYER: 'bg-zinc-500/20 text-zinc-400',
};

const SL: Record<string, string> = {
  PENDING_REVIEW: 'На проверке',
  APPROVED: 'Активно',
  REJECTED: 'Отклонено',
  PAUSED: 'Приостановлено',
  SOLD: 'Продано',
  PENDING_TRANSFER: 'Передача',
  COMPLETED: 'Завершена',
  DISPUTED: 'Спор',
  RESOLVED: 'Решено',
  CANCELLED_BY_SELLER: 'Отменена продавцом',
  CANCELLED_BY_BUYER: 'Отменена покупателем',
};

const SUBCATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: '', label: 'Все', icon: '📦' },
  { id: 'ACCOUNT', label: 'Аккаунты', icon: '🎮' },
  { id: 'COSTUME', label: 'Костюмы', icon: '👔' },
  { id: 'CAR', label: 'Машины', icon: '🚗' },
  { id: 'METRO_ROYALE', label: 'Metro Royale', icon: '🚇' },
  { id: 'POPULARITY', label: 'Популярность', icon: '⭐' },
  { id: 'HOME_VOTES', label: 'Голоса дома', icon: '🏠' },
  { id: 'CLAN', label: 'Кланы', icon: '🛡️' },
];

export default function AccountManagementPage() {
  const [subcat, setSubcat] = useState('');
  const [actionTab, setActionTab] = useState<ActionTab>('stats');
  const [listings, setListings] = useState<accountApi.AccountListingAdmin[]>([]);
  const [deals, setDeals] = useState<accountApi.AccountDealAdmin[]>([]);
  const [stats, setStats] = useState<accountApi.CategoryStats | null>(null);
  const [cancelledDeals, setCancelledDeals] = useState<accountApi.AccountDealAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [decision, setDecision] = useState('refund_buyer');
  const [note, setNote] = useState('');
  const [pct, setPct] = useState(50);

  // Chat state
  const [selDealId, setSelDealId] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<accountApi.AccountMessageAdmin[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatVisibility, setChatVisibility] = useState<'all' | 'seller' | 'buyer'>('all');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Flagged accounts state
  const [flaggedAccounts, setFlaggedAccounts] = useState<accountApi.FlaggedAccount[]>([]);
  const [flaggedListings, setFlaggedListings] = useState<accountApi.AccountListingAdmin[]>([]);
  const [newFlagUid, setNewFlagUid] = useState('');
  const [newFlagReason, setNewFlagReason] = useState('');

  // Payout state
  const [payoutDealId, setPayoutDealId] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<accountApi.PayoutScheduleItem[]>([]);

  // Video moderation state
  const [videos, setVideos] = useState<accountApi.SellerVideoItem[]>([]);
  const [videoRejectId, setVideoRejectId] = useState<string | null>(null);
  const [videoRejectReason, setVideoRejectReason] = useState('');

  // Counts for subcategory badges
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [disputeCounts, setDisputeCounts] = useState<Record<string, number>>({});

  // Load counts on mount
  useEffect(() => {
    accountApi.getAllListings(undefined, 'PENDING_REVIEW').then(all => {
      const counts: Record<string, number> = {};
      all.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
      setPendingCounts(counts);
    }).catch(() => {});
    accountApi.getAllDeals('DISPUTED').then(all => {
      const counts: Record<string, number> = {};
      all.forEach(d => { counts[d.listing.category] = (counts[d.listing.category] || 0) + 1; });
      setDisputeCounts(counts);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cat = subcat || undefined;
      if (actionTab === 'stats') setStats(await accountApi.getCategoryStats(cat));
      else if (actionTab === 'pending') setListings(await accountApi.getAllListings(cat, 'PENDING_REVIEW'));
      else if (actionTab === 'listings') setListings(await accountApi.getAllListings(cat, 'APPROVED'));
      else if (actionTab === 'deals') setDeals(await accountApi.getAllDeals(undefined, cat));
      else if (actionTab === 'disputes') setDeals(await accountApi.getAllDeals('DISPUTED', cat));
      else if (actionTab === 'cancelled') setCancelledDeals(await accountApi.getCancelledDeals(cat));
      else if (actionTab === 'flagged') {
        const [fa, fl] = await Promise.all([accountApi.getFlaggedAccounts(), accountApi.getFlaggedListings()]);
        setFlaggedAccounts(fa);
        setFlaggedListings(fl);
      }
      else if (actionTab === 'videos') setVideos(await accountApi.getSellerVideos());
    } catch {} finally { setLoading(false); }
  }, [actionTab, subcat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  // Chat loading
  useEffect(() => {
    if (!selDealId) return;
    accountApi.getDealMessages(selDealId).then(setChatMsgs).catch(() => {});
    const iv = setInterval(() => {
      accountApi.getDealMessages(selDealId).then(setChatMsgs).catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, [selDealId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs.length]);

  const sendChat = async () => {
    if (!chatInput.trim() || !selDealId || chatBusy) return;
    setChatBusy(true);
    try {
      const msg = chatVisibility === 'all'
        ? await accountApi.sendAdminDealMessage(selDealId, chatInput.trim())
        : await accountApi.sendPrivateMessage(selDealId, chatInput.trim(), chatVisibility);
      setChatMsgs(prev => [...prev, msg]);
      setChatInput('');
    } catch {} finally { setChatBusy(false); }
  };

  const addFlag = async () => {
    if (!newFlagUid.trim() || !newFlagReason.trim()) return;
    try {
      const f = await accountApi.addFlaggedAccount(newFlagUid.trim(), newFlagReason.trim());
      setFlaggedAccounts(prev => [f, ...prev]);
      setNewFlagUid(''); setNewFlagReason('');
      setToast('✅ UID добавлен в базу');
    } catch { setToast('❌ Ошибка (возможно, уже есть)'); }
  };

  const removeFlag = async (id: string) => {
    if (!confirm('Удалить UID из базы?')) return;
    try { await accountApi.removeFlaggedAccount(id); setFlaggedAccounts(prev => prev.filter(f => f.id !== id)); setToast('🗑️ Удалено'); } catch { setToast('❌ Ошибка'); }
  };

  const openPayouts = async (dealId: string) => {
    setPayoutDealId(dealId);
    try { setPayouts(await accountApi.getDealPayouts(dealId)); } catch { setPayouts([]); }
  };

  const approve = async (id: string) => {
    try { await accountApi.approveListing(id); setToast('✅ Одобрено'); load(); } catch { setToast('❌ Ошибка'); }
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try { await accountApi.rejectListing(rejectId, rejectReason.trim()); setToast('❌ Отклонено'); setRejectId(null); setRejectReason(''); load(); } catch { setToast('❌ Ошибка'); }
  };

  const resolve = async () => {
    if (!resolveId) return;
    try { await accountApi.resolveDispute(resolveId, decision, decision === 'partial' ? pct : undefined, note.trim() || undefined); setToast('⚖️ Спор решён'); setResolveId(null); setNote(''); load(); } catch { setToast('❌ Ошибка'); }
  };

  const doForceCancel = async (id: string) => {
    if (!confirm('Принудительно отменить сделку?')) return;
    try { await accountApi.forceCancel(id); setToast('🛑 Отменена'); load(); } catch { setToast('❌ Ошибка'); }
  };

  const baseTabs: { id: ActionTab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Статистика', icon: '📊' },
    { id: 'pending', label: 'Модерация', icon: '⏳' },
    { id: 'videos', label: 'Видео', icon: '📹' },
    { id: 'listings', label: 'Объявления', icon: '📋' },
    { id: 'deals', label: 'Сделки', icon: '🤝' },
    { id: 'disputes', label: 'Споры', icon: '⚠️' },
    { id: 'cancelled', label: 'Отменённые', icon: '🚫' },
  ];
  const actionTabs = (!subcat || subcat === 'ACCOUNT')
    ? [...baseTabs, { id: 'flagged' as ActionTab, label: 'База скамеров', icon: '🚩' }]
    : baseTabs;

  const nick = (u: { displayName: string | null; username: string }) => u.displayName || u.username;
  const subcatLabel = SUBCATEGORIES.find(s => s.id === subcat)?.label || 'Все';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🛒 Аккаунты</h1>
        {toast && <div className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white animate-pulse">{toast}</div>}
      </div>

      {/* ═══ LEVEL 1: Subcategory selector ═══ */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 font-medium">Подраздел</p>
        <div className="flex gap-2 flex-wrap">
          {SUBCATEGORIES.map(sc => {
            const showAll = !sc.id;
            const pending = showAll ? Object.values(pendingCounts).reduce((s, n) => s + n, 0) : (pendingCounts[sc.id] || 0);
            const disputed = showAll ? Object.values(disputeCounts).reduce((s, n) => s + n, 0) : (disputeCounts[sc.id] || 0);
            const badge = pending + disputed;
            return (
              <button key={sc.id} onClick={() => { setSubcat(sc.id); setActionTab('pending'); }}
                className={`relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                  subcat === sc.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}>
                <span>{sc.icon}</span>
                <span>{sc.label}</span>
                {badge > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ LEVEL 2: Action tabs within subcategory ═══ */}
      <div className="flex gap-2 flex-wrap">
        {actionTabs.map(t => (
          <button key={t.id} onClick={() => setActionTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${actionTab === t.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs">{subcatLabel}</span>
        <span className="text-zinc-700">→</span>
        <span className="text-zinc-300 text-xs font-medium">{actionTabs.find(t => t.id === actionTab)?.label}</span>
      </div>

      {loading && <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}

      {/* ═══ STATISTICS ═══ */}
      {actionTab === 'stats' && !loading && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Доход (комиссия)', value: `$${stats.revenue.toFixed(2)}`, icon: '💰', color: 'text-emerald-400' },
              { label: 'Оборот', value: `$${stats.totalVolume.toFixed(2)}`, icon: '📈', color: 'text-blue-400' },
              { label: 'Всего сделок', value: String(stats.totalDeals), icon: '📦', color: 'text-white' },
              { label: 'Успешных', value: String(stats.completedDeals), icon: '✅', color: 'text-green-400' },
              { label: 'Отменённых', value: String(stats.cancelledDeals), icon: '❌', color: 'text-red-400' },
              { label: 'Споры', value: String(stats.disputedDeals), icon: '⚠️', color: 'text-yellow-400' },
              { label: 'Решено', value: String(stats.resolvedDeals), icon: '⚖️', color: 'text-purple-400' },
              { label: 'Активные', value: String(stats.activeDeals), icon: '🔄', color: 'text-cyan-400' },
              { label: 'Средний чек', value: `$${stats.avgCheck.toFixed(2)}`, icon: '🧾', color: 'text-orange-400' },
              { label: 'Конверсия', value: `${stats.conversionRate}%`, icon: '📊', color: 'text-pink-400' },
              { label: 'Доход от размещений', value: `$${stats.listingFeeIncome.toFixed(2)}`, icon: '💎', color: 'text-amber-400' },
              { label: 'Платных размещений', value: String(stats.listingFeeCount), icon: '🏷️', color: 'text-amber-300' },
            ].map(s => (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ LISTINGS (pending / approved) ═══ */}
      {(actionTab === 'pending' || actionTab === 'listings') && !loading && (
        <div className="space-y-2">
          {listings.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Нет объявлений</p>}
          {listings.map(l => (
            <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                {l.images[0] && <img src={l.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-medium text-sm truncate">{l.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SC[l.status] || 'bg-zinc-700 text-zinc-300'}`}>{SL[l.status] || l.status}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">{accountApi.CATEGORY_LABELS[l.category] || l.category}</span>
                    {l.listingType === 'paid'
                      ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">💎 Платное</span>
                      : <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-500">Бесплатное</span>
                    }
                  </div>
                  <p className="text-zinc-500 text-xs">Продавец: {nick(l.seller)} · ${Number(l.price).toFixed(2)} · Доставка: {l.deliveryTimeMin}-{l.deliveryTimeMax} мин</p>
                  {l.description && <p className="text-zinc-400 text-xs mt-1 line-clamp-3">📝 {l.description}</p>}
                  {l.rejectReason && <p className="text-red-400 text-xs mt-1">Причина: {l.rejectReason}</p>}
                  <p className="text-zinc-700 text-[10px] mt-1">{new Date(l.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {l.status === 'PENDING_REVIEW' && (
                    <>
                      <button onClick={() => approve(l.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg">✅</button>
                      <button onClick={() => { setRejectId(l.id); setRejectReason(''); }} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg">❌</button>
                    </>
                  )}
                  {l.status === 'APPROVED' && (
                    <button onClick={async () => {
                      const reason = prompt('Причина удаления объявления:');
                      if (!reason?.trim()) return;
                      try { await accountApi.deleteListing(l.id, reason.trim()); setToast('🗑️ Объявление удалено'); load(); } catch (e: any) { setToast(`❌ ${e?.message || 'Ошибка'}`); }
                    }} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium rounded-lg">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ VIDEO MODERATION ═══ */}
      {actionTab === 'videos' && !loading && (
        <div className="space-y-3">
          {videos.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Нет видео на проверке</p>}
          {videos.map(v => {
            const isPending = v.sellerVideoStatus === 'PENDING_REVIEW';
            const isApproved = v.sellerVideoStatus === 'APPROVED';
            const isRejected = v.sellerVideoStatus === 'REJECTED';
            const statusBadge = isPending ? 'bg-yellow-500/20 text-yellow-400' : isApproved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
            const statusLabel = isPending ? '⏳ На проверке' : isApproved ? '✅ Одобрено' : '❌ Отклонено';
            return (
              <div key={v.dealId} className={`bg-zinc-900 border rounded-xl p-4 ${isPending ? 'border-yellow-500/40' : 'border-zinc-800'}`}>
                <div className="flex items-start gap-3">
                  {v.listing.images[0] && <img src={v.listing.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">{v.listing.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusBadge}`}>{statusLabel}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">${v.price.toFixed(2)}</span>
                    </div>
                    <p className="text-zinc-500 text-xs">
                      Продавец: {v.seller.nick} → Покупатель: {v.buyer.nick}
                      {v.listing.gameUid && <> · UID: {v.listing.gameUid}</>}
                    </p>
                    <p className="text-zinc-700 text-[10px] mt-1">Сделка: {v.dealId.slice(0, 12)}... · {new Date(v.updatedAt).toLocaleString('ru-RU')}</p>
                    {isRejected && v.sellerVideoRejectReason && (
                      <p className="text-red-400 text-xs mt-1">Причина отклонения: {v.sellerVideoRejectReason}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {v.sellerVideoUrl && (
                      <a href={v.sellerVideoUrl} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg text-center">
                        ▶ Смотреть
                      </a>
                    )}
                    {isPending && (
                      <>
                        <button onClick={async () => {
                          if (!confirm('Одобрить видео подтверждение?')) return;
                          try { await accountApi.approveVideo(v.dealId); setToast('✅ Видео одобрено'); load(); } catch { setToast('❌ Ошибка'); }
                        }} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg">
                          ✅ Одобрить
                        </button>
                        <button onClick={() => { setVideoRejectId(v.dealId); setVideoRejectReason(''); }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg">
                          ❌ Отклонить
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video reject modal */}
      {videoRejectId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setVideoRejectId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-3">❌ Отклонить видео</h3>
            <p className="text-zinc-400 text-sm mb-3">Укажите причину, чтобы продавец знал что исправить:</p>
            <textarea value={videoRejectReason} onChange={e => setVideoRejectReason(e.target.value)}
              placeholder="Например: Не видно лицо, документ нечитаем, текст произнесён не полностью..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm resize-none h-24 focus:outline-none focus:border-purple-500" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setVideoRejectId(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700">Отмена</button>
              <button disabled={!videoRejectReason.trim()} onClick={async () => {
                try {
                  await accountApi.rejectVideo(videoRejectId, videoRejectReason.trim());
                  setToast('❌ Видео отклонено');
                  setVideoRejectId(null);
                  setVideoRejectReason('');
                  load();
                } catch { setToast('❌ Ошибка'); }
              }} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">Отклонить</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DEALS / DISPUTES ═══ */}
      {(actionTab === 'deals' || actionTab === 'disputes') && !loading && (
        <div className="space-y-2">
          {deals.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Нет {actionTab === 'disputes' ? 'споров' : 'сделок'}</p>}
          {deals.map(d => (
            <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                {d.listing.images[0] && <img src={d.listing.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-medium text-sm truncate">{d.listing.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SC[d.status] || 'bg-zinc-700 text-zinc-300'}`}>{SL[d.status] || d.status}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">{accountApi.CATEGORY_LABELS[d.listing.category] || d.listing.category}</span>
                  </div>
                  <p className="text-zinc-500 text-xs">
                    Продавец: {nick(d.seller)} → Покупатель: {nick(d.buyer)} · ${Number(d.price).toFixed(2)} · ID: {d.buyerGameId}
                  </p>
                  {d.sellerConfirmedAt && <p className="text-green-400 text-[10px] mt-0.5">✅ Продавец подтвердил передачу</p>}
                  {d.buyerConfirmedAt && <p className="text-green-400 text-[10px]">✅ Покупатель подтвердил получение</p>}
                  {d.disputeReason && <p className="text-red-400 text-xs mt-1">⚠️ {d.disputeReason}</p>}
                  {d.resolution && <p className="text-purple-400 text-xs mt-1">⚖️ {d.resolution}</p>}
                  <p className="text-zinc-700 text-[10px] mt-1">{new Date(d.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-col">
                  <button onClick={() => setSelDealId(d.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">💬 Чат</button>
                  <button onClick={() => openPayouts(d.id)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg">💰 Выплаты</button>
                  {d.status === 'DISPUTED' && (
                    <button onClick={() => { setResolveId(d.id); setDecision('refund_buyer'); setNote(''); }} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg">⚖️</button>
                  )}
                  {['COMPLETED', 'DISPUTED'].includes(d.status) && (
                    <button onClick={async () => {
                      if (!confirm('Закрыть чат? Пользователи больше не смогут писать.')) return;
                      try { await accountApi.closeChat(d.id); setToast('🔒 Чат закрыт'); load(); } catch (e: any) { setToast(`❌ ${e?.message || 'Ошибка'}`); }
                    }} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg">🔒</button>
                  )}
                  {d.status === 'RESOLVED' && (
                    <button onClick={async () => {
                      if (!confirm('Открыть чат? Пользователи снова смогут писать.')) return;
                      try { await accountApi.reopenChat(d.id); setToast('🔓 Чат открыт'); load(); } catch (e: any) { setToast(`❌ ${e?.message || 'Ошибка'}`); }
                    }} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg">🔓</button>
                  )}
                  {d.status === 'DISPUTED' && (
                    <button onClick={async () => {
                      if (!confirm('Отклонить жалобу? С подавшего будет списан $1. Сделка продолжится.')) return;
                      try { await accountApi.dismissDispute(d.id); setToast('⚖️ Жалоба отклонена, штраф $1'); load(); } catch (e: any) { setToast(`❌ ${e?.message || 'Ошибка'}`); }
                    }} className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs rounded-lg">↩️ Отклонить</button>
                  )}
                  {!['COMPLETED', 'RESOLVED', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_BUYER'].includes(d.status) && (
                    <button onClick={() => doForceCancel(d.id)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg">🛑</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CANCELLED DEALS ═══ */}
      {actionTab === 'cancelled' && !loading && (
        <div className="space-y-2">
          {cancelledDeals.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Нет отменённых сделок</p>}
          {cancelledDeals.map(d => {
            const cancellerNick = d.cancelledBy === d.sellerId ? nick(d.seller) : d.cancelledBy === d.buyerId ? nick(d.buyer) : null;
            const cancellerRole = d.status === 'CANCELLED_BY_SELLER' ? 'продавец' : 'покупатель';
            return (
              <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {d.listing.images[0] && <img src={d.listing.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">{d.listing.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SC[d.status] || 'bg-zinc-700 text-zinc-300'}`}>{SL[d.status] || d.status}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">{accountApi.CATEGORY_LABELS[d.listing.category] || d.listing.category}</span>
                    </div>
                    <p className="text-zinc-500 text-xs">
                      Продавец: {nick(d.seller)} → Покупатель: {nick(d.buyer)} · ${Number(d.price).toFixed(2)}
                    </p>
                    {cancellerNick && (
                      <p className="text-red-400 text-xs mt-1">❌ Отменил: {cancellerNick} ({cancellerRole})</p>
                    )}
                    {d.cancelReason && (
                      <div className="mt-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <p className="text-red-300 text-xs font-medium">Причина отмены:</p>
                        <p className="text-zinc-300 text-xs mt-0.5">{d.cancelReason}</p>
                      </div>
                    )}
                    {!d.cancelReason && (
                      <p className="text-zinc-600 text-xs mt-1 italic">Причина не указана</p>
                    )}
                    <p className="text-zinc-700 text-[10px] mt-1">{d.completedAt ? new Date(d.completedAt).toLocaleString('ru-RU') : new Date(d.createdAt).toLocaleString('ru-RU')}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-col">
                    <button onClick={() => setSelDealId(d.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">💬 Чат</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ FLAGGED ACCOUNTS ═══ */}
      {actionTab === 'flagged' && !loading && (
        <div className="space-y-4">
          {/* Add new */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-bold text-sm mb-3">🚩 Добавить UID в базу скамеров</h3>
            <div className="flex gap-2 flex-wrap">
              <input value={newFlagUid} onChange={e => setNewFlagUid(e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="Game UID" className="flex-1 min-w-[120px] px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
              <input value={newFlagReason} onChange={e => setNewFlagReason(e.target.value)} placeholder="Причина" className="flex-[2] min-w-[200px] px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
              <button onClick={addFlag} disabled={!newFlagUid.trim() || !newFlagReason.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg disabled:opacity-50">+ Добавить</button>
            </div>
          </div>

          {/* List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-bold text-sm mb-3">📋 База скамеров ({flaggedAccounts.length})</h3>
            {flaggedAccounts.length === 0 && <p className="text-zinc-500 text-sm">База пуста</p>}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {flaggedAccounts.map(f => (
                <div key={f.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-3 py-2">
                  <span className="text-white font-mono text-sm flex-shrink-0">{f.gameUid}</span>
                  <span className="text-zinc-400 text-xs flex-1 truncate">{f.reason}</span>
                  <span className="text-zinc-600 text-[10px] flex-shrink-0">{new Date(f.createdAt).toLocaleDateString('ru-RU')}</span>
                  <button onClick={() => removeFlag(f.id)} className="text-red-400 hover:text-red-300 text-xs flex-shrink-0">🗑️</button>
                </div>
              ))}
            </div>
          </div>

          {/* Flagged listings */}
          {flaggedListings.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-red-400 font-bold text-sm mb-3">⚠️ Объявления от скамеров ({flaggedListings.length})</h3>
              <div className="space-y-2">
                {flaggedListings.map(l => (
                  <div key={l.id} className="flex items-center gap-3 bg-zinc-900 rounded-lg px-3 py-2">
                    {l.images[0] && <img src={l.images[0]} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{l.title}</p>
                      <p className="text-zinc-500 text-xs">{nick(l.seller)} · ${Number(l.price).toFixed(2)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SC[l.status] || 'bg-zinc-700 text-zinc-300'}`}>{SL[l.status] || l.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Payout Modal ═══ */}
      {payoutDealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPayoutDealId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-3">💰 График выплат продавцу</h3>
            {payouts.length === 0 ? (
              <p className="text-zinc-500 text-sm">Нет графика — мгновенная выплата (Tier 3)</p>
            ) : (
              <div className="space-y-2 mb-4">
                {payouts.map((p, i) => {
                  const statusColor = p.status === 'PAID' ? 'text-green-400' : p.status === 'FROZEN' ? 'text-blue-400' : p.status === 'CANCELLED' ? 'text-red-400' : 'text-yellow-400';
                  const statusLabel = p.status === 'PAID' ? '✅ Выплачено' : p.status === 'FROZEN' ? '❄️ Заморожено' : p.status === 'CANCELLED' ? '❌ Отменено' : '⏳ Ожидает';
                  const phaseLabel = i === 0 ? '1-я часть (сразу)' : i === 1 ? '2-я часть' : '3-я часть (финал)';
                  return (
                    <div key={p.id} className={`rounded-lg px-3 py-2 flex items-center justify-between ${p.status === 'FROZEN' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-zinc-800'}`}>
                      <div>
                        <span className="text-white text-sm font-medium">${Number(p.amount).toFixed(2)}</span>
                        <span className="text-zinc-500 text-xs ml-2">({p.percentage}%) — {phaseLabel}</span>
                        <p className="text-zinc-500 text-[10px]">
                          Дата: {new Date(p.scheduledAt).toLocaleDateString('ru-RU')}
                          {p.paidAt && <span className="text-green-500"> · Оплачено: {new Date(p.paidAt).toLocaleDateString('ru-RU')}</span>}
                        </p>
                      </div>
                      <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            {payouts.some(p => p.status === 'PENDING') && (
              <div className="mb-2">
                <button onClick={async () => {
                  if (!confirm('Заморозить все ожидающие выплаты? Продавец не получит деньги пока не разморозите.')) return;
                  try { await accountApi.freezePayouts(payoutDealId); setToast('❄️ Выплаты заморожены'); openPayouts(payoutDealId); } catch { setToast('❌ Ошибка'); }
                }} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl">
                  ❄️ Заморозить ожидающие выплаты
                </button>
                <p className="text-zinc-600 text-[10px] mt-1 text-center">Продавец не получит деньги до разморозки</p>
              </div>
            )}

            {payouts.some(p => p.status === 'FROZEN') && (
              <div className="flex gap-2 mb-2">
                <button onClick={async () => {
                  if (!confirm('Разморозить выплаты? Продавец получит деньги по графику.')) return;
                  try { await accountApi.unfreezePayouts(payoutDealId); setToast('🔓 Выплаты разморожены'); openPayouts(payoutDealId); } catch { setToast('❌ Ошибка'); }
                }} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl">
                  🔓 Разморозить
                </button>
                <button onClick={async () => {
                  if (!confirm('Отменить все невыплаченные суммы и вернуть их покупателю? Это необратимо!')) return;
                  try { await accountApi.cancelPayoutsRefund(payoutDealId); setToast('💸 Возврат покупателю выполнен'); openPayouts(payoutDealId); } catch { setToast('❌ Ошибка'); }
                }} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl">
                  💸 Отменить + возврат
                </button>
              </div>
            )}

            {payouts.length > 0 && !payouts.some(p => p.status === 'PENDING' || p.status === 'FROZEN') && (
              <p className="text-zinc-600 text-xs text-center mb-2">Все выплаты обработаны — действий нет</p>
            )}

            <button onClick={() => setPayoutDealId(null)} className="w-full mt-2 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-xl hover:bg-zinc-700">Закрыть</button>
          </div>
        </div>
      )}

      {/* ═══ Chat Modal ═══ */}
      {selDealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelDealId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-white font-bold text-sm">💬 Чат сделки</h3>
              <button onClick={() => setSelDealId(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[50vh]">
              {chatMsgs.map(m => {
                const visBadge = m.visibility === 'seller' ? '👁️ Продавец' : m.visibility === 'buyer' ? '👁️ Покупатель' : null;
                const visBg = m.visibility === 'seller' ? 'bg-orange-500/10 border-orange-500/20' : m.visibility === 'buyer' ? 'bg-cyan-500/10 border-cyan-500/20' : '';
                return (
                <div key={m.id} className={`text-xs rounded-lg px-3 py-2 ${m.isAdmin ? `bg-purple-500/10 text-purple-300 border border-purple-500/20 ${visBg}` : m.isSystem ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-800/50 text-white'}`}>
                  <span className="text-zinc-600 text-[10px]">{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.isAdmin && <span className="text-purple-400 text-[10px] ml-1">Админ</span>}
                  {visBadge && <span className="text-[10px] ml-1 text-amber-400">{visBadge}</span>}
                  <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
                </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <div className="flex gap-1.5">
                {(['all', 'seller', 'buyer'] as const).map(v => (
                  <button key={v} onClick={() => setChatVisibility(v)}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${chatVisibility === v
                      ? v === 'all' ? 'bg-purple-600 text-white' : v === 'seller' ? 'bg-orange-600 text-white' : 'bg-cyan-600 text-white'
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}>
                    {v === 'all' ? '👥 Обоим' : v === 'seller' ? '📱 Продавцу' : '👤 Покупателю'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder={chatVisibility === 'all' ? 'Сообщение обоим...' : chatVisibility === 'seller' ? 'Приватно продавцу...' : 'Приватно покупателю...'}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
                <button onClick={sendChat} disabled={chatBusy || !chatInput.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg disabled:opacity-50">→</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Reject Modal ═══ */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRejectId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-3">❌ Отклонить объявление</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Причина отклонения..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-sm resize-none h-24" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm">Отмена</button>
              <button onClick={reject} disabled={!rejectReason.trim()} className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50">Отклонить</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Resolve Dispute Modal ═══ */}
      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setResolveId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-3">⚖️ Решить спор</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Решение</label>
                <select value={decision} onChange={e => setDecision(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-sm">
                  <option value="refund_buyer">Возврат покупателю</option>
                  <option value="complete_seller">В пользу продавца</option>
                  <option value="partial">Частичное решение</option>
                </select>
              </div>
              {decision === 'partial' && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">% продавцу: {pct}%</label>
                  <input type="range" min={0} max={100} value={pct} onChange={e => setPct(Number(e.target.value))} className="w-full" />
                </div>
              )}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Примечание</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Комментарий к решению..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-sm resize-none h-20" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setResolveId(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm">Отмена</button>
                <button onClick={resolve} className="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm">Применить</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
