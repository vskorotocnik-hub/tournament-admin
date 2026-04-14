import { useState, useRef } from 'react';
import type { ClanAdminSettings, ClanAdminApplication, ClanAdminDistribution, ClanAdminMember } from '../../lib/clanApi';
import { updateDistributionTimer, startDistribution, finishDistribution } from '../../lib/clanApi';

interface Props {
  clan: ClanAdminSettings;
  members: ClanAdminMember[];
  applications: ClanAdminApplication[];
  distributions: ClanAdminDistribution[];
  onRefresh: () => Promise<void>;
}

interface DistRow {
  key: string;
  userId: string;
  nick: string;
  pid: string;
  type: 'member' | 'candidate';
}

export default function ClanDistributionTab({ clan, members, applications, distributions, onRefresh }: Props) {
  const active = clan.distributionActive;
  const approved = applications.filter(a => a.status === 'APPROVED');
  const [busy, setBusy] = useState(false);
  const [distId, setDistId] = useState<string|null>(distributions.find(d => !d.completedAt)?.id || null);
  const timerRef = useRef<HTMLInputElement>(null);
  // Controlled state for places: key -> place string ('' = unassigned)
  const [places, setPlaces] = useState<Record<string, string>>({});

  // Build combined list: current members + approved candidates (no duplicates)
  const distParticipants: DistRow[] = [];
  const seenUserIds = new Set<string>();
  for (const m of members) {
    seenUserIds.add(m.userId);
    distParticipants.push({ key: `m-${m.id}`, userId: m.userId, nick: m.nick, pid: m.pid, type: 'member' });
  }
  for (const a of approved) {
    if (!seenUserIds.has(a.userId)) {
      seenUserIds.add(a.userId);
      distParticipants.push({ key: `a-${a.id}`, userId: a.userId, nick: a.nick, pid: a.pid, type: 'candidate' });
    }
  }

  const setPlace = (key: string, val: string) => setPlaces(prev => ({ ...prev, [key]: val }));

  const handleSaveTimer = async () => {
    const v = timerRef.current?.value;
    if (!v) return;
    try { await updateDistributionTimer(new Date(v).toISOString()); await onRefresh(); } catch (e: any) { alert(e.message); }
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      const d = await startDistribution();
      setDistId(d.id);
      await onRefresh();
    } catch (e: any) { alert(e.message); }
    setBusy(false);
  };

  const handleFinish = async () => {
    if (!distId) { alert('Нет активного распределения'); return; }
    // Only include participants with a valid assigned place (>= 1)
    const results: Array<{ userId: string; pubgId: string; wins: number; losses: number; place: number }> = [];
    for (const p of distParticipants) {
      const placeStr = places[p.key] || '';
      const placeNum = parseInt(placeStr, 10);
      if (!placeStr || isNaN(placeNum) || placeNum < 1) continue; // skip unassigned
      results.push({
        userId: p.userId,
        pubgId: p.pid,
        wins: 0,
        losses: 0,
        place: placeNum,
      });
    }
    if (results.length === 0) { alert('Назначьте хотя бы одному участнику место (1–' + clan.maxMembers + ')'); return; }
    setBusy(true);
    try { await finishDistribution(distId, results); await onRefresh(); } catch (e: any) { alert(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-bold text-sm mb-3">⏱️ Таймер распределения</h3>
          <div className="flex items-center gap-3 mb-3">
            <input
              ref={timerRef}
              type="datetime-local"
              defaultValue={clan.distributionDate ? new Date(clan.distributionDate).toISOString().slice(0,16) : ''}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50"
            />
            <button onClick={handleSaveTimer} className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all">
              Сохранить
            </button>
          </div>
          <p className="text-zinc-500 text-xs">Когда таймер достигнет 0, страница клана заблокируется и начнётся распределение.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-bold text-sm mb-3">🎮 Управление</h3>
          {!active ? (
            <button
              onClick={handleStart}
              disabled={busy}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(234,88,12,0.3) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}
            >
              🚀 Запустить распределение
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={busy}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(34,197,94,0.3) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              ✅ Завершить распределение и обновить состав
            </button>
          )}
          <p className="text-zinc-500 text-xs mt-3">
            {active
              ? `Распределение активно. Участников: ${members.length} + кандидатов: ${approved.length}`
              : `Участников: ${members.length}, допущено кандидатов: ${approved.length}`}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">🏆 Участники распределения ({distParticipants.length})</h3>
          {active && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 animate-pulse">
              Мини-турнир в процессе
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="text-left text-zinc-500 font-medium px-4 py-2.5">#</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-2.5">Ник</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-2.5">PUBG ID</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-2.5">Тип</th>
                {active && (
                  <th className="text-center text-zinc-500 font-medium px-4 py-2.5">Место</th>
                )}
              </tr>
            </thead>
            <tbody>
              {distParticipants.map((p, idx) => (
                <tr key={p.key} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-zinc-500">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-white font-medium">{p.nick}</td>
                  <td className="px-4 py-2.5 text-zinc-400 font-mono text-xs">{p.pid}</td>
                  <td className="px-4 py-2.5">
                    {p.type === 'member'
                      ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">Участник</span>
                      : <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">Кандидат</span>
                    }
                  </td>
                  {active && (
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number" min="1" max={clan.maxMembers}
                        value={places[p.key] ?? ''}
                        onChange={e => setPlace(p.key, e.target.value)}
                        placeholder="—"
                        className={`w-14 bg-zinc-800 border rounded px-2 py-1 text-center text-xs font-bold outline-none ${places[p.key] ? 'border-amber-500/50 text-amber-400' : 'border-zinc-700 text-zinc-600'}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {distParticipants.length === 0 && <div className="text-center py-10 text-zinc-600">Нет участников для распределения</div>}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-amber-400 text-sm font-medium mb-1">⚡ Как работает распределение</p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          1. Таймер достигает 0 → нажимаете «Запустить» → страница клана блокируется.<br />
          2. Все текущие участники клана + допущенные кандидаты участвуют в мини-турнире.<br />
          3. Расставляете места (1, 2, 3…).<br />
          4. ТОП-{clan.maxMembers} по месту становятся участниками клана.<br />
          5. Кто не попал в ТОП — удаляется из клана.<br />
          6. Нажимаете «Завершить» → состав обновляется, страница разблокируется.
        </p>
      </div>
    </div>
  );
}
