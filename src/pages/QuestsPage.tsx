import { useState, useEffect, useCallback } from 'react';
import * as questApi from '../lib/questApi';
import type { Quest, QuestDetail, QuestProgressItem, CreateQuestData } from '../lib/questApi';
import { toast } from '../lib/toast';
import { i18nStr } from '../lib/i18n';

const CONDITION_TYPES = [
  { value: 'PLAY_TOURNAMENT', label: '🎮 Сыграть в турнир (TDM 2v2/3v3/4v4)' },
  { value: 'WIN_TOURNAMENT', label: '🏆 Выиграть турнир (TDM 2v2/3v3/4v4)' },
  { value: 'SPEND_USD', label: '💸 Потратить $ на маркетплейсе (сумма в центах)' },
  { value: 'SPEND_UC', label: '💰 Потратить UC (сумма в центах)' },
  { value: 'BUY_MARKETPLACE', label: '🛒 Купить на маркетплейсе (аккаунт/буст)' },
  { value: 'SELL_MARKETPLACE', label: '📦 Продать на маркетплейсе (аккаунт/буст)' },
  { value: 'REFER_USERS', label: '👥 Пригласить друзей по реферальной ссылке' },
  { value: 'DEPOSIT_AMOUNT', label: '💎 Пополнить баланс (сумма в центах)' },
  { value: 'VISIT_LINK', label: '🔗 Перейти по ссылке (авто-засчитывается)' },
  { value: 'SOCIAL_SUBSCRIBE', label: '📱 Подписаться на канал (Telegram — авто / другие — ручная)' },
  { value: 'MANUAL', label: '✨ Ручная проверка админом' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Активно', color: 'bg-emerald-500/20 text-emerald-400' },
  PAUSED: { label: 'Пауза', color: 'bg-amber-500/20 text-amber-400' },
  ARCHIVED: { label: 'Архив', color: 'bg-zinc-500/20 text-zinc-400' },
};

const PROGRESS_STATUS: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'В процессе', color: 'text-blue-400' },
  PENDING_REVIEW: { label: 'На проверке', color: 'text-amber-400' },
  COMPLETED: { label: 'Выполнено', color: 'text-emerald-400' },
  REJECTED: { label: 'Отклонено', color: 'text-red-400' },
};

