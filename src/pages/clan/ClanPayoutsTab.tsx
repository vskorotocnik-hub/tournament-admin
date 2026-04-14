import { useState, useEffect } from 'react';
import {
  getPendingPayouts, getUserPayoutHistory, getLedger, payUser, payAllUsers,
  addExternalEarning, getDistConfigs, updateDistConfig,
} from '../../lib/clanApi';
import type { PendingPayout, PayoutAggregates, LedgerEntry, DistConfig, DistConfigSplit, ClanAdminMember } from '../../lib/clanApi';

const TYPE_LABELS: Record<string, string> = {
  ENTRY_FEE: 'Взнос',
  TOWER: 'Башня',
  INTERNAL_TOURNAMENT: 'Внутр. турнир',
  EXTERNAL_TOURNAMENT: 'Внешн. заработок',
};

const TARGET_LABELS: Record<string, string> = {
  USER: 'Пользователь',
  SITE: 'Сайт',
  TREASURY: 'Казна',
};

const SPLIT_TARGET_LABELS: Record<string, string> = {
  site: 'Сайт',
  opponent: 'Оппонент',
  member: 'Участник клана',
  winner: 'Победитель',
  members: 'Все участники',
  director: 'Наводящий',
  treasury: 'Казна клана',
  custom: 'Custom (userId)',
};

interface Props { members: ClanAdminMember[]; onRefresh: () => Promise<void>; }

