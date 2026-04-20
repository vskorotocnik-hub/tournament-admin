import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  inboxApi,
  type InboxItem,
  type AdminMessage,
  type AdminMessageVisibility,
  type AdminMessagePriority,
} from '../lib/inboxApi';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';

/**
 * Admin inbox — a single "what needs attention" dashboard.
 *
 * Two tabs:
 *   1. Все задачи — live feed from 14 pending sources (listings to approve,
 *      withdrawals, disputes, support, moderation flags, etc.). Clicking a
 *      row navigates to the originating page with `?highlight=ID` so the
 *      entity is scrolled into view and ring-highlighted.
 *   2. Для владельца — AdminMessage rows, filterable by status. Only users
 *      with role=ADMIN see OWNER_ONLY messages (enforced on the server).
 *
 * The "Новое сообщение" button opens a modal to escalate something manually
 * — e.g. a moderator types "шеф, этого юзера надо глянуть" and it lands in
 * the owner's tab.
 */

type Tab = 'feed' | 'messages';

const PRIORITY_STYLES: Record<InboxItem['priority'], string> = {
  urgent: 'border-red-500/50 bg-red-500/5',
  high: 'border-amber-500/40 bg-amber-500/5',
  normal: 'border-zinc-800 bg-zinc-900',
};

const PRIORITY_LABELS: Record<InboxItem['priority'], string> = {
  urgent: '🔥 СРОЧНО',
  high: '⚠️ Важно',
  normal: 'Обычное',
};

const PRIORITY_LABEL_CLS: Record<InboxItem['priority'], string> = {
  urgent: 'text-red-400',
  high: 'text-amber-400',
  normal: 'text-zinc-500',
};

const SECTION_LABELS: Record<string, string> = {
  '/listings': '🔑 Аренда',
  '/accounts': '🛒 Аккаунты',
  '/boost': '🚀 Буст',
  '/uc': '💎 Игровая валюта',
  '/finances': '💰 Финансы',
  '/quests': '📋 Задания',
  '/lessons': '📚 Обучение',
  '/support': '💬 Поддержка',
  '/moderation': '🚨 Модерация',
  '/clan': '🏰 Клан',
  '/tournaments': '🏆 Турниры',
  '/inbox': '📨 Владельцу',
};

