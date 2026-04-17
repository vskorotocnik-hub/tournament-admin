import { useState, useEffect, useRef } from 'react';
import type { DisputedMatch, ClanMatchMessage } from '../../lib/clanApi';
import { getDisputedMatches, getMatchMessages, sendAdminMatchMessage, resolveMatchDispute } from '../../lib/clanApi';
import { toast } from '../../lib/toast';
interface Props { onRefresh: () => Promise<void>; }
export default function ClanDisputesTab({ onRefresh }: Props) {
  const [matches, setMatches] = useState<DisputedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string|null>(null);
  const [msgs, setMsgs] = useState<ClanMatchMessage[]>([]);
  const [msgIn, setMsgIn] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [sM, setSM] = useState('');
  const [sC, setSC] = useState('');
  const [res, setRes] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const load = async () => { try { setMatches((await getDisputedMatches()).matches); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);
  useEffect(() => { if(!sel)return; const f=()=>getMatchMessages(sel).then(d=>setMsgs(d.messages)).catch(()=>{}); f(); const iv=setInterval(f,5000); return()=>clearInterval(iv); }, [sel]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs.length]);
  const match = matches.find(m=>m.id===sel);
  const send = async () => { if(!sel||!msgIn.trim()||busy)return; setBusy(true); try{await sendAdminMatchMessage(sel,msgIn.trim());setMsgIn('');await getMatchMessages(sel).then(d=>setMsgs(d.messages));}catch{} setBusy(false); };
  const resolve = async () => { if(!sel||busy||!winnerId||!sM||!sC||!res.trim()){toast.error('Заполните все поля');return;} setBusy(true); try{await resolveMatchDispute(sel,winnerId,+sM,+sC,res.trim());toast.error('Решено');setSel(null);await load();await onRefresh();}catch(e:any){toast.error(e.message||'Ошибка');} setBusy(false); };
  if(loading) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;
  if(!matches.length) return <div className="text-center py-12"><p className="text-3xl mb-2">✅</p><p className="text-zinc-400 text-sm">Нет споров</p></div>;
  return (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="space-y-2"><h3 className="text-white font-semibold text-sm mb-2">⚠️ Споры ({matches.length})</h3>
    {matches.map(m=>(<button key={m.id} onClick={()=>{setSel(m.id);setWinnerId('');setRes('');}} className={`w-full text-left p-3 rounded-xl border ${sel===m.id?'bg-red-500/15 border-red-500/40':'bg-zinc-900 border-zinc-800'}`}>
      <span className="text-white text-sm font-medium block">{m.memberUser.username} vs {m.candidateUser.username}</span>
      <p className="text-xs text-zinc-400 mt-1">Уч: {m.memberScoreSelf??'—'}:{m.memberScoreOpp??'—'} | Канд: {m.candidateScoreSelf??'—'}:{m.candidateScoreOpp??'—'}</p>
    </button>))}</div>
    {match&&(<div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col" style={{maxHeight:'70vh'}}>
      <div className="px-4 py-3 border-b border-zinc-800"><p className="text-white font-semibold text-sm">{match.memberUser.username} vs {match.candidateUser.username}</p></div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-[120px]">
        {msgs.map(m=>(<div key={m.id} className={`text-xs py-1 ${m.isAdmin?'text-amber-400':m.isSystem?'text-zinc-500 italic':'text-zinc-300'}`}>{m.isAdmin&&<b>[Админ] </b>}{m.content}</div>))}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-2 border-t border-zinc-800 flex gap-2">
        <input value={msgIn} onChange={e=>setMsgIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Сообщение..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none"/>
        <button onClick={send} disabled={busy} className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 disabled:opacity-50">Отправить</button>
      </div>
      <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
        <p className="text-white text-xs font-semibold">Решение спора</p>
        <div className="flex gap-2">
          <button onClick={()=>setWinnerId(match.memberUser.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${winnerId===match.memberUser.id?'bg-emerald-500/20 text-emerald-400 border-emerald-500/40':'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>🏆 {match.memberUser.username}</button>
          <button onClick={()=>setWinnerId(match.candidateUser.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${winnerId===match.candidateUser.id?'bg-emerald-500/20 text-emerald-400 border-emerald-500/40':'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>🏆 {match.candidateUser.username}</button>
        </div>
        <div className="flex gap-2">
          <input value={sM} onChange={e=>setSM(e.target.value)} type="number" min="0" placeholder="Счёт участника" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none"/>
          <input value={sC} onChange={e=>setSC(e.target.value)} type="number" min="0" placeholder="Счёт кандидата" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none"/>
        </div>
        <textarea value={res} onChange={e=>setRes(e.target.value)} placeholder="Причина решения..." rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none resize-none"/>
        <button onClick={resolve} disabled={busy} className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 disabled:opacity-50">Решить спор</button>
      </div>
    </div>)}
  </div>);
}
