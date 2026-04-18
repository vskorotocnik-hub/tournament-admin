import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  moderationApi,
  type ModerationFlag,
  type ModerationStatus,
  type ThreadMessage,
} from '../lib/moderationApi';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';

/**
 * Moderation review queue.
 *
 * Left pane: list of flags. The default tab is PENDING — these are the
 * rows that actually need attention. Moderators click a flag and the
 * right pane loads the full conversation so they can judge intent
 * (e.g. someone casually mentioning Telegram vs. actively trying to
 * lure the other party off-platform).
 *
 * User messages are auto-translated to Russian on first render so the
 * moderator doesn't have to switch tabs for each language. A per-row
 * "📝 Original" toggle is always available for the Russian speakers
 * who want the source text.
 */

type TabKey = ModerationStatus | 'all';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'PENDING', label: 'Ожидают' },
  { key: 'RESOLVED', label: 'Закрытые' },
  { key: 'DISMISSED', label: 'Отклонённые' },
  { key: 'all', label: 'Все' },
];

const REASON_LABELS: Record<string, string> = {
  EXTERNAL_PLATFORM: 'Другая платформа',
  OFFSITE_CONTACT: 'Личный контакт',
  SUSPICIOUS_LINK: 'Ссылка',
  TOXICITY: 'Токсичность',
  OTHER: 'Другое',
};

const CHAT_TYPE_LABELS: Record<string, string> = {
  support: 'Поддержка',
  rental: 'Аренда',
  account: 'Аккаунт',
  boost: 'Буст',
  tournament: 'Турнир',
  classic: 'Классик',
  clan: 'Клан',
};

