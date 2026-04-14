import { useState, useEffect } from 'react';
import * as boostApi from '../lib/boostApi';

type Tab = 'stats' | 'pending' | 'all_listings' | 'deals';

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  PENDING_REVIEW: { text: '⏳ На проверке', cls: 'bg-yellow-500/20 text-yellow-400' },
  APPROVED: { text: '✅ Одобрено', cls: 'bg-emerald-500/20 text-emerald-400' },
  REJECTED: { text: '❌ Отклонено', cls: 'bg-red-500/20 text-red-400' },
  PAUSED: { text: '⏸ Пауза', cls: 'bg-zinc-500/20 text-zinc-400' },
  PENDING: { text: '⏳ Ожидание', cls: 'bg-yellow-500/20 text-yellow-400' },
  ACCEPTED: { text: '✅ Принят', cls: 'bg-blue-500/20 text-blue-400' },
  IN_PROGRESS: { text: '🔄 В работе', cls: 'bg-blue-500/20 text-blue-400' },
  COMPLETED: { text: '✅ Завершён', cls: 'bg-emerald-500/20 text-emerald-400' },
  DISPUTED: { text: '⚠️ Спор', cls: 'bg-red-500/20 text-red-400' },
  RESOLVED: { text: '⚖️ Решено', cls: 'bg-purple-500/20 text-purple-400' },
  CANCELLED_BY_BUYER: { text: '❌ Отменён (покупатель)', cls: 'bg-zinc-500/20 text-zinc-400' },
  CANCELLED_BY_SELLER: { text: '❌ Отменён (продавец)', cls: 'bg-zinc-500/20 text-zinc-400' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { text: status, cls: 'bg-zinc-500/20 text-zinc-400' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.text}</span>;
}