export default function InboxPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'ADMIN';
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('feed');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // ── Feed ──
  const [items, setItems] = useState<InboxItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      setFeedLoading(true);
      const data = await inboxApi.feed();
      setItems(data.items);
    } catch (err: any) {
      toast.error(err.message ?? 'Не удалось загрузить инбокс');
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  const sectionCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const it of items) acc[it.section] = (acc[it.section] ?? 0) + 1;
    return acc;
  }, [items]);

  const visibleItems = useMemo(
    () => (sectionFilter === 'all' ? items : items.filter(i => i.section === sectionFilter)),
    [items, sectionFilter],
  );

  // ── Admin messages tab ──
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageStatus, setMessageStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('OPEN');
  const [composeOpen, setComposeOpen] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setMessagesLoading(true);
      const data = await inboxApi.listMessages(messageStatus);
      setMessages(data.messages);
    } catch (err: any) {
      toast.error(err.message ?? 'Не удалось загрузить сообщения');
    } finally {
      setMessagesLoading(false);
    }
  }, [messageStatus]);

  useEffect(() => {
    if (tab === 'messages') void loadMessages();
  }, [tab, loadMessages]);

  const handleItemClick = (item: InboxItem) => {
    // ADMIN_MESSAGE without a link stays on the inbox.
    if (item.type === 'ADMIN_MESSAGE' && (!item.link || item.link.startsWith('/inbox'))) {
      setTab('messages');
      return;
    }
    navigate(item.link);
  };

  const resolve = async (id: string) => {
    try {
      await inboxApi.resolve(id);
      toast.success('Закрыто');
      await Promise.all([loadFeed(), loadMessages()]);
    } catch (err: any) {
      toast.error(err.message ?? 'Не удалось закрыть');
    }
  };

  const dismiss = async (id: string) => {
    try {
      await inboxApi.dismiss(id);
      toast.success('Отклонено');
      await Promise.all([loadFeed(), loadMessages()]);
    } catch (err: any) {
      toast.error(err.message ?? 'Не удалось отклонить');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">📨 Срочные</h1>
          <p className="text-sm text-zinc-500">
            {feedLoading ? 'Загружаю…' : `${items.length} задач ожидают · ${items.filter(i => i.priority === 'urgent').length} срочных`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadFeed()}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg"
          >
            ↻ Обновить
          </button>
          <button
            onClick={() => setComposeOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
          >
            + Новое сообщение
          </button>
        </div>
      </div>

      {/* Top tabs: Feed vs AdminMessages */}
      <div className="flex gap-1 border-b border-zinc-800">
        <TabBtn active={tab === 'feed'} onClick={() => setTab('feed')}>
          Все задачи <Badge value={items.length} />
        </TabBtn>
        <TabBtn active={tab === 'messages'} onClick={() => setTab('messages')}>
          {isOwner ? '👑 Для владельца' : '📨 Личные сообщения'}
        </TabBtn>
      </div>

      {tab === 'feed' ? (
        <div className="space-y-3">
          {/* Section filter chips */}
          <div className="flex flex-wrap gap-2">
            <Chip active={sectionFilter === 'all'} onClick={() => setSectionFilter('all')}>
              Все <Badge value={items.length} />
            </Chip>
            {Object.entries(sectionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([section, count]) => (
                <Chip
                  key={section}
                  active={sectionFilter === section}
                  onClick={() => setSectionFilter(section)}
                >
                  {SECTION_LABELS[section] ?? section} <Badge value={count} />
                </Chip>
              ))}
          </div>

          {/* Feed */}
          {feedLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-sm">
              ✨ Всё разобрано! Задач, требующих внимания, нет.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left border rounded-xl p-4 transition-colors hover:bg-zinc-800/60 ${PRIORITY_STYLES[item.priority]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl w-10 text-center shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${PRIORITY_LABEL_CLS[item.priority]}`}>
                          {PRIORITY_LABELS[item.priority]}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {SECTION_LABELS[item.section] ?? item.section}
                        </span>
                      </div>
                      <p className="text-white font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                      {item.message?.body && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 whitespace-pre-wrap">{item.message.body}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {item.type === 'ADMIN_MESSAGE' && item.message && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); void resolve(item.message!.id); }}
                            className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-300 text-xs rounded-md hover:bg-emerald-600/30"
                          >
                            ✓ Закрыть
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); void dismiss(item.message!.id); }}
                            className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-700"
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                      <span className="text-zinc-600 text-lg">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <MessagesTab
          messages={messages}
          loading={messagesLoading}
          status={messageStatus}
          onStatusChange={setMessageStatus}
          onResolve={resolve}
          onDismiss={dismiss}
          isOwner={isOwner}
        />
      )}

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={() => { setComposeOpen(false); void loadFeed(); if (tab === 'messages') void loadMessages(); }}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
        active
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-zinc-700 text-zinc-200 text-[10px] font-bold leading-none">
      {value}
    </span>
  );
}

function MessagesTab({
  messages,
  loading,
  status,
  onStatusChange,
  onResolve,
  onDismiss,
  isOwner,
}: {
  messages: AdminMessage[];
  loading: boolean;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL';
  onStatusChange: (s: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL') => void;
  onResolve: (id: string) => void | Promise<void>;
  onDismiss: (id: string) => void | Promise<void>;
  isOwner: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip active={status === 'OPEN'} onClick={() => onStatusChange('OPEN')}>
          Открытые <Badge value={messages.filter(m => m.status === 'OPEN').length} />
        </Chip>
        <Chip active={status === 'RESOLVED'} onClick={() => onStatusChange('RESOLVED')}>Закрытые</Chip>
        <Chip active={status === 'DISMISSED'} onClick={() => onStatusChange('DISMISSED')}>Отклонённые</Chip>
        <Chip active={status === 'ALL'} onClick={() => onStatusChange('ALL')}>Все</Chip>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          {status === 'OPEN'
            ? (isOwner ? '✨ Открытых эскалаций нет' : '✨ Ничего не ждёт ответа')
            : 'Ничего не найдено'}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
            <div
              key={m.id}
              className={`border rounded-xl p-4 space-y-2 ${
                m.status === 'OPEN'
                  ? m.priority === 'URGENT' ? 'border-red-500/50 bg-red-500/5'
                    : m.priority === 'HIGH' ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-zinc-800 bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-900/50 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">
                  {m.visibility === 'OWNER_ONLY' ? '👑' : '📨'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      m.priority === 'URGENT' ? 'text-red-400' : m.priority === 'HIGH' ? 'text-amber-400' : 'text-zinc-500'
                    }`}>
                      {m.priority === 'URGENT' ? '🔥 СРОЧНО' : m.priority === 'HIGH' ? '⚠️ Важно' : 'Обычное'}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {m.visibility === 'OWNER_ONLY' ? 'Только владелец' : 'Все админы'}
                    </span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                      m.status === 'OPEN' ? 'bg-blue-500/20 text-blue-300'
                        : m.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {m.status === 'OPEN' ? 'Открыто' : m.status === 'RESOLVED' ? 'Закрыто' : 'Отклонено'}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-sm">{m.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    от @{m.createdBy?.username ?? 'система'} · {new Date(m.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                {m.status === 'OPEN' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => void onResolve(m.id)}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-500"
                    >
                      ✓ Закрыть
                    </button>
                    <button
                      onClick={() => void onDismiss(m.id)}
                      className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-700"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-zinc-300 whitespace-pre-wrap pl-11">{m.body}</p>

              {m.link && (
                <a
                  href={m.link}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 pl-11"
                >
                  → открыть связанное
                </a>
              )}

              {m.resolveNote && (
                <p className="text-xs text-zinc-500 pl-11 italic">
                  Решение: {m.resolveNote}
                  {m.resolvedBy && ` — @${m.resolvedBy.username ?? '—'}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposeModal({
  onClose,
  onSent,
  isOwner,
}: {
  onClose: () => void;
  onSent: () => void;
  isOwner: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<AdminMessageVisibility>('OWNER_ONLY');
  const [priority, setPriority] = useState<AdminMessagePriority>('NORMAL');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Заполните заголовок и текст');
      return;
    }
    try {
      setSaving(true);
      await inboxApi.create({ title: title.trim(), body: body.trim(), visibility, priority });
      toast.success('Сообщение отправлено');
      onSent();
    } catch (err: any) {
      toast.error(err.message ?? 'Не удалось отправить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">📝 Новое сообщение</h2>
        <p className="text-xs text-zinc-500">
          Используйте для эскалации ситуации владельцу или всем админам. Сообщение останется открытым пока кто-то не закроет его.
        </p>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Заголовок</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            placeholder="Например: Подозрительный вывод от @nick"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Текст</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            placeholder="Что случилось, что нужно сделать, какие ссылки посмотреть…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Видимость</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as AdminMessageVisibility)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            >
              <option value="OWNER_ONLY">👑 Только владелец</option>
              <option value="ALL_ADMINS">📨 Все админы</option>
            </select>
            <p className="text-[10px] text-zinc-600 mt-1">
              {visibility === 'OWNER_ONLY'
                ? 'Увидит только пользователь с ролью ADMIN — модераторы не увидят'
                : 'Видно всем админам и модераторам'}
            </p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Приоритет</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as AdminMessagePriority)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            >
              <option value="NORMAL">Обычный</option>
              <option value="HIGH">⚠️ Важный</option>
              <option value="URGENT">🔥 Срочный</option>
            </select>
          </div>
        </div>

        {!isOwner && visibility === 'OWNER_ONLY' && (
          <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
            Совет: модераторы создают сообщения для владельца, чтобы эскалировать сложные случаи. Владелец закроет после разбора.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? 'Отправка…' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}