export default function ClanPayoutsTab({ members, onRefresh }: Props) {
  const [pending, setPending] = useState<PendingPayout[]>([]);
  const [aggregates, setAggregates] = useState<PayoutAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // User history modal
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [historyUserName, setHistoryUserName] = useState('');
  const [historyEntries, setHistoryEntries] = useState<LedgerEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<{ type: string; status: string }>({ type: '', status: '' });

  // Ledger view
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState({ type: '', status: '', target: '' });

  // External earning form
  const [extUserId, setExtUserId] = useState('');
  const [extAmount, setExtAmount] = useState('');
  const [extDesc, setExtDesc] = useState('');

  // Dist config
  const [configs, setConfigs] = useState<DistConfig[]>([]);
  const [editType, setEditType] = useState<string | null>(null);
  const [editSplits, setEditSplits] = useState<DistConfigSplit[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const p = await getPendingPayouts();
      setPending(p.pending);
      setAggregates(p.aggregates);
    } catch (e) { console.error('Failed to load pending payouts:', e); }
    try {
      const c = await getDistConfigs();
      setConfigs(c.configs);
    } catch (e) { console.error('Failed to load dist configs:', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openHistory = async (userId: string, name: string) => {
    setHistoryUserId(userId);
    setHistoryUserName(name);
    setHistoryLoading(true);
    setHistoryFilter({ type: '', status: '' });
    try {
      const r = await getUserPayoutHistory(userId);
      setHistoryEntries(r.entries);
    } catch {} finally { setHistoryLoading(false); }
  };

  const refreshHistory = async () => {
    if (!historyUserId) return;
    setHistoryLoading(true);
    try {
      const filters: any = {};
      if (historyFilter.type) filters.type = historyFilter.type;
      if (historyFilter.status) filters.status = historyFilter.status;
      const r = await getUserPayoutHistory(historyUserId, filters);
      setHistoryEntries(r.entries);
    } catch {} finally { setHistoryLoading(false); }
  };

  useEffect(() => { if (historyUserId) refreshHistory(); }, [historyFilter.type, historyFilter.status]);

  const handlePay = async (userId: string) => {
    if (busy || !confirm('Выплатить все начисления этому пользователю?')) return;
    setBusy(true);
    try {
      const r = await payUser(userId);
      alert(`Выплачено $${r.amount} (${r.entries} начислений)`);
      await load(); await onRefresh();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(false);
  };

  const handlePayAll = async () => {
    if (busy || !confirm('Выплатить ВСЕ начисления всем участникам?')) return;
    setBusy(true);
    try {
      const r = await payAllUsers();
      alert(`Выплачено $${r.totalPaid} для ${r.usersCount} пользователей${r.errors.length ? `\n⚠️ Ошибок: ${r.errors.length}` : ''}`);
      await load(); await onRefresh();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(false);
  };


  const handleAddExternal = async () => {
    const amt = parseFloat(extAmount);
    if (!amt || amt <= 0 || !extUserId.trim() || !extDesc.trim()) { alert('Укажите userId, сумму и описание'); return; }
    if (busy) return;
    setBusy(true);
    try {
      await addExternalEarning(extUserId.trim(), amt, extDesc.trim());
      setExtUserId(''); setExtAmount(''); setExtDesc('');
      alert('Заработок записан!');
      await load();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(false);
  };

  const openLedger = async () => {
    setShowLedger(true);
    setLedgerLoading(true);
    try {
      const r = await getLedger();
      setLedgerEntries(r.entries);
    } catch {} finally { setLedgerLoading(false); }
  };

  const refreshLedger = async () => {
    setLedgerLoading(true);
    try {
      const filters: any = {};
      if (ledgerFilter.type) filters.type = ledgerFilter.type;
      if (ledgerFilter.status) filters.status = ledgerFilter.status;
      if (ledgerFilter.target) filters.target = ledgerFilter.target;
      const r = await getLedger(filters);
      setLedgerEntries(r.entries);
    } catch {} finally { setLedgerLoading(false); }
  };

  useEffect(() => { if (showLedger) refreshLedger(); }, [ledgerFilter.type, ledgerFilter.status, ledgerFilter.target]);

  const startEditConfig = (cfg: DistConfig) => {
    setEditType(cfg.revenueType);
    setEditSplits(cfg.splits.map(s => ({ ...s })));
  };

  const handleSaveConfig = async () => {
    if (!editType || busy) return;
    const total = editSplits.reduce((s, sp) => s + sp.pct, 0);
    if (total !== 100) { alert(`Сумма: ${total}%. Должно быть 100%.`); return; }
    setBusy(true);
    try {
      await updateDistConfig(editType, editSplits);
      setEditType(null);
      await load();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(false);
  };

  if (loading) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;

  return (
    <div className="space-y-6">
      {/* Aggregates */}
      {aggregates && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['💰', 'К выплате', `$${aggregates.pendingPayouts.toFixed(2)}`, 'text-amber-400'],
            ['🏦', 'Доход сайта', `$${aggregates.siteRevenue.toFixed(2)}`, 'text-emerald-400'],
            ['🏛️', 'Казна клана', `$${aggregates.treasuryBalance.toFixed(2)}`, 'text-blue-400'],
            ['✅', 'Выплачено', `$${aggregates.paidTotal.toFixed(2)}`, 'text-zinc-400'],
          ].map(([icon, label, value, color]) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><span>{icon}</span><span className="text-zinc-500 text-xs">{label}</span></div>
              <p className={`font-bold text-lg ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending payouts table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">💳 К выплате сейчас</h3>
          <div className="flex gap-2">
            <button onClick={openLedger} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-white">📋 Полный реестр</button>
            {pending.length > 0 && (
              <button onClick={handlePayAll} disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-600/40 disabled:opacity-50">
                💸 Выплатить всем
              </button>
            )}
          </div>
        </div>
        {pending.length === 0 ? (
          <p className="text-zinc-500 text-sm bg-zinc-900 rounded-xl p-4 border border-zinc-800">Нет начислений к выплате.</p>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="px-4 py-2.5 text-left">Участник</th>
                  <th className="px-4 py-2.5 text-right">К выплате</th>
                  <th className="px-4 py-2.5 text-center">Записей</th>
                  <th className="px-4 py-2.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(row => (
                  <tr key={row.userId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.user?.avatar && <img src={row.user.avatar} className="w-6 h-6 rounded-full" alt="" />}
                        <div>
                          <p className="text-white font-medium text-sm">{row.user?.displayName || row.user?.username || 'Unknown'}</p>
                          <p className="text-zinc-500 text-[10px]">{row.userId.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 font-bold">${row.pendingAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{row.entriesCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openHistory(row.userId, row.user?.displayName || row.user?.username || row.userId)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-white">📜 История</button>
                        <button onClick={() => handlePay(row.userId)} disabled={busy}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-600/40 disabled:opacity-50">
                          💸 Выплатить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record external earning */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-3">🏆 Записать внешний заработок</h3>
        <p className="text-zinc-500 text-xs mb-3">Участник клана заработал на внешнем турнире — выберите участника, укажите сумму. Заработок отобразится на странице клана.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-zinc-500 text-xs mb-1 block">Участник клана</label>
            <select value={extUserId} onChange={e => setExtUserId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
              <option value="">Выберите участника...</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>{m.nick} ({m.pid})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-zinc-500 text-xs mb-1 block">Сумма (USD)</label>
            <input value={extAmount} onChange={e => setExtAmount(e.target.value)} type="number" min="0" step="0.01"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" placeholder="100" />
          </div>
          <div>
            <label className="text-zinc-500 text-xs mb-1 block">Описание</label>
            <input value={extDesc} onChange={e => setExtDesc(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" placeholder="Турнир XYZ, 1-е место" />
          </div>
        </div>
        <button onClick={handleAddExternal} disabled={busy}
          className="mt-3 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/40 disabled:opacity-50">
          {busy ? '⏳...' : '🏆 Записать заработок'}
        </button>
      </div>

      {/* Distribution config */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">⚙️ Настройки распределения доходов</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {configs.map(cfg => {
            const colors: Record<string, { border: string; bg: string; icon: string }> = {
              entry_fee: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', icon: '💰' },
              tower_prize: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', icon: '🏗️' },
              int_tournament: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', icon: '🎮' },
            };
            const c = colors[cfg.revenueType] || { border: 'border-zinc-700', bg: 'bg-zinc-900', icon: '📋' };
            const splitColors: Record<string, string> = {
              site: 'bg-red-500/20 text-red-300 border-red-500/30',
              opponent: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              member: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
              winner: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
              members: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
              treasury: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
              custom: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
              director: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            };
            return (
              <div key={cfg.id} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-white text-sm font-bold">{cfg.label || cfg.revenueType}</span>
                  </div>
                  <button onClick={() => startEditConfig(cfg)} className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-400 text-xs hover:text-white hover:bg-zinc-700 transition-colors">✏️ Изменить</button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {cfg.splits.map((sp, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${splitColors[sp.target] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                      <span className="text-xs font-medium">{sp.label}</span>
                      <span className="text-xs font-bold">{sp.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User History Modal */}
      {historyUserId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-base">📜 История: {historyUserName}</h3>
              <button onClick={() => setHistoryUserId(null)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex gap-2 mb-3">
              <select value={historyFilter.type} onChange={e => setHistoryFilter(f => ({ ...f, type: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                <option value="">Все типы</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={historyFilter.status} onChange={e => setHistoryFilter(f => ({ ...f, status: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                <option value="">Все статусы</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? <p className="text-zinc-500 text-sm text-center py-4">Загрузка...</p> : historyEntries.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">Нет записей</p>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="px-2 py-2 text-left">Дата</th>
                    <th className="px-2 py-2 text-left">Тип</th>
                    <th className="px-2 py-2 text-right">Сумма</th>
                    <th className="px-2 py-2 text-left">Описание</th>
                    <th className="px-2 py-2 text-center">Статус</th>
                  </tr></thead>
                  <tbody>
                    {historyEntries.map(e => (
                      <tr key={e.id} className="border-b border-zinc-800/50">
                        <td className="px-2 py-2 text-zinc-400 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString('ru')}</td>
                        <td className="px-2 py-2"><span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{TYPE_LABELS[e.type] || e.type}</span></td>
                        <td className="px-2 py-2 text-right text-white font-medium">${e.amount.toFixed(2)}</td>
                        <td className="px-2 py-2 text-zinc-400 max-w-[200px] truncate">{e.description}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${e.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {e.status}
                          </span>
                          {e.paidAt && <div className="text-[9px] text-zinc-600 mt-0.5">{new Date(e.paidAt).toLocaleDateString('ru')}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Ledger Modal */}
      {showLedger && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-base">📋 Полный реестр начислений</h3>
              <button onClick={() => setShowLedger(false)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <select value={ledgerFilter.type} onChange={e => setLedgerFilter(f => ({ ...f, type: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                <option value="">Все типы</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={ledgerFilter.status} onChange={e => setLedgerFilter(f => ({ ...f, status: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                <option value="">Все статусы</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PAID">PAID</option>
              </select>
              <select value={ledgerFilter.target} onChange={e => setLedgerFilter(f => ({ ...f, target: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                <option value="">Все получатели</option>
                <option value="USER">Пользователь</option>
                <option value="SITE">Сайт</option>
                <option value="TREASURY">Казна</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {ledgerLoading ? <p className="text-zinc-500 text-sm text-center py-4">Загрузка...</p> : ledgerEntries.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">Нет записей</p>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="px-2 py-2 text-left">Дата</th>
                    <th className="px-2 py-2 text-left">Тип</th>
                    <th className="px-2 py-2 text-left">Кому</th>
                    <th className="px-2 py-2 text-right">Сумма</th>
                    <th className="px-2 py-2 text-left">Описание</th>
                    <th className="px-2 py-2 text-center">Статус</th>
                  </tr></thead>
                  <tbody>
                    {ledgerEntries.map(e => (
                      <tr key={e.id} className="border-b border-zinc-800/50">
                        <td className="px-2 py-2 text-zinc-400 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString('ru')}</td>
                        <td className="px-2 py-2"><span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{TYPE_LABELS[e.type] || e.type}</span></td>
                        <td className="px-2 py-2 text-zinc-300">{TARGET_LABELS[e.target] || e.target}{e.userName ? `: ${e.userName}` : ''}</td>
                        <td className="px-2 py-2 text-right text-white font-medium">${e.amount.toFixed(2)}</td>
                        <td className="px-2 py-2 text-zinc-400 max-w-[180px] truncate">{e.description}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${e.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {editType && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-white font-bold text-lg mb-4">Настройка: {configs.find(c => c.revenueType === editType)?.label || editType}</h3>
            <div className="space-y-3 mb-4">
              {editSplits.map((sp, i) => (
                <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-xl p-3">
                  <input value={sp.label} onChange={e => { const n = [...editSplits]; n[i] = { ...n[i], label: e.target.value }; setEditSplits(n); }}
                    placeholder="Название" className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none" />
                  <input value={sp.pct} onChange={e => { const n = [...editSplits]; n[i] = { ...n[i], pct: Number(e.target.value) || 0 }; setEditSplits(n); }}
                    type="number" min="0" max="100" className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none" />
                  <span className="text-zinc-400 text-xs">%</span>
                  <select value={sp.target} onChange={e => { const n = [...editSplits]; n[i] = { ...n[i], target: e.target.value }; setEditSplits(n); }}
                    className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                    {Object.entries(SPLIT_TARGET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {sp.target === 'custom' && (
                    <input value={sp.userId || ''} onChange={e => { const n = [...editSplits]; n[i] = { ...n[i], userId: e.target.value }; setEditSplits(n); }}
                      placeholder="User ID" className="w-24 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                  )}
                  <button onClick={() => setEditSplits(editSplits.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setEditSplits([...editSplits, { label: '', pct: 0, target: 'site' }])}
                className="text-xs text-emerald-400 hover:text-emerald-300">➕ Добавить</button>
              <span className={`text-xs font-bold ${editSplits.reduce((s, sp) => s + sp.pct, 0) === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                Итого: {editSplits.reduce((s, sp) => s + sp.pct, 0)}%
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveConfig} disabled={busy}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-50">
                {busy ? '⏳...' : '💾 Сохранить'}
              </button>
              <button onClick={() => setEditType(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-bold hover:bg-zinc-700">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
