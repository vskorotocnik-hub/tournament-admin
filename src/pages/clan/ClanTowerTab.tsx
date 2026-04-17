import { useState, useRef } from 'react';
import type { ClanAdminMember, ClanAdminCheckpoint } from '../../lib/clanApi';
import { updateMemberFloor } from '../../lib/clanApi';
import { toast } from '../../lib/toast';

const defaultAvatars = ['😎','🦅','👤','🔥','⚡','�','🐺','🐯','💥','👑'];
const fmtMoney = (n: number) => n >= 1000 ? `$${n.toLocaleString('ru-RU')}` : `$${n}`;

interface Props {
  members: ClanAdminMember[];
  checkpoints: ClanAdminCheckpoint[];
  onRefresh: () => Promise<void>;
}

export default function ClanTowerTab({ members, checkpoints, onRefresh }: Props) {
  const sorted = members.slice().sort((a, b) => b.floor - a.floor);
  const cps = checkpoints.map(cp => ({ f: cp.floor, p: cp.label || fmtMoney(cp.prize) }));
  const [selMember, setSelMember] = useState(members[0]?.id || '');
  const floorRef = useRef<HTMLInputElement>(null);

  const handleUpdateFloor = async () => {
    const f = Number(floorRef.current?.value);
    if (!selMember || !f) return;
    try { await updateMemberFloor(selMember, f); await onRefresh(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">🎁 Призовые чекпоинты</h3>
          <div className="space-y-2">
            {cps.slice().reverse().map(cp => {
              const reached = members.filter(m => m.floor >= cp.f);
              return (
                <div key={cp.f} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 font-bold text-sm w-10">#{cp.f}</span>
                    <span className="text-emerald-400 font-bold text-sm">{cp.p}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reached.length > 0 && (
                      <span className="text-xs text-zinc-500">{reached.map(m => m.nick).join(', ')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">📍 Участники на башне</h3>
          <div className="space-y-2">
            {sorted.map((m, idx) => {
              const next = cps.find(cp => cp.f > m.floor);
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-sm w-6 ${idx === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{idx + 1}</span>
                    <span className="text-xl">{m.avatar && (m.avatar.startsWith('http://') || m.avatar.startsWith('https://')) ? <img src={m.avatar} alt="" className="w-7 h-7 rounded-full object-cover inline-block" /> : (m.avatar || defaultAvatars[idx % defaultAvatars.length])}</span>
                    <span className="text-white font-medium text-sm">{m.nick}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-amber-400 font-bold text-sm">Этаж {m.floor}</span>
                      {next && <p className="text-zinc-600 text-xs">до {next.p}: {next.f - m.floor} эт.</p>}
                    </div>
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden hidden lg:block">
                      <div className="h-full rounded-full" style={{ width: `${m.floor}%`, background: 'linear-gradient(90deg, #10b981, #f59e0b)' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-white font-bold text-sm mb-3">🔧 Ручная коррекция этажа</h3>
        <div className="flex flex-wrap gap-3">
          <select value={selMember} onChange={e => setSelMember(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50">
            {members.map(m => <option key={m.id} value={m.id}>{m.nick} (этаж {m.floor})</option>)}
          </select>
          <input ref={floorRef} type="number" min="1" max="100" placeholder="Новый этаж" className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50" />
          <button onClick={handleUpdateFloor} className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all border border-amber-500/30">
            Обновить
          </button>
        </div>
      </div>
    </div>
  );
}
