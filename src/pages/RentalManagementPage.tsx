import { useState, useEffect, useCallback, useRef } from 'react';
import * as rentalApi from '../lib/rentalApi';

type Tab = 'pending' | 'approved' | 'rejected' | 'all' | 'rentals' | 'disputes' | 'stats' | 'reviews';

const SC: Record<string, string> = {
  PENDING_REVIEW: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  PAUSED: 'bg-zinc-500/20 text-zinc-400',
  RENTED: 'bg-blue-500/20 text-blue-400',
  PENDING_TRANSFER: 'bg-yellow-500/20 text-yellow-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  DISPUTED: 'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  RESOLVED: 'bg-purple-500/20 text-purple-400',
  CANCELLED_BY_RENTER: 'bg-zinc-500/20 text-zinc-400',
  CANCELLED_BY_OWNER: 'bg-zinc-500/20 text-zinc-400',
};

const SL: Record<string, string> = {
  PENDING_REVIEW: 'На проверке',
  APPROVED: 'Активно',
  REJECTED: 'Отклонено',
  PAUSED: 'Приостановлено',
  RENTED: 'Арендовано',
  PENDING_TRANSFER: 'Ожидание передачи',
  ACTIVE: 'Активна',
  DISPUTED: 'Спор',
  COMPLETED: 'Завершена',
  RESOLVED: 'Решено',
  CANCELLED_BY_RENTER: 'Отменена арендатором',
  CANCELLED_BY_OWNER: 'Отменена владельцем',
};

