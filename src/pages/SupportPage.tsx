import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

interface SupportConversation {
  userId: string;
  user: { id: string; username: string; avatar: string | null; email: string | null } | null;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface SupportMessage {
  id: string;
  userId: string;
  content: string;
  isFromUser: boolean;
  isSystem: boolean;
  adminId: string | null;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
}

interface ConversationUser {
  id: string;
  username: string;
  avatar: string | null;
  email: string | null;
  rating: number;
  ucBalance: string;
  createdAt: string;
}

export default function SupportPage() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Active conversation
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [conversationUser, setConversationUser] = useState<ConversationUser | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ conversations: SupportConversation[] }>('/api/admin/support/conversations');
      setConversations(res.conversations);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (userId: string) => {
    setActiveUserId(userId);
    setMessagesLoading(true);
    try {
      const res = await apiFetch<{ messages: SupportMessage[]; user: ConversationUser }>(`/api/admin/support/conversations/${userId}`);
      setMessages(res.messages);
      setConversationUser(res.user);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* ignore */ }
    setMessagesLoading(false);
  };

  const refreshMessages = async () => {
    if (!activeUserId) return;
    try {
      const res = await apiFetch<{ messages: SupportMessage[]; user: ConversationUser }>(`/api/admin/support/conversations/${activeUserId}`);
      setMessages(res.messages);
      setConversationUser(res.user);
    } catch { /* ignore */ }
  };

  // Auto-refresh messages every 10 seconds when conversation is open
  useEffect(() => {
    if (!activeUserId) return;
    const iv = setInterval(refreshMessages, 10000);
    return () => clearInterval(iv);
  }, [activeUserId]);

  const handleSendReply = async () => {
    if (!activeUserId || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch(`/api/admin/support/conversations/${activeUserId}/reply`, {
        method: 'POST',
        body: { content: replyText.trim() },
      });
      setReplyText('');
      await refreshMessages();
      await loadConversations();
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* ignore */ }
    setSending(false);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 24 * 60 * 60 * 1000) {
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  // Active conversation view
  if (activeUserId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveUserId(null); loadConversations(); }} className="text-zinc-400 hover:text-white transition-colors text-sm">&larr; Назад</button>
          <h1 className="text-xl font-bold text-white">Чат с {conversationUser?.username || '...'}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* User info */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="flex items-center gap-3 mb-3">
                {conversationUser?.avatar ? (
                  <img src={conversationUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-lg">👤</div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">{conversationUser?.username || '—'}</p>
                  <p className="text-[10px] text-zinc-500">{conversationUser?.email || 'Без email'}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">UC баланс</span>
                  <span className="text-yellow-400 font-medium">{conversationUser?.ucBalance || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Рейтинг</span>
                  <span className="text-white">{conversationUser?.rating || 1000}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Регистрация</span>
                  <span className="text-zinc-400">{conversationUser?.createdAt ? new Date(conversationUser.createdAt).toLocaleDateString('ru-RU') : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex flex-col" style={{ maxHeight: '70vh' }}>
            <div className="px-4 py-3 border-b border-zinc-700/50 shrink-0">
              <h3 className="text-sm font-semibold text-white">💬 Сообщения <span className="text-zinc-500 font-normal">({messages.length})</span></h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {messagesLoading ? (
                <p className="text-center text-zinc-500 text-sm py-10">Загрузка...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-10">Нет сообщений</p>
              ) : (
                messages.map(m => {
                  if (m.isFromUser) {
                    return (
                      <div key={m.id} className="flex items-start gap-2 py-1">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {m.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="bg-zinc-700/40 rounded-lg rounded-tl-sm px-3 py-2 max-w-md">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-bold text-blue-400">{m.user.username}</span>
                            <span className="text-[10px] text-zinc-600">{formatTime(m.createdAt)}</span>
                          </div>
                          <p className="text-xs text-zinc-200">{m.content}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className="flex items-start gap-2 py-1 justify-end">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg rounded-tr-sm px-3 py-2 max-w-md">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-emerald-400">Поддержка</span>
                          <span className="text-[10px] text-zinc-600">{formatTime(m.createdAt)}</span>
                        </div>
                        <p className="text-xs text-zinc-200">{m.content}</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] shrink-0">🎧</div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply input */}
            <div className="px-3 py-2.5 border-t border-zinc-700/50 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                  placeholder="Ответить пользователю..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-600/50 transition-colors"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {sending ? '⏳...' : '📤 Ответить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Поддержка</h1>
          <p className="text-xs text-zinc-500">Обращения пользователей: {conversations.length}</p>
        </div>
        <button
          onClick={loadConversations}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-white transition-colors"
        >
          🔄 Обновить
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-zinc-500 text-sm">Загрузка...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎧</p>
          <h2 className="text-lg font-bold text-white mb-1">Нет обращений</h2>
          <p className="text-zinc-500 text-sm">Когда пользователи напишут в поддержку — их сообщения появятся здесь</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <button
              key={c.userId}
              onClick={() => openConversation(c.userId)}
              className="w-full bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 p-4 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                {c.user?.avatar ? (
                  <img src={c.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm shrink-0">
                    {c.user?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{c.user?.username || 'Неизвестный'}</span>
                      {c.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white">{c.unreadCount}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">{formatTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{c.lastMessage || 'Нет сообщений'}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Сообщений: {c.messageCount}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
