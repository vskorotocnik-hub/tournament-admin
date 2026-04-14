import { useState, useEffect, useCallback, useRef } from 'react';
import { classicApi, type ClassicRegistrationItem, type ClassicMessageItem } from '../lib/api';

interface Props {
  registration: ClassicRegistrationItem;
  onClose: () => void;
}

export default function ChatPanel({ registration, onClose }: Props) {
  const [messages, setMessages] = useState<ClassicMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await classicApi.getMessages(registration.id);
      setMessages(res.messages);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* ignore */ }
    setLoading(false);
  }, [registration.id]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await classicApi.sendMessage(registration.id, text.trim());
      setText('');
      await load();
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white">Чат с {registration.user.username}</h3>
            <p className="text-[10px] text-zinc-500">PUBG: {registration.pubgIds.join(', ')}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {loading ? (
            <p className="text-zinc-500 text-xs text-center py-4">Загрузка...</p>
          ) : messages.length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-4">Нет сообщений</p>
          ) : messages.map(m => {
            if (m.isSystem) return (
              <div key={m.id} className="flex justify-center py-0.5">
                <span className="bg-zinc-700/40 rounded-full px-3 py-1 text-[11px] text-zinc-400">{m.content}</span>
              </div>
            );
            return (
              <div key={m.id} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${m.isAdmin ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-700/40'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-bold ${m.isAdmin ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {m.isAdmin ? 'Админ' : registration.user.username}
                    </span>
                    <span className="text-[10px] text-zinc-600">{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {m.content && <p className="text-xs text-zinc-200">{m.content}</p>}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="px-3 py-2.5 border-t border-zinc-700 shrink-0">
          <div className="flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Написать как админ..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-yellow-600/50" />
            <button onClick={send} disabled={sending || !text.trim()}
              className="px-3 py-2 rounded-lg bg-yellow-600 text-white text-xs font-medium hover:bg-yellow-700 disabled:opacity-50">
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