// ─── Main Page ──────────────────────────────────────────────

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editQuest, setEditQuest] = useState<Quest | null>(null);
  const [detail, setDetail] = useState<QuestDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await questApi.listQuests();
      setQuests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditQuest(null); setShowForm(true); };
  const openEdit = (q: Quest) => { setEditQuest(q); setShowForm(true); };
  const openDetail = async (q: Quest) => {
    try {
      const d = await questApi.getQuest(q.id);
      setDetail(d);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDuplicate = async (q: Quest) => {
    try {
      await questApi.duplicateQuest(q.id);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (q: Quest) => {
    if (!confirm(`Удалить задание "${i18nStr(q.title)}"?`)) return;
    try {
      await questApi.deleteQuest(q.id);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleStatus = async (q: Quest) => {
    const next = q.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await questApi.updateQuest(q.id, { status: next });
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Задания</h1>
          <p className="text-sm text-zinc-500">{quests.length} заданий</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          + Создать задание
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Quest list */}
      <div className="space-y-2">
        {quests.map(q => {
          const st = STATUS_LABELS[q.status] || STATUS_LABELS.ACTIVE;
          return (
            <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
              <div className="text-2xl w-10 text-center">{q.icon || '📋'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-medium text-sm truncate">{i18nStr(q.title)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{i18nStr(q.description)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {q.isDaily && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">⏰ Ежедневное</span>}
                </div>
                <div className="flex gap-3 mt-1 text-[11px] text-zinc-600">
                  <span>{CONDITION_TYPES.find(c => c.value === q.conditionType)?.label || q.conditionType}</span>
                  <span>·</span>
                  <span className="text-emerald-500">+{q.rewardType === 'UC' ? `${q.rewardAmount} UC` : `$${q.rewardAmount}`}</span>
                  <span>·</span>
                  <span>{q.totalParticipants} уч.</span>
                  <span>·</span>
                  <span className="text-emerald-600">{q.completedCount} выпол.</span>
                  {q.totalRewardGiven > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-700">{q.rewardType === 'UC' ? `${q.totalRewardGiven} UC` : `$${q.totalRewardGiven.toFixed(2)}`} выдано</span>
                    </>
                  )}
                  {q.pendingReviewCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-amber-500 font-medium">{q.pendingReviewCount} ожид.</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {q.pendingReviewCount > 0 && (
                  <button onClick={() => openDetail(q)} className="px-2.5 py-1.5 bg-amber-500/20 text-amber-400 text-xs rounded-md hover:bg-amber-500/30 transition-colors">
                    Проверить
                  </button>
                )}
                <button onClick={() => openDetail(q)} className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-700 transition-colors">
                  Детали
                </button>
                <button onClick={() => handleDuplicate(q)} className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-700 transition-colors" title="Дублировать">
                  ⎘
                </button>
                <button onClick={() => openEdit(q)} className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-700 transition-colors">
                  Ред.
                </button>
                <button onClick={() => handleToggleStatus(q)} className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-md hover:bg-zinc-700 transition-colors">
                  {q.status === 'ACTIVE' ? '⏸' : '▶'}
                </button>
                <button onClick={() => handleDelete(q)} className="px-2.5 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-md hover:bg-red-500/20 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {quests.length === 0 && (
          <div className="text-center py-12 text-zinc-600">Заданий пока нет. Нажмите «Создать задание».</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <QuestFormModal
          quest={editQuest}
          onClose={() => { setShowForm(false); setEditQuest(null); }}
          onSaved={() => { setShowForm(false); setEditQuest(null); load(); }}
        />
      )}

      {/* Detail / Moderation Modal */}
      {detail && (
        <QuestDetailModal
          quest={detail}
          onClose={() => setDetail(null)}
          onChanged={() => { load(); questApi.getQuest(detail.id).then(setDetail).catch(() => setDetail(null)); }}
        />
      )}
    </div>
  );
}

// ─── Create / Edit Form Modal ───────────────────────────────

function QuestFormModal({ quest, onClose, onSaved }: { quest: Quest | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateQuestData>({
    title: i18nStr(quest?.title),
    description: i18nStr(quest?.description),
    icon: quest?.icon || '',
    conditionType: quest?.conditionType || 'PLAY_TOURNAMENT',
    conditionParams: quest?.conditionParams || {},
    rewardType: quest?.rewardType || 'USD',
    rewardAmount: quest?.rewardAmount || 1,
    targetValue: quest?.targetValue || 1,
    maxParticipants: quest?.maxParticipants || undefined,
    sortOrder: quest?.sortOrder || 0,
    startsAt: quest?.startsAt || null,
    expiresAt: quest?.expiresAt || null,
  });
  const [paramUrl, setParamUrl] = useState((quest?.conditionParams as any)?.url || '');
  const [paramPlatform, setParamPlatform] = useState((quest?.conditionParams as any)?.platform || 'telegram');
  const [paramChatId, setParamChatId] = useState((quest?.conditionParams as any)?.chatId || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const isDaily = form.isDaily ?? false;

  const handleSubmit = async () => {
    if (!form.title.trim()) { setErr('Укажите название'); return; }
    setSaving(true);
    setErr('');

    const params: Record<string, any> = { ...form.conditionParams };
    if (form.conditionType === 'VISIT_LINK') params.url = paramUrl;
    if (form.conditionType === 'SOCIAL_SUBSCRIBE') {
      params.url = paramUrl;
      params.platform = paramPlatform;
      if (paramPlatform === 'telegram' && paramChatId) params.chatId = paramChatId;
    }

    const data: CreateQuestData = { ...form, conditionParams: params };

    try {
      if (quest) {
        await questApi.updateQuest(quest.id, data);
      } else {
        await questApi.createQuest(data);
      }
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">{quest ? 'Редактировать задание' : 'Новое задание'}</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Название</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Сыграй 3 турнира" />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Описание</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" rows={2} placeholder="Участвуй в любых турнирах" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Иконка (emoji)</label>
              <input value={form.icon || ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" placeholder="🎮" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Порядок сортировки</label>
              <input type="number" value={form.sortOrder || 0} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Тип условия</label>
            <select value={form.conditionType} onChange={e => setForm(f => ({ ...f, conditionType: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm">
              {CONDITION_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          {(form.conditionType === 'VISIT_LINK' || form.conditionType === 'SOCIAL_SUBSCRIBE') && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">URL ссылки</label>
              <input value={paramUrl} onChange={e => setParamUrl(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" placeholder="https://t.me/channel" />
            </div>
          )}

          {form.conditionType === 'SOCIAL_SUBSCRIBE' && (
            <>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Платформа</label>
                <select value={paramPlatform} onChange={e => setParamPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm">
                  <option value="telegram">Telegram (авто-проверка ✅)</option>
                  <option value="youtube">YouTube (ручная проверка)</option>
                  <option value="instagram">Instagram (ручная проверка)</option>
                  <option value="tiktok">TikTok (ручная проверка)</option>
                  <option value="twitter">Twitter / X (ручная проверка)</option>
                </select>
              </div>
              {paramPlatform === 'telegram' && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Chat ID канала (для авто-проверки)</label>
                  <input value={paramChatId} onChange={e => setParamChatId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" placeholder="@channel_username или -100xxxxxxxxxx" />
                  <p className="text-[10px] text-zinc-600 mt-0.5">Бот должен быть админом канала. Укажите @username или числовой ID</p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Цель (кол-во)</label>
            <input type="number" value={form.targetValue || 1} onChange={e => setForm(f => ({ ...f, targetValue: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" min={1} />
            {['SPEND_USD', 'SPEND_UC', 'DEPOSIT_AMOUNT'].includes(form.conditionType) && (
              <p className="text-[10px] text-zinc-600 mt-0.5">В центах (×100). $50 = 5000</p>
            )}
          </div>

          {/* Reward section */}
          <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">🎁 Награда за выполнение</p>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Тип награды</label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, rewardType: 'USD' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.rewardType === 'USD'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}>
                  <span>💵</span>
                  <span>Реальные деньги ($)</span>
                </button>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, rewardType: 'UC' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.rewardType === 'UC'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/30'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}>
                  <span>💎</span>
                  <span>UC (игровая валюта)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Сумма награды</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm select-none pointer-events-none">
                  {form.rewardType === 'USD' ? '$' : '💎'}
                </span>
                <input
                  type="number"
                  value={form.rewardAmount}
                  onChange={e => setForm(f => ({ ...f, rewardAmount: Number(e.target.value) }))}
                  className="w-full pl-8 pr-16 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-zinc-500 outline-none"
                  min={0}
                  step={form.rewardType === 'USD' ? 0.01 : 1}
                  placeholder={form.rewardType === 'USD' ? '5.00' : '100'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-medium select-none pointer-events-none">
                  {form.rewardType === 'USD' ? 'USD' : 'UC'}
                </span>
              </div>
            </div>

            {form.rewardAmount > 0 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                form.rewardType === 'USD' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'
              }`}>
                <span>✓</span>
                <span>Пользователь получит: {form.rewardType === 'USD' ? `$${Number(form.rewardAmount).toFixed(2)}` : `${form.rewardAmount} UC`}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Макс. участников (пусто = без лимита)</label>
              <input type="number" value={form.maxParticipants || ''} onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" min={1} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Дедлайн (пусто = бессрочно)</label>
              <input type="datetime-local" value={form.expiresAt ? form.expiresAt.slice(0, 16) : ''} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForm(f => ({ ...f, isDaily: !isDaily }))}
              className={`w-10 h-5 rounded-full transition-colors ${isDaily ? 'bg-blue-500' : 'bg-zinc-700'} relative`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDaily ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-zinc-300">⏰ Ежедневное задание (сбрасывается каждые 24ч)</span>
          </label>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 transition-colors">Отмена</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Сохраняем...' : quest ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail / Moderation Modal ──────────────────────────────

function QuestDetailModal({ quest, onClose, onChanged }: { quest: QuestDetail; onClose: () => void; onChanged: () => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const pending = quest.progress.filter(p => p.status === 'PENDING_REVIEW');
  const others = quest.progress.filter(p => p.status !== 'PENDING_REVIEW');

  const handleApprove = async (p: QuestProgressItem) => {
    setActionLoading(p.id);
    try {
      await questApi.approveProgress(p.id);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (p: QuestProgressItem) => {
    setActionLoading(p.id);
    try {
      await questApi.rejectProgress(p.id, rejectNote || undefined);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
      setRejectNote('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{quest.icon || '📋'}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{i18nStr(quest.title)}</h2>
            <p className="text-xs text-zinc-500">{i18nStr(quest.description)}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-white font-bold">{quest.progress.length}</p>
            <p className="text-[10px] text-zinc-500">Участников</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-emerald-400 font-bold">{quest.progress.filter(p => p.status === 'COMPLETED').length}</p>
            <p className="text-[10px] text-zinc-500">Выполнили</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-amber-400 font-bold">{pending.length}</p>
            <p className="text-[10px] text-zinc-500">Ожидают</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-emerald-400 font-bold">{quest.rewardType === 'UC' ? `${quest.rewardAmount} UC` : `$${quest.rewardAmount}`}</p>
            <p className="text-[10px] text-zinc-500">Награда</p>
          </div>
        </div>

        {/* Pending review — top priority */}
        {pending.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-2">⏳ Ожидают проверки ({pending.length})</h3>
            <div className="space-y-2">
              {pending.map(p => (
                <div key={p.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white font-bold shrink-0">
                    {(p.user.displayName || p.user.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{p.user.displayName || p.user.username}</p>
                    <p className="text-[10px] text-zinc-500">@{p.user.username} · {new Date(p.updatedAt).toLocaleString('ru')}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleApprove(p)} disabled={actionLoading === p.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                      {actionLoading === p.id ? '...' : '✓ Одобрить'}
                    </button>
                    <button onClick={() => handleReject(p)} disabled={actionLoading === p.id}
                      className="px-3 py-1.5 bg-red-600/20 text-red-400 text-xs rounded-md hover:bg-red-600/30 disabled:opacity-50 transition-colors">
                      {actionLoading === p.id ? '...' : '✕ Отклонить'}
                    </button>
                  </div>
                </div>
              ))}
              <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                placeholder="Причина отклонения (необязательно)"
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs mt-1" />
            </div>
          </div>
        )}

        {/* All progress */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Все участники ({quest.progress.length})</h3>
          {quest.progress.length === 0 ? (
            <p className="text-zinc-600 text-sm">Пока никто не начал</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {[...pending, ...others].map(p => {
                const ps = PROGRESS_STATUS[p.status] || PROGRESS_STATUS.IN_PROGRESS;
                return (
                  <div key={p.id} className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                      {(p.user.displayName || p.user.username)[0].toUpperCase()}
                    </div>
                    <span className="text-white flex-1 truncate">{p.user.displayName || p.user.username}</span>
                    <span className="text-zinc-600">{p.currentValue}/{quest.targetValue}</span>
                    <span className={`${ps.color} font-medium`}>{ps.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 transition-colors">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
