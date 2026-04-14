import { useState, useEffect } from 'react';
import { submissionsApi, type AdminSubmission } from '../lib/api';

const STATUS_TABS = [
  { key: '', label: 'Все' },
  { key: 'PENDING', label: '⏳ На проверке' },
  { key: 'APPROVED', label: '✓ Принятые' },
  { key: 'REJECTED', label: '✗ Отклонённые' },
];

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [error, setError] = useState('');

  const [reviewModal, setReviewModal] = useState<{ sub: AdminSubmission; action: 'approve' | 'reject' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (status: string) => {
    setLoading(true);
    setError('');
    try {
      const { submissions: data } = await submissionsApi.getAll(status || undefined);
      setSubmissions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(activeTab); }, [activeTab]);

  const openApprove = (sub: AdminSubmission) => {
    setReviewModal({ sub, action: 'approve' });
    setReviewNote('');
  };

  const openReject = (sub: AdminSubmission) => {
    setReviewModal({ sub, action: 'reject' });
    setReviewNote('');
  };

  const confirmReview = async () => {
    if (!reviewModal) return;
    if (reviewModal.action === 'reject' && !reviewNote.trim()) return;
    setSaving(true);
    try {
      if (reviewModal.action === 'approve') {
        await submissionsApi.approve(reviewModal.sub.id, reviewNote.trim() || undefined);
      } else {
        await submissionsApi.reject(reviewModal.sub.id, reviewNote.trim());
      }
      setReviewModal(null);
      load(activeTab);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'PENDING') return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30';
    if (status === 'APPROVED') return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30';
    return 'bg-red-400/10 text-red-400 border-red-400/30';
  };
  const statusLabel = (s: string) => s === 'PENDING' ? 'На проверке' : s === 'APPROVED' ? 'Принято' : 'Отклонено';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📋 Модерация уроков</h1>
        <p className="text-zinc-400 text-sm mt-1">Видео-доказательства прохождения от пользователей</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-zinc-400">Нет заявок</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start gap-4">
                {/* User avatar */}
                <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0">
                  {sub.user.avatar
                    ? <img src={sub.user.avatar} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">
                        {(sub.user.displayName ?? sub.user.username)[0].toUpperCase()}
                      </div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {sub.user.displayName ?? sub.user.username}
                        <span className="text-zinc-500 font-normal ml-1">@{sub.user.username}</span>
                      </p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        📚 {sub.lesson.category.title} → Урок {sub.lesson.sortOrder + 1}: {sub.lesson.title}
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        Отправлено: {new Date(sub.submittedAt).toLocaleString('ru-RU')}
                        {sub.reviewedAt && ` · Проверено: ${new Date(sub.reviewedAt).toLocaleString('ru-RU')}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0 ${statusBadge(sub.status)}`}>
                      {statusLabel(sub.status)}
                    </span>
                  </div>

                  {/* Video link */}
                  <div className="mt-2 flex items-center gap-2">
                    <a href={sub.videoUrl} target="_blank" rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm underline truncate max-w-xs">
                      🎬 {sub.videoUrl}
                    </a>
                  </div>

                  {/* Review note if rejected */}
                  {sub.reviewNote && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-xs">Причина: {sub.reviewNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {sub.status === 'PENDING' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openApprove(sub)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all">
                        ✓ Принять
                      </button>
                      <button onClick={() => openReject(sub)}
                        className="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all">
                        ✗ Отклонить
                      </button>
                    </div>
                  )}
                  {sub.status === 'REJECTED' && (
                    <button onClick={() => openApprove(sub)}
                      className="mt-2 px-4 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all">
                      ✓ Принять повторно
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReviewModal(null)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {reviewModal.action === 'approve' ? '✓ Принять видео' : '✗ Отклонить видео'}
            </h3>
            <div className="p-3 bg-zinc-800 rounded-xl">
              <p className="text-zinc-400 text-xs">Пользователь</p>
              <p className="text-white text-sm font-medium">{reviewModal.sub.user.displayName ?? reviewModal.sub.user.username}</p>
              <p className="text-zinc-400 text-xs mt-1">Урок</p>
              <p className="text-white text-sm font-medium">{reviewModal.sub.lesson.title}</p>
              <a href={reviewModal.sub.videoUrl} target="_blank" rel="noreferrer"
                className="text-purple-400 text-xs underline mt-1 block truncate">
                {reviewModal.sub.videoUrl}
              </a>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">
                {reviewModal.action === 'reject' ? 'Причина отклонения *' : 'Комментарий (необязательно)'}
              </label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                placeholder={reviewModal.action === 'reject'
                  ? 'Например: Видео слишком короткое, не показан финал урока...'
                  : 'Отличная работа! (необязательно)'}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm resize-none focus:border-purple-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium">
                Отмена
              </button>
              <button
                onClick={confirmReview}
                disabled={saving || (reviewModal.action === 'reject' && !reviewNote.trim())}
                className={`flex-1 py-2.5 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all ${
                  reviewModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {saving ? 'Сохранение...' : reviewModal.action === 'approve' ? 'Принять' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