export default function ModerationPage() {
  const [tab, setTab] = useState<TabKey>('PENDING');
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModerationFlag | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await moderationApi.listFlags(tab);
      setFlags(r.flags);
      setPendingCount(r.pendingCount);
      // If the previously-selected flag dropped out of the visible list
      // (e.g. after resolve), clear the right pane.
      setSelected(prev => (prev && r.flags.some(f => f.id === prev.id) ? prev : null));
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) { setThread([]); return; }
    let cancelled = false;
    setThreadLoading(true);
    moderationApi.getThread(selected.id)
      .then(r => { if (!cancelled) setThread(r.thread); })
      .catch(e => { if (!cancelled) toast.error(e?.message || 'Ошибка загрузки чата'); })
      .finally(() => { if (!cancelled) setThreadLoading(false); });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const handleResolve = async (status: 'DISMISSED' | 'RESOLVED') => {
    if (!selected) return;
    const note = window.prompt(
      status === 'RESOLVED'
        ? 'Комментарий к решению (необязательно):'
        : 'Почему отклоняете? (необязательно)',
    );
    if (note === null) return; // cancelled
    try {
      await moderationApi.resolve(selected.id, status, note || undefined);
      toast.success(status === 'RESOLVED' ? 'Флаг закрыт' : 'Флаг отклонён');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">🚨 Модерация чатов</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Автоматически помеченные сообщения — упоминания других мессенджеров и соцсетей,
            личные контакты, подозрительные ссылки. Сообщения пользователей переведены на русский.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
            {pendingCount} ожидают
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === t.key
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-4">
        {/* LEFT: FLAG LIST */}
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {loading && <p className="text-zinc-500 text-sm">Загрузка…</p>}
          {!loading && flags.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">Пусто</p>
          )}
          {flags.map(f => (
            <button
              key={f.id}
              onClick={() => setSelected(f)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected?.id === f.id
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {CHAT_TYPE_LABELS[f.chatType] || f.chatType}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300">
                  {REASON_LABELS[f.reason] || f.reason}
                </span>
                {f.user.isBanned && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-900/40 text-red-200">
                    BANNED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {f.user.avatar && (
                  <img src={f.user.avatar} alt="" className="w-6 h-6 rounded-full" />
                )}
                <p className="text-sm text-white truncate">
                  {f.user.displayName || f.user.username}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{f.snippet}</p>
              <p className="text-[10px] text-zinc-600 mt-1">
                {new Date(f.createdAt).toLocaleString('ru-RU')}
              </p>
            </button>
          ))}
        </div>

        {/* RIGHT: THREAD */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col min-h-[500px] max-h-[calc(100vh-200px)]">
          {!selected && (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Выберите флаг слева
            </div>
          )}
          {selected && (
            <>
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {CHAT_TYPE_LABELS[selected.chatType] || selected.chatType}
                    {' · '}
                    {selected.user.displayName || selected.user.username}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {selected.details?.matches?.join(', ') || '—'}
                  </p>
                </div>
                {selected.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleResolve('DISMISSED')}
                      className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                    >
                      Отклонить
                    </button>
                    <button
                      onClick={() => handleResolve('RESOLVED')}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs hover:bg-emerald-500/30"
                    >
                      Закрыть
                    </button>
                  </div>
                )}
                {selected.status !== 'PENDING' && (
                  <span className={`text-[11px] px-2 py-0.5 rounded ${
                    selected.status === 'RESOLVED'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {selected.status === 'RESOLVED' ? 'Закрыт' : 'Отклонён'}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {threadLoading && <p className="text-zinc-500 text-sm">Загрузка чата…</p>}
                {!threadLoading && thread.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-8">
                    Нет сообщений
                  </p>
                )}
                {thread.map(msg => (
                  <ThreadBubble
                    key={msg.id}
                    msg={msg}
                    chatType={selected.chatType}
                    highlighted={msg.id === selected.messageId}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MESSAGE BUBBLE WITH TRANSLATION ──────────────────────────

function hasLatin(text: string) {
  return /[a-zA-Z]/.test(text);
}
function hasCyrillic(text: string) {
  return /[а-яёіїєА-ЯЁІЇЄ]/.test(text);
}

/**
 * Moderators work in Russian, so we auto-translate any non-Russian
 * message into Russian on mount. The hook fires exactly one network
 * call per (chatType, messageId) and stores the result in component
 * state; the toggle button flips between the translated text and the
 * original. Server-side results are cached too, so flipping across
 * many flags is cheap.
 */
function ThreadBubble({
  msg,
  chatType,
  highlighted,
}: {
  msg: ThreadMessage;
  chatType: string;
  highlighted: boolean;
}) {
  const needsTranslation = useMemo(
    () => msg.senderType === 'user' && hasLatin(msg.content) && !hasCyrillic(msg.content),
    [msg.senderType, msg.content],
  );

  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState<'translated' | 'original'>('translated');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!needsTranslation) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ text: string }>('/api/translate/message', {
      method: 'POST',
      body: { messageType: chatType, messageId: msg.id, text: msg.content, targetLang: 'ru' },
    })
      .then(r => { if (!cancelled) setTranslated(r.text); })
      .catch(() => { /* silent — fall back to original */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [needsTranslation, chatType, msg.id, msg.content]);

  const display = translated && showing === 'translated' ? translated : msg.content;

  const bubbleStyle = (() => {
    if (msg.senderType === 'system') return 'bg-zinc-800 text-zinc-400 italic';
    if (msg.senderType === 'admin') return 'bg-amber-500/10 border border-amber-500/30 text-amber-100';
    if (msg.senderType === 'support') return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-100';
    return 'bg-zinc-800 text-zinc-100';
  })();

  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${bubbleStyle} ${
        highlighted ? 'ring-2 ring-red-500/60' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-semibold text-zinc-400">
          {msg.user?.displayName || msg.user?.username || msg.senderType}
        </span>
        <span className="text-[10px] text-zinc-600">
          {new Date(msg.createdAt).toLocaleString('ru-RU')}
        </span>
        {highlighted && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
            ⚠ Флаг
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words">{display}</p>
      {(translated || loading) && (
        <button
          type="button"
          onClick={() => setShowing(s => (s === 'translated' ? 'original' : 'translated'))}
          disabled={loading || !translated}
          className="mt-1 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          {loading
            ? '… перевод'
            : showing === 'translated'
              ? '📝 Оригинал'
              : '🌐 Перевод'}
        </button>
      )}
    </div>
  );
}
