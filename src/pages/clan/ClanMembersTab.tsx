import { useState } from 'react';
import type { ClanAdminMember } from '../../lib/clanApi';
import { kickMember, addMember, clearAllApplications, resetClanData } from '../../lib/clanApi';

const isUrl = (s: string | null) => !!s && (s.startsWith('http://') || s.startsWith('https://'));

const defaultAvatars = ['😎','🦅','👤','🔥','⚡','🐉','🐺','🐯','💥','👑'];
const fmtDate = (d: string) => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`; };
const fmtMoney = (n: number) => n >= 1000 ? `$${n.toLocaleString('ru-RU')}` : `$${n}`;

interface Props {
  members: ClanAdminMember[];
  maxMembers: number;
  onRefresh: () => Promise<void>;
}

export default function ClanMembersTab({ members, maxMembers, onRefresh }: Props) {
  const [kick, setKick] = useState<string|null>(null);
  const [kickR, setKickR] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addPubgId, setAddPubgId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const sorted = members.slice().sort((a, b) => b.floor - a.floor);

  const handleKick = async () => {
    if (!kick) return;
    try { await kickMember(kick, kickR.trim() || undefined); setKick(null); setKickR(''); await onRefresh(); } catch (e: any) { alert(e.message || 'Ошибка'); }
  };

  const handleAdd = async () => {
    if (!addUserId.trim() || !addPubgId.trim()) return;
    setAddLoading(true);
    try {
      await addMember(addUserId.trim(), addPubgId.trim());
      setShowAdd(false);
      setAddUserId('');
      setAddPubgId('');
      await onRefresh();
    } catch (e: any) { alert(e.message || 'Ошибка добавления'); }
    setAddLoading(false);
  };

  const handleFullReset = async () => {
    if (!confirm('⚠️ ПОЛНАЯ ОЧИСТКА! Удалить ВСЕХ участников, заявки, матчи, чаты, транзакции, распределения? Это необратимо!')) return;
    try {
      const res = await resetClanData();
      alert(res.message);
      await onRefresh();
    } catch (e: any) { alert(e.message || 'Ошибка очистки'); }
  };

  const handleClearApps = async () => {
    if (!confirm('Удалить ВСЕ заявки в клан и связанные матчи/сообщения? Это действие необратимо.')) return;
    try {
      const res = await clearAllApplications();
      alert(res.message);
      await onRefresh();
    } catch (e: any) { alert(e.message || 'Ошибка очистки заявок'); }
  };

  return (
    <div className="space-y-4">
      {/* Add member button + Seed button when empty */}
      <div className="flex justify-end gap-3">
        <button onClick={handleFullReset}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition-all">
          ⚠️ Полная очистка клана
        </button>
        <button onClick={handleClearApps}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/25 transition-all">
          � Очистить все заявки
        </button>
        <button onClick={() => { if (maxMembers > 0 && members.length >= maxMembers) { alert(`Лимит участников (${maxMembers}) достигнут. Удалите кого-то перед добавлением.`); return; } setShowAdd(true); }}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all">
          + Добавить участника ({members.length}/{maxMembers})
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 font-medium px-4 py-3">#</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Участник</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">PUBG ID</th>
                <th className="text-center text-zinc-500 font-medium px-4 py-3">🗼 Этаж</th>
                <th className="text-center text-zinc-500 font-medium px-4 py-3">Матчи</th>
                <th className="text-center text-zinc-500 font-medium px-4 py-3">Победы</th>
                <th className="text-center text-zinc-500 font-medium px-4 py-3">WR%</th>
                <th className="text-right text-zinc-500 font-medium px-4 py-3">Заработал</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">В клане с</th>
                <th className="text-right text-zinc-500 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${i === 0 ? 'text-amber-400' : i < 3 ? 'text-zinc-300' : 'text-zinc-500'}`}>{i + 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isUrl(m.avatar) ? (
                        <img src={m.avatar!} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="text-xl">{m.avatar || defaultAvatars[i % defaultAvatars.length]}</span>
                      )}
                      <span className="text-white font-medium">{m.nick}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{m.pid}</td>
                  <td className="px-4 py-3 text-center text-amber-400 font-bold">{m.floor}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{m.mp}</td>
                  <td className="px-4 py-3 text-center text-emerald-400">{m.w}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={m.mp > 0 && (m.w / m.mp) >= 0.6 ? 'text-emerald-400' : 'text-zinc-400'}>
                      {m.mp > 0 ? Math.round((m.w / m.mp) * 100) : 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-bold">{fmtMoney(m.earned)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(m.jd)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setKick(m.id); setKickR(''); }} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25 transition-all">
                      Исключить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kick modal */}
      {kick !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setKick(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Исключить из клана</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Участник: <span className="text-red-400 font-medium">{members.find(m => m.id === kick)?.nick}</span>
            </p>
            <textarea
              value={kickR}
              onChange={e => setKickR(e.target.value)}
              placeholder="Причина исключения..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setKick(null)} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-400 hover:text-white transition-all">Отмена</button>
              <button onClick={handleKick}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all">
                Исключить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-4">Добавить участника в клан</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">User ID (из базы)</label>
                <input
                  type="text"
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  placeholder="cuid пользователя..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">PUBG Mobile ID</label>
                <input
                  type="text"
                  value={addPubgId}
                  onChange={e => setAddPubgId(e.target.value)}
                  placeholder="Числовой PUBG ID..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-400 hover:text-white transition-all">Отмена</button>
              <button onClick={handleAdd} disabled={addLoading || !addUserId.trim() || !addPubgId.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all disabled:opacity-50">
                {addLoading ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
