import { useState } from 'react';
import type { ClanAdminApplication, ClanAdminMember } from '../../lib/clanApi';
import { decideApplication, reassignOpponent, adminCancelApplication } from '../../lib/clanApi';

const defaultAvatars = ['😎','🦅','👤','🔥','⚡','🐉','🐺','🐯','💥','👑'];

const fmtDate = (d: string) => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`; };

type F = 'all'|'PENDING'|'MATCHED'|'PLAYED'|'APPROVED'|'REJECTED';
const fLabels: Record<F,string> = { all:'Все', PENDING:'Ожидают', MATCHED:'Назначены', PLAYED:'Сыграли', APPROVED:'Допущены', REJECTED:'Отклонены' };

interface Props {
  applications: ClanAdminApplication[];
  members: ClanAdminMember[];
  onRefresh: () => Promise<void>;
}

export default function ClanApplicationsTab({ applications, members, onRefresh }: Props) {
  const [af, setAf] = useState<F>('all');
  const [reassign, setReassign] = useState<string|null>(null);
  const [busy, setBusy] = useState<string|null>(null);
  const list = af === 'all' ? applications : applications.filter(a => a.status === af);

  const sBadge = (s: string) => {
    const m: Record<string,[string,string]> = { PENDING:['bg-amber-500/20 text-amber-400','Ожидает'], MATCHED:['bg-blue-500/20 text-blue-400','Назначен'], PLAYED:['bg-cyan-500/20 text-cyan-400','Сыграл'], DISPUTED:['bg-red-500/20 text-red-400','Спор'], APPROVED:['bg-emerald-500/20 text-emerald-400','Допущен'], REJECTED:['bg-red-500/20 text-red-400','Отклонён'], CANCELLED:['bg-zinc-500/20 text-zinc-400','Отменён'] };
    const v = m[s]; return v ? <span className={`px-2 py-0.5 rounded text-xs font-bold ${v[0]}`}>{v[1]}</span> : <span className="text-zinc-600 text-xs">{s}</span>;
  };

  const handleDecide = async (appId: string, decision: 'approve' | 'reject') => {
    setBusy(appId);
    try { await decideApplication(appId, decision); await onRefresh(); } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(null);
  };

  const handleReassign = async (appId: string, memberId: string) => {
    try { await reassignOpponent(appId, memberId); setReassign(null); await onRefresh(); } catch (e: any) { alert(e.message || 'Ошибка'); }
  };

  const handleCancel = async (appId: string) => {
    if (!confirm('Отменить заявку? Взнос будет полностью возвращён кандидату.')) return;
    setBusy(appId);
    try { await adminCancelApplication(appId); await onRefresh(); } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(fLabels) as F[]).map(f => (
          <button key={f} onClick={() => setAf(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${af===f ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}>{fLabels[f]}</button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Кандидат</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">PUBG ID</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Дата</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Оппонент</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Оценка</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Статус</th>
                <th className="text-right text-zinc-500 font-medium px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{a.nick}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{a.pid}</td>
                  <td className="px-4 py-3 text-zinc-500">{fmtDate(a.date)}</td>
                  <td className="px-4 py-3">
                    <span className="text-zinc-300">{a.opponentNick || '—'}</span>
                    {(a.status === 'PENDING' || a.status === 'MATCHED') && (
                      <button onClick={() => setReassign(a.id)} className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2">изм.</button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {!a.evaluation ? <span className="text-zinc-600 text-xs">—</span> : a.evaluation === 'positive' ? <span className="text-xs font-bold text-emerald-400">👍 Достоин</span> : <span className="text-xs font-bold text-red-400">👎 Нет</span>}
                      {a.evaluationNote && <p className="text-zinc-500 text-[10px] mt-0.5 italic">«{a.evaluationNote}»</p>}
                      {(a.matchScoreMember !== null || a.matchScoreCandidate !== null) && (
                        <p className="text-zinc-400 text-[10px] mt-0.5">Счёт: <span className="text-white font-bold">{a.matchScoreMember ?? '?'}:{a.matchScoreCandidate ?? '?'}</span></p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {sBadge(a.status)}
                      {a.adminNote && <p className="text-zinc-500 text-[10px] mt-0.5 italic">«{a.adminNote}»</p>}
                      {a.decidedAt && <p className="text-zinc-600 text-[10px] mt-0.5">{fmtDate(a.decidedAt)}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {(a.status === 'PLAYED' || a.status === 'DISPUTED') ? (
                        <>
                          <button disabled={busy === a.id} onClick={() => handleDecide(a.id, 'approve')} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all disabled:opacity-50">Допустить</button>
                          <button disabled={busy === a.id} onClick={() => handleDecide(a.id, 'reject')} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all disabled:opacity-50">Отклонить</button>
                          <button disabled={busy === a.id} onClick={() => handleCancel(a.id)} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 border border-zinc-500/30 transition-all disabled:opacity-50">Отменить</button>
                        </>
                      ) : (a.status === 'PENDING' || a.status === 'MATCHED') ? (
                        <>
                          <span className="text-zinc-600 text-xs italic">Ожидает игру...</span>
                          <button disabled={busy === a.id} onClick={() => handleCancel(a.id)} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 border border-zinc-500/30 transition-all disabled:opacity-50">Отменить</button>
                        </>
                      ) : a.status === 'CANCELLED' ? (
                        <span className="text-zinc-600 text-xs">↩️ Отменена</span>
                      ) : (
                        <span className="text-zinc-600 text-xs">✓ Обработана</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <div className="text-center py-10 text-zinc-600">Нет заявок по фильтру</div>}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <p className="text-blue-400 text-sm font-medium mb-1">ℹ️ Логика назначения</p>
        <p className="text-zinc-500 text-xs leading-relaxed">Кандидаты назначаются по очереди (1→2→…→10→1). Можно переназначить вручную. После матча участник клана ставит оценку. Вы видите оценку и счёт, принимаете решение. Победа участника клана = автоматически +1 этаж в башне.</p>
      </div>

      {/* Reassign modal */}
      {reassign !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setReassign(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-4">Переназначить оппонента</h3>
            <p className="text-zinc-400 text-sm mb-4">Кандидат: <span className="text-white font-medium">{applications.find(a => a.id === reassign)?.nick}</span></p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((m, i) => (
                <button key={m.id} onClick={() => handleReassign(reassign, m.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/30 transition-all text-left">
                  <span className="text-xl">{m.avatar || defaultAvatars[i % defaultAvatars.length]}</span>
                  <span className="text-white font-medium text-sm">{m.nick}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setReassign(null)} className="w-full mt-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-400 hover:text-white transition-all">Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