export default function RentalManagementPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [listings, setListings] = useState<rentalApi.RentalListingAdmin[]>([]);
  const [rentals, setRentals] = useState<rentalApi.RentalAdmin[]>([]);
  const [disputes, setDisputes] = useState<rentalApi.RentalAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [decision, setDecision] = useState('resume');
  const [note, setNote] = useState('');
  const [pct, setPct] = useState(50);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Chat state (disputes + any rental)
  const [selDispute, setSelDispute] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<rentalApi.RentalMessageAdmin[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selRental, setSelRental] = useState<string | null>(null);

  // Stats + Reviews
  const [stats, setStats] = useState<rentalApi.RentalStats | null>(null);
  const [adminReviews, setAdminReviews] = useState<rentalApi.ReviewAdmin[]>([]);

  const statusForTab = (t: Tab): string | undefined => {
    if (t === 'pending') return 'PENDING_REVIEW';
    if (t === 'approved') return 'APPROVED';
    if (t === 'rejected') return 'REJECTED';
    return undefined;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'rentals') setRentals(await rentalApi.getAllRentals());
      else if (tab === 'disputes') setDisputes(await rentalApi.getAllRentals('DISPUTED'));
      else if (tab === 'stats') setStats(await rentalApi.getRentalStats());
      else if (tab === 'reviews') setAdminReviews(await rentalApi.getReviews());
      else setListings(await rentalApi.getAllListings(statusForTab(tab)));
    } catch {} finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Poll chat messages (dispute or any rental)
  const activeChatId = selDispute || selRental;
  useEffect(() => {
    if (!activeChatId) return;
    const fetchMsgs = () => rentalApi.getRentalMessages(activeChatId).then(setChatMsgs).catch(() => {});
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 4000);
    return () => clearInterval(iv);
  }, [activeChatId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs.length]);

  const sendChatMsg = async () => {
    if (!activeChatId || !chatInput.trim() || chatBusy) return;
    setChatBusy(true);
    try {
      await rentalApi.sendAdminRentalMessage(activeChatId, chatInput.trim());
      setChatInput('');
      const msgs = await rentalApi.getRentalMessages(activeChatId);
      setChatMsgs(msgs);
    } catch {}
    setChatBusy(false);
  };

  const handleForceCancel = async (id: string) => {
    if (!confirm('Принудительно отменить аренду? Средства вернутся арендатору.')) return;
    try { await rentalApi.forceCancel(id); flash('Аренда отменена'); load(); } catch (e: any) { flash(e.message); }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Удалить отзыв?')) return;
    try { await rentalApi.deleteReview(id); flash('Отзыв удалён'); load(); } catch (e: any) { flash(e.message); }
  };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const approve = async (id: string) => {
    try { await rentalApi.approveListing(id); flash('Одобрено'); load(); } catch (e: any) { flash(e.message); }
  };
  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try { await rentalApi.rejectListing(rejectId, rejectReason.trim()); flash('Отклонено'); setRejectId(null); setRejectReason(''); load(); } catch (e: any) { flash(e.message); }
  };
  const resolve = async () => {
    if (!resolveId) return;
    try { await rentalApi.resolveDispute(resolveId, decision, decision === 'partial' ? pct : undefined, note.trim() || undefined); flash('Решено'); setResolveId(null); setNote(''); load(); } catch (e: any) { flash(e.message); }
  };
  const delListing = async (id: string) => {
    if (!confirm('Удалить объявление? Это действие нельзя отменить.')) return;
    try { await rentalApi.deleteListing(id); flash('Удалено'); load(); } catch (e: any) { flash(e.message); }
  };

  const Badge = ({ s }: { s: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${SC[s] || 'bg-zinc-700 text-zinc-300'}`}>{SL[s] || s}</span>;
  const nick = (u: { displayName: string | null; username: string }) => u.displayName || u.username;

  const tabDefs: { key: Tab; label: string }[] = [
    { key: 'stats', label: '📊 Статистика' },
    { key: 'pending', label: 'На проверке' },
    { key: 'approved', label: 'Активные' },
    { key: 'rejected', label: 'Отклонённые' },
    { key: 'all', label: 'Все' },
    { key: 'rentals', label: 'Аренды' },
    { key: 'disputes', label: 'Споры' },
    { key: 'reviews', label: '⭐ Отзывы' },
  ];

  const isListingsTab = ['pending', 'approved', 'rejected', 'all'].includes(tab);

  // Render listing card (shared between pending and listings tabs)
  const renderListingCard = (l: rentalApi.RentalListingAdmin, showActions: boolean) => {
    const isExpanded = expandedId === l.id;
    const rpArr = (l as any).rpSeasons ? String((l as any).rpSeasons).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const costumes: string[] = (l as any).rareCostumes || [];
    const vehicles: string[] = (l as any).vehicleSkins || [];
    const weapons: string[] = (l as any).weaponSkins || [];

    return (
      <div key={l.id} className={`bg-zinc-900 border rounded-xl overflow-hidden ${l.status === 'PENDING_REVIEW' ? 'border-yellow-500/40' : l.status === 'REJECTED' ? 'border-red-500/30' : 'border-zinc-700'}`}>
        {/* Header row */}
        <div className="p-4 flex gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : l.id)}>
          {l.images[0] && <img src={l.images[0]} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-white font-medium text-sm truncate flex-1">{l.title}</p>
              <Badge s={l.status} />
              {l.listingType === 'paid'
                ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">💎 Платное</span>
                : <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-500">Бесплатное</span>
              }
            </div>
            <p className="text-zinc-400 text-xs">PUBG ID: <span className="text-white font-mono">{l.pubgId}</span> · Коллекция: {l.collectionLevel} · ${Number(l.pricePerHour).toFixed(2)}/ч · Мин: {l.minHours}ч</p>
            <p className="text-zinc-500 text-xs">Владелец: {nick(l.owner)} · {new Date(l.createdAt).toLocaleDateString('ru')}</p>
          </div>
          <svg className={`w-4 h-4 text-zinc-500 mt-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
            {/* Photos */}
            {l.images.length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1.5 font-medium">Фото ({l.images.length})</p>
                <div className="flex gap-2 overflow-x-auto">
                  {l.images.map((img, i) => (
                    <img key={i} src={img} className="w-24 h-18 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {l.description && (
              <div>
                <p className="text-zinc-500 text-xs font-medium">Описание</p>
                <p className="text-white text-sm mt-0.5">{l.description}</p>
              </div>
            )}

            {/* Rental Terms */}
            {l.rentalTerms && (
              <div>
                <p className="text-zinc-500 text-xs font-medium">Условия аренды</p>
                <p className="text-zinc-300 text-xs mt-0.5 whitespace-pre-line">{l.rentalTerms}</p>
              </div>
            )}

            {/* RP Seasons */}
            {rpArr.length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs font-medium">RP сезоны</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {rpArr.map((rp: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-white text-xs">{rp}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Skins summary */}
            {(costumes.length > 0 || vehicles.length > 0 || weapons.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {costumes.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-xs font-medium mb-1">Костюмы ({costumes.length})</p>
                    {costumes.map((c, i) => <p key={i} className="text-white text-xs">{c}</p>)}
                  </div>
                )}
                {vehicles.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-xs font-medium mb-1">Транспорт ({vehicles.length})</p>
                    {vehicles.map((v, i) => <p key={i} className="text-white text-xs">{v}</p>)}
                  </div>
                )}
                {weapons.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-xs font-medium mb-1">Оружие ({weapons.length})</p>
                    {weapons.map((w, i) => <p key={i} className="text-white text-xs">{w}</p>)}
                  </div>
                )}
              </div>
            )}

            {/* Reject reason */}
            {l.rejectReason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs font-medium">Причина отклонения:</p>
                <p className="text-red-300 text-xs mt-0.5">{l.rejectReason}</p>
              </div>
            )}

            {/* Actions */}
            {showActions && l.status === 'PENDING_REVIEW' && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => approve(l.id)} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg">Одобрить</button>
                <button onClick={() => setRejectId(l.id)} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg">Отклонить</button>
              </div>
            )}
            {showActions && l.status !== 'RENTED' && l.status !== 'PENDING_REVIEW' && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => delListing(l.id)} className="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium rounded-lg">🗑️ Удалить</button>
              </div>
            )}

            <p className="text-zinc-600 text-[10px] font-mono">ID: {l.id}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Аренда аккаунтов</h1>
      {toast && <div className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">{toast}</div>}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabDefs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setExpandedId(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {t.label}
            {t.key === 'pending' && listings.length > 0 && tab !== 'pending' ? '' : ''}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-8 text-zinc-500">Загрузка...</div> : (
        <div className="space-y-2">
          {/* LISTINGS tabs */}
          {isListingsTab && (
            listings.length === 0
              ? <p className="text-zinc-500 text-sm py-4">Нет объявлений</p>
              : listings.map(l => renderListingCard(l, true))
          )}

          {/* STATS */}
          {tab === 'stats' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Всего аренд', value: stats.total, color: 'text-white' },
                  { label: 'Активные', value: stats.active, color: 'text-green-400' },
                  { label: 'Споры', value: stats.disputed, color: 'text-red-400' },
                  { label: 'Завершённые', value: stats.completed, color: 'text-blue-400' },
                  { label: 'Отменённые', value: stats.cancelled, color: 'text-zinc-400' },
                  { label: 'Доход площадки', value: `$${stats.revenue.toFixed(2)}`, color: 'text-emerald-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL RENTALS — with chat + force cancel */}
          {tab === 'rentals' && (rentals.length === 0
            ? <p className="text-zinc-500 text-sm py-4">Нет аренд</p>
            : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                {rentals.map(r => (
                  <div key={r.id} className={`bg-zinc-900 border rounded-xl p-4 cursor-pointer transition-colors ${selRental === r.id ? 'border-emerald-500/40' : 'border-zinc-700 hover:border-zinc-600'}`}
                    onClick={() => { setSelRental(selRental === r.id ? null : r.id); setSelDispute(null); setChatInput(''); }}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-white text-sm font-medium flex-1 truncate">{r.listing.title}</p>
                      <Badge s={r.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <p className="text-zinc-500">Владелец: <span className="text-white">{nick(r.owner)}</span></p>
                      <p className="text-zinc-500">Арендатор: <span className="text-white">{nick(r.renter)}</span></p>
                      <p className="text-zinc-500">Сумма: <span className="text-emerald-400 font-medium">${Number(r.totalPrice).toFixed(2)}</span></p>
                      <p className="text-zinc-500">Срок: <span className="text-white">{r.totalHours}ч</span></p>
                    </div>
                    {!['COMPLETED', 'RESOLVED', 'CANCELLED_BY_RENTER', 'CANCELLED_BY_OWNER'].includes(r.status) && (
                      <button onClick={e => { e.stopPropagation(); handleForceCancel(r.id); }}
                        className="mt-2 px-3 py-1 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg border border-red-500/30 hover:bg-red-600/30">
                        🛑 Принудительная отмена
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat panel for selected rental */}
              {selRental && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col" style={{ maxHeight: '75vh' }}>
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-white font-semibold text-sm">💬 Чат аренды</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-[150px]">
                    {chatMsgs.map(m => (
                      <div key={m.id} className={`text-xs py-1 ${m.isAdmin ? 'text-amber-400' : m.isSystem ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>
                        {m.isAdmin && <b>[Админ] </b>}
                        {m.isSystem && !m.isAdmin && <span className="text-zinc-600">[Система] </span>}
                        <span className="whitespace-pre-line">{m.content}</span>
                        <span className="text-zinc-600 ml-2 text-[10px]">{new Date(m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="px-4 py-2 border-t border-zinc-800 flex gap-2">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendChatMsg()}
                      placeholder="Сообщение в чат..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                    <button onClick={sendChatMsg} disabled={chatBusy}
                      className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 disabled:opacity-50">
                      Отправить
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* REVIEWS MODERATION */}
          {tab === 'reviews' && (adminReviews.length === 0
            ? <p className="text-zinc-500 text-sm py-4">Нет отзывов</p>
            : adminReviews.map(r => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-medium">{r.from.nick}</span>
                <span className="text-zinc-600 text-xs">→</span>
                <span className="text-white text-sm">{r.to.nick}</span>
                <div className="flex gap-0.5 ml-auto">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`text-xs ${i < r.score ? 'text-yellow-400' : 'text-zinc-600'}`}>★</span>
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-zinc-300 text-sm mb-1">{r.comment}</p>}
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  {r.serviceType === 'RENTAL' ? 'Аренда' : r.serviceType}
                </span>
                {r.listingTitle && <span className="text-zinc-500 text-[10px]">{r.listingTitle}</span>}
                <span className="text-zinc-600 text-[10px] ml-auto">{new Date(r.createdAt).toLocaleDateString('ru')}</span>
                <button onClick={() => handleDeleteReview(r.id)} className="text-red-400 text-[10px] hover:text-red-300 ml-2">🗑️ Удалить</button>
              </div>
            </div>
          )))}

          {/* DISPUTES — two-panel: list + chat */}
          {tab === 'disputes' && (disputes.length === 0
            ? <p className="text-zinc-500 text-sm py-4">Нет активных споров</p>
            : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: dispute list */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold text-sm mb-1">⚠️ Споры ({disputes.length})</h3>
                {disputes.map(r => (
                  <button key={r.id} onClick={() => { setSelDispute(r.id); setChatInput(''); }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${selDispute === r.id ? 'bg-red-500/15 border-red-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium flex-1 truncate">{r.listing.title}</span>
                      <Badge s="DISPUTED" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 text-xs mb-1">
                      <p className="text-zinc-500">Владелец: <span className="text-white">{nick(r.owner)}</span></p>
                      <p className="text-zinc-500">Арендатор: <span className="text-white">{nick(r.renter)}</span></p>
                    </div>
                    {r.disputeReason && <p className="text-red-400 text-xs truncate">Причина: {r.disputeReason}</p>}
                  </button>
                ))}
              </div>

              {/* Right: chat + resolve */}
              {selDispute && (() => {
                const dispute = disputes.find(d => d.id === selDispute);
                if (!dispute) return null;
                return (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col" style={{ maxHeight: '75vh' }}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-white font-semibold text-sm">{dispute.listing.title}</p>
                      <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                        <span>Владелец: <span className="text-white">{nick(dispute.owner)}</span></span>
                        <span>Арендатор: <span className="text-white">{nick(dispute.renter)}</span></span>
                        <span>Сумма: <span className="text-emerald-400">${Number(dispute.totalPrice).toFixed(2)}</span></span>
                      </div>
                      {dispute.disputeReason && <p className="text-red-400 text-xs mt-1">Причина: {dispute.disputeReason}</p>}
                      {dispute.remainingMs != null && <p className="text-zinc-500 text-xs mt-0.5">Осталось на таймере: {Math.ceil(dispute.remainingMs / 60000)} мин.</p>}
                    </div>

                    {/* Chat messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-[150px]">
                      {chatMsgs.map(m => (
                        <div key={m.id} className={`text-xs py-1 ${m.isAdmin ? 'text-amber-400' : m.isSystem ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>
                          {m.isAdmin && <b>[Админ] </b>}
                          {m.isSystem && !m.isAdmin && <span className="text-zinc-600">[Система] </span>}
                          <span className="whitespace-pre-line">{m.content}</span>
                          <span className="text-zinc-600 ml-2 text-[10px]">{new Date(m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Message input */}
                    <div className="px-4 py-2 border-t border-zinc-800 flex gap-2">
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChatMsg()}
                        placeholder="Сообщение в чат..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                      <button onClick={sendChatMsg} disabled={chatBusy}
                        className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 disabled:opacity-50">
                        Отправить
                      </button>
                    </div>

                    {/* Resolve controls */}
                    <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
                      <p className="text-white text-xs font-semibold">Решение спора</p>
                      <select value={decision} onChange={e => setDecision(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 text-white text-xs rounded-lg outline-none">
                        <option value="resume">Продолжить аренду</option>
                        <option value="complete_owner">В пользу арендодателя</option>
                        <option value="refund_renter">Возврат арендатору</option>
                        <option value="partial">Частичный возврат</option>
                      </select>
                      {decision === 'partial' && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-xs">Арендодателю:</span>
                          <input type="number" value={pct} onChange={e => setPct(Number(e.target.value))} min={0} max={100} className="w-16 px-2 py-1 bg-zinc-800 text-white text-xs rounded-lg outline-none" />
                          <span className="text-zinc-400 text-xs">%</span>
                        </div>
                      )}
                      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Комментарий (необязательно)" rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none" />
                      <button onClick={() => { setResolveId(dispute.id); }} className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors">
                        Решить спор
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h2 className="text-white font-bold">Отклонить объявление</h2>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Причина отклонения..." className="w-full h-20 px-3 py-2 bg-zinc-800 text-white text-sm rounded-xl outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-sm">Отмена</button>
              <button onClick={reject} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">Отклонить</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h2 className="text-white font-bold">Решить спор</h2>
            <select value={decision} onChange={e => setDecision(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 text-white text-sm rounded-xl outline-none">
              <option value="resume">Продолжить аренду</option>
              <option value="complete_owner">В пользу арендодателя</option>
              <option value="refund_renter">Возврат арендатору</option>
              <option value="partial">Частичный возврат</option>
            </select>
            {decision === 'partial' && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-xs">Арендодателю:</span>
                <input type="number" value={pct} onChange={e => setPct(Number(e.target.value))} min={0} max={100} className="w-20 px-2 py-1 bg-zinc-800 text-white text-sm rounded-lg outline-none" />
                <span className="text-zinc-400 text-xs">%</span>
              </div>
            )}
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Комментарий (необязательно)" className="w-full h-16 px-3 py-2 bg-zinc-800 text-white text-sm rounded-xl outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setResolveId(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-sm">Отмена</button>
              <button onClick={resolve} className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold">Применить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