export default function BoostManagementPage() {
  const [tab, setTab] = useState<Tab>('stats');
  const [typeFilter, setTypeFilter] = useState<'' | 'ACCOUNT' | 'TEAM'>('');
  const [dealStatusFilter, setDealStatusFilter] = useState<string>('');
  const [listings, setListings] = useState<boostApi.BoostListingAdmin[]>([]);
  const [deals, setDeals] = useState<boostApi.BoostDealAdmin[]>([]);
  const [stats, setStats] = useState<boostApi.BoostStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [viewListing, setViewListing] = useState<boostApi.BoostListingAdmin | null>(null);

  // Deal chat
  const [chatDealId, setChatDealId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<boostApi.BoostMessageAdmin[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Dispute resolution
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveDecision, setResolveDecision] = useState<'refund' | 'payout'>('refund');
  const [resolveComment, setResolveComment] = useState('');

  // Split payout
  const [splitId, setSplitId] = useState<string | null>(null);
  const [splitPct, setSplitPct] = useState(50);

  useEffect(() => {
    loadData();
  }, [tab, typeFilter, dealStatusFilter]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      if (tab === 'stats') {
        setStats(await boostApi.getStats());
      } else if (tab === 'pending') {
        const data = await boostApi.getPendingListings();
        setListings(typeFilter ? data.filter(l => l.type === typeFilter) : data);
      } else if (tab === 'all_listings') {
        const data = await boostApi.getAllListings({ type: typeFilter || undefined });
        setListings(data);
      } else {
        const data = await boostApi.getAllDeals({ type: typeFilter || undefined, status: dealStatusFilter || undefined });
        setDeals(data);
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(true);
    try {
      await boostApi.approveListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await boostApi.rejectListing(rejectId, rejectReason.trim());
      setListings(prev => prev.filter(l => l.id !== rejectId));
      setRejectId(null);
      setRejectReason('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function openChat(dealId: string) {
    setChatDealId(dealId);
    setChatLoading(true);
    try {
      const msgs = await boostApi.getDealMessages(dealId);
      setChatMessages(msgs);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendChatMsg() {
    if (!chatDealId || !chatInput.trim()) return;
    try {
      const msg = await boostApi.sendDealMessage(chatDealId, chatInput.trim());
      setChatMessages(prev => [...prev, msg]);
      setChatInput('');
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleResolve() {
    if (!resolveId) return;
    setActionLoading(true);
    try {
      await boostApi.resolveDispute(resolveId, resolveDecision, resolveComment);
      setDeals(prev => prev.map(d => d.id === resolveId ? { ...d, status: 'RESOLVED' } : d));
      setResolveId(null);
      setResolveComment('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleForceCancel(dealId: string) {
    const reason = prompt('Причина отмены:');
    if (!reason?.trim()) return;
    try {
      await boostApi.forceCancel(dealId, reason.trim());
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'CANCELLED_BY_SELLER' } : d));
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🚀 Напарники и Буст</h1>
        <button onClick={loadData} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors">
          🔄 Обновить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['stats', '📊 Дашборд'],
          ['pending', '⏳ На модерации'],
          ['all_listings', '📋 Все листинги'],
          ['deals', '🤝 Сделки'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tabs: type filter (for pending, all_listings, deals) */}
      {tab !== 'stats' && (
        <div className="flex gap-1.5">
          {([['', 'Все'], ['ACCOUNT', '🚀 Буст'], ['TEAM', '👥 Напарники']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTypeFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === id ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 border border-zinc-700/50'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs: status filter (for deals only) */}
      {tab === 'deals' && (
        <div className="flex gap-1.5">
          {([['', 'Все'], ['active', 'Активные'], ['COMPLETED', 'Завершённые'], ['DISPUTED', 'Жалобы'], ['cancelled', 'Отменённые']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setDealStatusFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dealStatusFilter === id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 border border-zinc-700/50'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* STATS DASHBOARD */}
          {tab === 'stats' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Всего сделок', value: stats.totalDeals, cls: 'text-white' },
                { label: 'Завершено', value: stats.completedDeals, cls: 'text-emerald-400' },
                { label: 'Активные', value: stats.activeDeals, cls: 'text-blue-400' },
                { label: 'Споры', value: stats.disputedDeals, cls: 'text-red-400' },
                { label: 'Решено', value: stats.resolvedDeals, cls: 'text-purple-400' },
                { label: 'Отменено', value: stats.cancelledDeals, cls: 'text-zinc-400' },
                { label: '💰 Прибыль (комиссия)', value: `$${stats.revenue.toFixed(2)}`, cls: 'text-yellow-400' },
                { label: '💵 Оборот', value: `$${stats.totalVolume.toFixed(2)}`, cls: 'text-cyan-400' },
                { label: 'Средний чек', value: `$${stats.avgCheck.toFixed(2)}`, cls: 'text-amber-400' },
                { label: 'Конверсия', value: `${stats.conversionRate}%`, cls: 'text-green-400' },
                { label: '💳 Сбор за листинги', value: `$${stats.listingFeeIncome.toFixed(2)}`, cls: 'text-orange-400' },
                { label: 'Платных листингов', value: stats.listingFeeCount, cls: 'text-zinc-300' },
              ].map((s, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* LISTINGS */}
          {(tab === 'pending' || tab === 'all_listings') && (
            <div className="space-y-3">
              {listings.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет листингов</p>
              ) : listings.map(l => (
                <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    {l.avatar && <img src={l.avatar} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{l.gameName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${l.type === 'ACCOUNT' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {l.type === 'ACCOUNT' ? '🚀 Буст' : '👥 Напарник'}
                        </span>
                        <StatusBadge status={l.status} />
                        <span className={`text-xs px-1.5 py-0.5 rounded ${l.listingType === 'paid' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                          {l.listingType === 'paid' ? '💰 Платное' : '🆓 Бесплатное'}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm">{l.shortDesc}</p>
                      <p className="text-zinc-500 text-xs mt-1">
                        Продавец: {l.seller.displayName || l.seller.username} · Платформа: {l.platform}
                        {l.type === 'ACCOUNT' && l.pricePerRank && (
                          <> · Цены: {Object.entries(l.pricePerRank).map(([r, p]) => `${r}: $${p}`).join(', ')}</>
                        )}
                        {l.type === 'TEAM' && l.pricePerHour && <> · ${l.pricePerHour}/ч</>}
                      </p>
                      {l.rejectReason && <p className="text-red-400 text-xs mt-1">Причина отказа: {l.rejectReason}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setViewListing(l)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">👁 Детали</button>
                      {l.status === 'PENDING_REVIEW' && (
                        <>
                          <button onClick={() => handleApprove(l.id)} disabled={actionLoading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg disabled:opacity-50">
                            ✅ Одобрить
                          </button>
                          <button onClick={() => { setRejectId(l.id); setRejectReason(''); }} disabled={actionLoading}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg disabled:opacity-50">
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DEALS */}
          {tab === 'deals' && (
            <div className="space-y-3">
              {deals.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет сделок</p>
              ) : deals.map(d => (
                <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{d.listing.gameName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${d.boostType === 'ACCOUNT' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {d.boostType === 'ACCOUNT' ? '🚀 Буст' : '👥 Напарник'}
                        </span>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-zinc-400 text-sm">
                        Покупатель: {d.buyer.displayName || d.buyer.username} → Продавец: {d.seller.displayName || d.seller.username}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">
                        Цена: ${d.price} · Комиссия: ${d.siteFee} · Выплата: ${d.sellerPayout}
                        {d.selectedRank && <> · Ранг: {d.selectedRank}</>}
                        {d.ratingAmount && <> · Очков: {d.ratingAmount}</>}
                        {d.hoursCount && <> · Часов: {d.hoursCount}</>}
                      </p>
                      {d.disputeReason && <p className="text-red-400 text-xs mt-1">Спор: {d.disputeReason}</p>}
                      {d.resolution && <p className="text-purple-400 text-xs mt-1">Решение: {d.resolution}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openChat(d.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg">💬 Чат</button>
                      {d.status === 'DISPUTED' && (
                        <>
                          <button onClick={() => { setResolveId(d.id); setResolveDecision('refund'); setResolveComment(''); }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg">
                            ⚖️ Решить
                          </button>
                          <button onClick={() => { setSplitId(d.id); setSplitPct(50); }}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg">
                            ✂️ Разделить
                          </button>
                          <button onClick={async () => { if (!confirm('Отклонить жалобу и вернуть в работу?')) return; try { await boostApi.dismissDispute(d.id); setDeals(prev => prev.map(x => x.id === d.id ? { ...x, status: 'IN_PROGRESS' } : x)); } catch (e: any) { alert(e.message); } }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg">
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                      {!['COMPLETED', 'RESOLVED', 'CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER'].includes(d.status) && (
                        <button onClick={() => handleForceCancel(d.id)}
                          className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-white text-xs rounded-lg">
                          🛑 Отменить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* REJECT MODAL */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setRejectId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-3">Отклонить листинг</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Причина отклонения..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-red-500 outline-none resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm">Отмена</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm disabled:opacity-50">
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW LISTING MODAL */}
      {viewListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setViewListing(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Детали листинга</h3>
              <button onClick={() => setViewListing(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {viewListing.avatar && <img src={viewListing.avatar} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                <div>
                  <p className="text-white font-medium">{viewListing.gameName}</p>
                  <p className="text-zinc-400">{viewListing.shortDesc}</p>
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 space-y-1">
                <p className="text-zinc-300"><strong>Тип:</strong> {viewListing.type === 'ACCOUNT' ? 'Буст' : 'Напарник'}</p>
                <p className="text-zinc-300"><strong>Платформа:</strong> {viewListing.platform}</p>
                <p className="text-zinc-300"><strong>Размещение:</strong> {viewListing.listingType === 'paid' ? 'Платное' : 'Бесплатное'}</p>
                <p className="text-zinc-300"><strong>Продавец:</strong> {viewListing.seller.displayName || viewListing.seller.username} (ID: {viewListing.seller.id})</p>
                {viewListing.type === 'ACCOUNT' && viewListing.pricePerRank && (
                  <div>
                    <p className="text-zinc-300 font-medium">Цены за 100 очков:</p>
                    {Object.entries(viewListing.pricePerRank).map(([rank, price]) => (
                      <p key={rank} className="text-zinc-400 ml-2">{rank}: ${price}</p>
                    ))}
                  </div>
                )}
                {viewListing.type === 'TEAM' && (
                  <>
                    <p className="text-zinc-300"><strong>Цена/час:</strong> ${viewListing.pricePerHour}</p>
                    {viewListing.realName && <p className="text-zinc-300"><strong>Имя:</strong> {viewListing.realName}</p>}
                    {viewListing.age && <p className="text-zinc-300"><strong>Возраст:</strong> {viewListing.age}</p>}
                    {viewListing.gender && <p className="text-zinc-300"><strong>Пол:</strong> {viewListing.gender === 'male' ? 'М' : 'Ж'}</p>}
                    {viewListing.yearsPlaying !== null && <p className="text-zinc-300"><strong>Лет играет:</strong> {viewListing.yearsPlaying}</p>}
                    <p className="text-zinc-300"><strong>Микрофон:</strong> {viewListing.hasMic ? 'Есть' : 'Нет'}</p>
                    {viewListing.availableFrom && <p className="text-zinc-300"><strong>Доступен:</strong> {viewListing.availableFrom} — {viewListing.availableTo}</p>}
                  </>
                )}
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3">
                <p className="text-zinc-300 font-medium mb-1">Полное описание:</p>
                <p className="text-zinc-400 whitespace-pre-wrap">{viewListing.fullDesc}</p>
              </div>
              {viewListing.images.length > 0 && (
                <div>
                  <p className="text-zinc-300 font-medium mb-2">Изображения:</p>
                  <div className="flex gap-2 flex-wrap">
                    {viewListing.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-24 h-24 rounded-lg object-cover border border-zinc-700" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {chatDealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setChatDealId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <h3 className="text-white font-bold">Чат сделки</h3>
              <button onClick={() => setChatDealId(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
              {chatLoading ? (
                <p className="text-zinc-500 text-sm text-center">Загрузка...</p>
              ) : chatMessages.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center">Нет сообщений</p>
              ) : chatMessages.map(m => (
                <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.isAdmin ? 'bg-purple-500/20 text-purple-300' : m.isSystem ? 'bg-zinc-800 text-zinc-400 italic' : 'bg-zinc-800 text-white'}`}>
                  <p>{m.content}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(m.createdAt).toLocaleString('ru-RU')}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-zinc-700 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMsg()}
                placeholder="Сообщение от админа..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 outline-none focus:border-emerald-500" />
              <button onClick={sendChatMsg} disabled={!chatInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg disabled:opacity-50">
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE DISPUTE MODAL */}
      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setResolveId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-3">Решить спор</h3>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setResolveDecision('refund')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium ${resolveDecision === 'refund' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                💸 Возврат покупателю
              </button>
              <button onClick={() => setResolveDecision('payout')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium ${resolveDecision === 'payout' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                💰 Выплата продавцу
              </button>
            </div>
            <textarea value={resolveComment} onChange={e => setResolveComment(e.target.value)} rows={2} placeholder="Комментарий..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-500 outline-none resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setResolveId(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm">Отмена</button>
              <button onClick={handleResolve} disabled={actionLoading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm disabled:opacity-50">
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SPLIT PAYOUT MODAL */}
      {splitId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSplitId(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-3">Разделить средства</h3>
            <p className="text-zinc-400 text-sm mb-3">Покупателю: {splitPct}% · Исполнителю: {100 - splitPct}%</p>
            <input type="range" min={0} max={100} value={splitPct} onChange={e => setSplitPct(Number(e.target.value))}
              className="w-full accent-cyan-500 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setSplitId(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm">Отмена</button>
              <button onClick={async () => {
                setActionLoading(true);
                try {
                  await boostApi.splitPayout(splitId, splitPct);
                  setDeals(prev => prev.map(d => d.id === splitId ? { ...d, status: 'RESOLVED' } : d));
                  setSplitId(null);
                } catch (e: any) { alert(e.message); }
                finally { setActionLoading(false); }
              }} disabled={actionLoading}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm disabled:opacity-50">
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
