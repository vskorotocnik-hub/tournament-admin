import { useState, useEffect, useRef } from 'react';
import {
  lessonsAdminApi,
  trainingSettingsApi,
  trainingStatsApi,
  submissionsApi,
  type AdminLessonCategory,
  type AdminLesson,
  type TrainingSettings,
  type TrainingStats,
  type AdminSubmission,
} from '../lib/api';

function formatDuration(sec: number | null): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SUB_TABS = [
  { key: '', label: 'Все' },
  { key: 'PENDING', label: '⏳ На проверке' },
  { key: 'APPROVED', label: '✓ Принятые' },
  { key: 'REJECTED', label: '✗ Отклонённые' },
];

export default function LessonsPage() {
  // ── Page tab ──
  const [pageTab, setPageTab] = useState<'lessons' | 'moderation'>('lessons');

  // ── Moderation state ──
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [subTab, setSubTab] = useState('PENDING');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const [reviewModal, setReviewModal] = useState<{ sub: AdminSubmission; action: 'approve' | 'reject' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const loadSubmissions = async (status: string) => {
    setSubLoading(true); setSubError('');
    try {
      const { submissions: data } = await submissionsApi.getAll(status || undefined);
      setSubmissions(data);
    } catch (e: any) { setSubError(e.message); }
    finally { setSubLoading(false); }
  };

  useEffect(() => { if (pageTab === 'moderation') loadSubmissions(subTab); }, [pageTab, subTab]);

  const confirmReview = async () => {
    if (!reviewModal) return;
    if (reviewModal.action === 'reject' && !reviewNote.trim()) return;
    setReviewSaving(true);
    try {
      if (reviewModal.action === 'approve') await submissionsApi.approve(reviewModal.sub.id, reviewNote.trim() || undefined);
      else await submissionsApi.reject(reviewModal.sub.id, reviewNote.trim());
      setReviewModal(null);
      loadSubmissions(subTab);
    } catch (e: any) { setSubError(e.message); }
    finally { setReviewSaving(false); }
  };

  const subStatusBadge = (s: string) => s === 'PENDING' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' : s === 'APPROVED' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' : 'bg-red-400/10 text-red-400 border-red-400/30';
  const subStatusLabel = (s: string) => s === 'PENDING' ? 'На проверке' : s === 'APPROVED' ? 'Принято' : 'Отклонено';

  // ── Revenue stats ──
  const [stats, setStats] = useState<TrainingStats | null>(null);

  // ── Lessons state ──
  const [categories, setCategories] = useState<AdminLessonCategory[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [error, setError] = useState('');

  // Category modal
  const [catModal, setCatModal] = useState<{ open: boolean; editing: AdminLessonCategory | null }>({ open: false, editing: null });
  const [catTitle, setCatTitle] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catOrder, setCatOrder] = useState('0');
  const [catSaving, setCatSaving] = useState(false);

  // Lesson modal
  const [lessonModal, setLessonModal] = useState<{ open: boolean; editing: AdminLesson | null }>({ open: false, editing: null });
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonOrder, setLessonOrder] = useState('0');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonThumbnail, setLessonThumbnail] = useState('');
  const [lessonCatId, setLessonCatId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'cat' | 'lesson'; id: string; title: string } | null>(null);

  // Training settings
  const [settings, setSettings] = useState<TrainingSettings | null>(null);
  const [settingsPrice, setSettingsPrice] = useState('');
  const [settingsCurrency, setSettingsCurrency] = useState('$');
  const [settingsRewards, setSettingsRewards] = useState<string[]>([]);
  const [newReward, setNewReward] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadSettings = async () => {
    try {
      const s = await trainingSettingsApi.get();
      setSettings(s);
      setSettingsPrice(String(s.price));
      setSettingsCurrency(s.currency);
      setSettingsRewards(s.rewards);
    } catch {}
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const s = await trainingSettingsApi.update({
        price: Number(settingsPrice) || 10,
        currency: settingsCurrency,
        rewards: settingsRewards,
      });
      setSettings(s);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await lessonsAdminApi.getCategories();
      setCategories(cats);
      if (cats.length > 0 && !activeCatId) {
        setActiveCatId(cats[0].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (catId: string) => {
    setLessonsLoading(true);
    try {
      const data = await lessonsAdminApi.getLessons(catId);
      setLessons(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLessonsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadSettings();
    trainingStatsApi.get().then(setStats).catch(() => {});
  }, []);
  useEffect(() => { if (activeCatId) loadLessons(activeCatId); }, [activeCatId]);

  // ── Category modal handlers ──
  const openNewCat = () => {
    setCatTitle(''); setCatIcon(''); setCatOrder(String(categories.length));
    setCatModal({ open: true, editing: null });
  };
  const openEditCat = (cat: AdminLessonCategory) => {
    setCatTitle(cat.title); setCatIcon(cat.icon ?? ''); setCatOrder(String(cat.sortOrder));
    setCatModal({ open: true, editing: cat });
  };
  const saveCat = async () => {
    if (!catTitle.trim()) return;
    setCatSaving(true);
    try {
      if (catModal.editing) {
        await lessonsAdminApi.updateCategory(catModal.editing.id, { title: catTitle.trim(), icon: catIcon, sortOrder: Number(catOrder) });
      } else {
        const cat = await lessonsAdminApi.createCategory({ title: catTitle.trim(), icon: catIcon || undefined, sortOrder: Number(catOrder) });
        setActiveCatId(cat.id);
      }
      setCatModal({ open: false, editing: null });
      await loadCategories();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCatSaving(false);
    }
  };

  const toggleCatActive = async (cat: AdminLessonCategory) => {
    try {
      await lessonsAdminApi.updateCategory(cat.id, { isActive: !cat.isActive });
      await loadCategories();
    } catch (e: any) { setError(e.message); }
  };

  // ── Lesson modal handlers ──
  const openNewLesson = () => {
    setLessonTitle(''); setLessonDesc(''); setLessonOrder(String(lessons.length));
    setLessonDuration(''); setLessonThumbnail(''); setVideoFile(null);
    setLessonCatId(activeCatId ?? categories[0]?.id ?? '');
    setLessonModal({ open: true, editing: null });
  };
  const openEditLesson = (lesson: AdminLesson) => {
    setLessonTitle(lesson.title); setLessonDesc(lesson.description ?? '');
    setLessonOrder(String(lesson.sortOrder));
    setLessonDuration(lesson.duration ? String(lesson.duration) : '');
    setLessonThumbnail(lesson.thumbnailUrl ?? ''); setVideoFile(null);
    setLessonCatId(lesson.categoryId);
    setLessonModal({ open: true, editing: lesson });
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim() || !lessonCatId) return;
    if (!lessonModal.editing && !videoFile) { setError('Выберите видеофайл'); return; }
    setUploading(true);
    setUploadProgress('Загрузка видео на сервер...');
    try {
      if (lessonModal.editing) {
        await lessonsAdminApi.updateLesson(lessonModal.editing.id, {
          categoryId: lessonCatId,
          title: lessonTitle.trim(),
          description: lessonDesc.trim() || undefined,
          thumbnailUrl: lessonThumbnail.trim() || undefined,
          duration: lessonDuration ? Number(lessonDuration) : undefined,
          sortOrder: Number(lessonOrder) || 0,
          ...(videoFile && { videoFile }),
        });
      } else {
        await lessonsAdminApi.createLesson({
          categoryId: lessonCatId,
          title: lessonTitle.trim(),
          description: lessonDesc.trim() || undefined,
          thumbnailUrl: lessonThumbnail.trim() || undefined,
          duration: lessonDuration ? Number(lessonDuration) : undefined,
          sortOrder: Number(lessonOrder) || 0,
          videoFile: videoFile!,
        });
      }
      setLessonModal({ open: false, editing: null });
      setUploadProgress('');
      if (activeCatId) await loadLessons(activeCatId);
      await loadCategories();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const toggleLessonActive = async (lesson: AdminLesson) => {
    try {
      await lessonsAdminApi.updateLesson(lesson.id, { isActive: !lesson.isActive });
      if (activeCatId) await loadLessons(activeCatId);
    } catch (e: any) { setError(e.message); }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'cat') {
        await lessonsAdminApi.deleteCategory(deleteConfirm.id);
        if (activeCatId === deleteConfirm.id) setActiveCatId(null);
        await loadCategories();
        setLessons([]);
      } else {
        await lessonsAdminApi.deleteLesson(deleteConfirm.id);
        if (activeCatId) await loadLessons(activeCatId);
        await loadCategories();
      }
    } catch (e: any) { setError(e.message); }
    setDeleteConfirm(null);
  };

  const activeCat = categories.find(c => c.id === activeCatId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">📚 Обучение</h1>
          <p className="text-zinc-400 text-sm mt-1">Управление видеоуроками и категориями</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Page tab switcher */}
          <div className="flex bg-zinc-800 rounded-xl p-1 gap-1">
            <button onClick={() => setPageTab('lessons')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pageTab === 'lessons' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}>
              📚 Уроки
            </button>
            <button onClick={() => setPageTab('moderation')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pageTab === 'moderation' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}>
              📋 Модерация
            </button>
          </div>
          {pageTab === 'lessons' && (
            <button onClick={openNewCat}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-all">
              <span>+</span> Новая категория
            </button>
          )}
        </div>
      </div>

      {/* Revenue stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-zinc-500 text-xs">Оплатили курс</p>
            <p className="text-white font-bold text-xl mt-0.5">{stats.paidCount}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-zinc-500 text-xs">Цена курса</p>
            <p className="text-white font-bold text-xl mt-0.5">{stats.currency}{stats.price}</p>
          </div>
          <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-4 py-3">
            <p className="text-emerald-400 text-xs">Выручка</p>
            <p className="text-emerald-300 font-bold text-xl mt-0.5">{stats.currency}{stats.totalRevenue}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* ══ MODERATION TAB ══ */}
      {pageTab === 'moderation' && (
        <>
          {subError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">{subError}</p>
              <button onClick={() => setSubError('')} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {SUB_TABS.map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  subTab === t.key ? 'bg-purple-600 text-white border-purple-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}>{t.label}</button>
            ))}
          </div>
          {subLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : submissions.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">💭</p><p className="text-zinc-400">Нет заявок</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div key={sub.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0">
                      {sub.user.avatar
                        ? <img src={sub.user.avatar} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">{(sub.user.displayName ?? sub.user.username)[0].toUpperCase()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-white font-semibold text-sm">{sub.user.displayName ?? sub.user.username}<span className="text-zinc-500 font-normal ml-1">@{sub.user.username}</span></p>
                          <p className="text-zinc-400 text-xs mt-0.5">📚 {sub.lesson.category.title} → Урок {sub.lesson.sortOrder + 1}: {sub.lesson.title}</p>
                          <p className="text-zinc-600 text-xs mt-0.5">Отправлено: {new Date(sub.submittedAt).toLocaleString('ru-RU')}{sub.reviewedAt && ` · Проверено: ${new Date(sub.reviewedAt).toLocaleString('ru-RU')}`}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0 ${subStatusBadge(sub.status)}`}>{subStatusLabel(sub.status)}</span>
                      </div>
                      <div className="mt-2">
                        <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline truncate max-w-xs block">🎦 {sub.videoUrl}</a>
                      </div>
                      {sub.reviewNote && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-red-400 text-xs">Причина: {sub.reviewNote}</p>
                        </div>
                      )}
                      {sub.status === 'PENDING' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => { setReviewModal({ sub, action: 'approve' }); setReviewNote(''); }} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all">✓ Принять</button>
                          <button onClick={() => { setReviewModal({ sub, action: 'reject' }); setReviewNote(''); }} className="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all">✗ Отклонить</button>
                        </div>
                      )}
                      {sub.status === 'REJECTED' && (
                        <button onClick={() => { setReviewModal({ sub, action: 'approve' }); setReviewNote(''); }} className="mt-2 px-4 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all">✓ Принять повторно</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {reviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReviewModal(null)} />
              <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">{reviewModal.action === 'approve' ? '✓ Принять видео' : '✗ Отклонить видео'}</h3>
                <div className="p-3 bg-zinc-800 rounded-xl">
                  <p className="text-zinc-400 text-xs">Пользователь</p>
                  <p className="text-white text-sm font-medium">{reviewModal.sub.user.displayName ?? reviewModal.sub.user.username}</p>
                  <p className="text-zinc-400 text-xs mt-1">Урок</p>
                  <p className="text-white text-sm font-medium">{reviewModal.sub.lesson.title}</p>
                  <a href={reviewModal.sub.videoUrl} target="_blank" rel="noreferrer" className="text-purple-400 text-xs underline mt-1 block truncate">{reviewModal.sub.videoUrl}</a>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">{reviewModal.action === 'reject' ? 'Причина отклонения *' : 'Комментарий (необязательно)'}</label>
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                    placeholder={reviewModal.action === 'reject' ? 'Например: Видео слишком короткое...' : 'Отличная работа! (необязательно)'}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm resize-none focus:border-purple-500 outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setReviewModal(null)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium">Отмена</button>
                  <button onClick={confirmReview} disabled={reviewSaving || (reviewModal.action === 'reject' && !reviewNote.trim())}
                    className={`flex-1 py-2.5 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all ${
                      reviewModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                    }`}>{reviewSaving ? 'Сохранение...' : reviewModal.action === 'approve' ? 'Принять' : 'Отклонить'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {pageTab === 'lessons' && (
        loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-6">
          {/* LEFT: Categories */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Категории</p>
            {categories.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-zinc-500 text-sm">Нет категорий</p>
              </div>
            ) : categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                className={`bg-zinc-900 border rounded-xl p-3 cursor-pointer transition-all ${
                  activeCatId === cat.id ? 'border-purple-500/60 ring-1 ring-purple-500/30' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {cat.icon && <span className="text-lg shrink-0">{cat.icon}</span>}
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${cat.isActive ? 'text-white' : 'text-zinc-500'}`}>{cat.title}</p>
                      <p className="text-zinc-600 text-xs">{cat._count.lessons} уроков · #{cat.sortOrder}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEditCat(cat); }}
                      className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-zinc-800"
                    >✏️</button>
                    <button
                      onClick={e => { e.stopPropagation(); toggleCatActive(cat); }}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${cat.isActive ? 'text-emerald-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-800'}`}
                    >{cat.isActive ? '✓' : '○'}</button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'cat', id: cat.id, title: cat.title }); }}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
                    >🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: Lessons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {activeCat ? `${activeCat.icon ?? ''} ${activeCat.title} · ${lessons.length} уроков` : 'Выберите категорию'}
              </p>
              {activeCatId && (
                <button
                  onClick={openNewLesson}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-all"
                >
                  <span>+</span> Добавить урок
                </button>
              )}
            </div>

            {lessonsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !activeCatId ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <p className="text-zinc-500">Выберите категорию слева</p>
              </div>
            ) : lessons.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-zinc-400 font-medium">Уроков нет</p>
                <p className="text-zinc-600 text-sm mt-1">Нажмите «Добавить урок» чтобы загрузить первое видео</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, idx) => (
                  <div key={lesson.id} className={`bg-zinc-900 border rounded-xl p-4 flex items-start gap-4 transition-all ${lesson.isActive ? 'border-zinc-800' : 'border-zinc-800 opacity-60'}`}>
                    {/* Thumbnail / index */}
                    <div className="w-20 h-14 rounded-lg bg-zinc-800 overflow-hidden shrink-0 relative">
                      {lesson.thumbnailUrl ? (
                        <img src={lesson.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-zinc-500 font-bold text-sm">{idx + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{lesson.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-zinc-500 text-xs">#{lesson.sortOrder}</span>
                            {lesson.duration && <span className="text-zinc-500 text-xs">⏱ {formatDuration(lesson.duration)}</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${lesson.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                              {lesson.isActive ? 'Активен' : 'Скрыт'}
                            </span>
                          </div>
                          {lesson.description && <p className="text-zinc-500 text-xs mt-1 truncate">{lesson.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditLesson(lesson)} className="p-1.5 text-zinc-500 hover:text-blue-400 rounded-lg hover:bg-zinc-800">✏️</button>
                          <button onClick={() => toggleLessonActive(lesson)} className={`p-1.5 rounded-lg text-xs ${lesson.isActive ? 'text-emerald-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-800'}`}>
                            {lesson.isActive ? '✓' : '○'}
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: 'lesson', id: lesson.id, title: lesson.title })} className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-800">🗑</button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 underline truncate block max-w-xs">
                          🎬 Смотреть видео
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── Category Modal ── */}
      {catModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCatModal({ open: false, editing: null })} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">{catModal.editing ? 'Редактировать категорию' : 'Новая категория'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Название *</label>
                <input value={catTitle} onChange={e => setCatTitle(e.target.value)} placeholder="Например: Классический режим"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Иконка (emoji)</label>
                  <input value={catIcon} onChange={e => setCatIcon(e.target.value)} placeholder="🎮"
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Порядок</label>
                  <input type="number" value={catOrder} onChange={e => setCatOrder(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setCatModal({ open: false, editing: null })} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium">Отмена</button>
              <button onClick={saveCat} disabled={catSaving || !catTitle.trim()} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold">
                {catSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lesson Modal ── */}
      {lessonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (!uploading) setLessonModal({ open: false, editing: null }); }} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">{lessonModal.editing ? 'Редактировать урок' : 'Новый урок'}</h3>
            <div className="space-y-3">
              {/* Category */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Категория *</label>
                <select value={lessonCatId} onChange={e => setLessonCatId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
                </select>
              </div>
              {/* Title */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Название урока *</label>
                <input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Основы позиционирования"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
              </div>
              {/* Description */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Описание</label>
                <textarea value={lessonDesc} onChange={e => setLessonDesc(e.target.value)} rows={2} placeholder="Краткое описание урока..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none resize-none" />
              </div>
              {/* Video file */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Видеофайл {lessonModal.editing ? '(оставьте пустым, чтобы не менять)' : '*'}
                </label>
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full px-3 py-3 bg-zinc-800 border border-dashed border-zinc-600 hover:border-purple-500 rounded-xl text-sm cursor-pointer transition-colors text-center"
                >
                  {videoFile ? (
                    <span className="text-emerald-400">✓ {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} МБ)</span>
                  ) : (
                    <span className="text-zinc-500">Нажмите для выбора MP4 / MOV / WebM (до 200 МБ)</span>
                  )}
                </div>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/avi" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
              </div>
              {/* Thumbnail + Duration + Order */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">URL превью (необязательно)</label>
                <input value={lessonThumbnail} onChange={e => setLessonThumbnail(e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Длительность (сек)</label>
                  <input type="number" value={lessonDuration} onChange={e => setLessonDuration(e.target.value)} placeholder="180"
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Порядок</label>
                  <input type="number" value={lessonOrder} onChange={e => setLessonOrder(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none" />
                </div>
              </div>
            </div>
            {uploading && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-purple-300 text-sm">{uploadProgress || 'Загрузка...'}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { if (!uploading) setLessonModal({ open: false, editing: null }); }} disabled={uploading}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-xl text-sm font-medium">Отмена</button>
              <button onClick={saveLesson} disabled={uploading || !lessonTitle.trim() || (!lessonModal.editing && !videoFile)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold">
                {uploading ? 'Загрузка...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Training Settings ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">⚙️ Настройки курса</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Цена доступа и список наград за прохождение</p>
          </div>
          <button
            onClick={saveSettings}
            disabled={settingsSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
          >
            {settingsSaving ? 'Сохранение...' : settingsSaved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>

        {/* Price + Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Цена доступа</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsPrice}
              onChange={e => setSettingsPrice(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-emerald-500 outline-none"
              placeholder="10"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Валюта (символ)</label>
            <input
              value={settingsCurrency}
              onChange={e => setSettingsCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-emerald-500 outline-none"
              placeholder="$"
            />
          </div>
        </div>

        {/* Rewards list */}
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Награды за прохождение всего курса</label>
          <div className="space-y-2 mb-3">
            {settingsRewards.map((reward, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={reward}
                  onChange={e => setSettingsRewards(prev => prev.map((r, j) => j === i ? e.target.value : r))}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none"
                />
                <button
                  onClick={() => setSettingsRewards(prev => prev.filter((_, j) => j !== i))}
                  className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
                >✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newReward}
              onChange={e => setNewReward(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newReward.trim()) {
                  setSettingsRewards(prev => [...prev, newReward.trim()]);
                  setNewReward('');
                }
              }}
              placeholder="Новая награда (Enter для добавления)"
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:border-purple-500 outline-none"
            />
            <button
              onClick={() => { if (newReward.trim()) { setSettingsRewards(prev => [...prev, newReward.trim()]); setNewReward(''); } }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-all"
            >+</button>
          </div>
          <p className="text-zinc-600 text-xs mt-2">Эти награды видят пользователи после оплаты курса</p>
        </div>

        {/* Preview */}
        {settings && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-2">Превью кнопки на сайте:</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
              Оплатить — {settingsCurrency}{settingsPrice || settings.price}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Удалить {deleteConfirm.type === 'cat' ? 'категорию' : 'урок'}?</h3>
            <p className="text-zinc-400 text-sm">«{deleteConfirm.title}»{deleteConfirm.type === 'cat' ? ' и все её уроки' : ''} будут удалены.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium">Отмена</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
