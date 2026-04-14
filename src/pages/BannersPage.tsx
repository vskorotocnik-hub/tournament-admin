import { useState, useEffect, useRef } from 'react';
import * as bannersApi from '../lib/bannersApi';
import type { PageBanner, BannerPage } from '../lib/bannersApi';
import { PAGE_LABELS, GRADIENTS } from '../lib/bannersApi';
import { i18nStr } from '../lib/i18n';

const PAGES: BannerPage[] = ['home', 'currency', 'accounts', 'rental', 'boost', 'partner'];

interface BannerFormData {
  title: string;
  subtitle: string;
  imageUrl: string;
  gradient: string;
  active: boolean;
}

const emptyForm: BannerFormData = {
  title: '',
  subtitle: '',
  imageUrl: '',
  gradient: GRADIENTS[0].value,
  active: true,
};

export default function BannersPage() {
  const [activePage, setActivePage] = useState<BannerPage>('currency');
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PageBanner | null>(null);
  const [form, setForm] = useState<BannerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async (page: BannerPage) => {
    setLoading(true);
    setError('');
    try {
      const data = await bannersApi.getBanners(page);
      setBanners(data);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(activePage); }, [activePage]);

  const handlePageChange = (page: BannerPage) => {
    setActivePage(page);
    setShowForm(false);
    setEditingBanner(null);
    setForm(emptyForm);
    setPreviewUrl('');
    setError('');
    setSuccess('');
  };

  const openCreate = () => {
    setEditingBanner(null);
    setForm({ ...emptyForm, sortOrder: banners.length } as any);
    setPreviewUrl('');
    setShowForm(true);
    setError('');
  };

  const openEdit = (b: PageBanner) => {
    setEditingBanner(b);
    setForm({ title: i18nStr(b.title), subtitle: i18nStr(b.subtitle), imageUrl: b.imageUrl, gradient: b.gradient, active: b.active });
    setPreviewUrl(b.imageUrl);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBanner(null);
    setForm(emptyForm);
    setPreviewUrl('');
    setError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await bannersApi.uploadBannerImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
      setPreviewUrl(url);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (url: string) => {
    setForm(f => ({ ...f, imageUrl: url }));
    setPreviewUrl(url);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Введите заголовок'); return; }
    if (!form.imageUrl.trim()) { setError('Добавьте изображение'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingBanner) {
        const updated = await bannersApi.updateBanner(editingBanner.id, form);
        setBanners(bs => bs.map(b => b.id === updated.id ? updated : b));
        setSuccess('Банер обновлён');
      } else {
        const created = await bannersApi.createBanner({ ...form, page: activePage, sortOrder: banners.length });
        setBanners(bs => [...bs, created]);
        setSuccess('Банер добавлен');
      }
      closeForm();
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить банер?')) return;
    try {
      await bannersApi.deleteBanner(id);
      setBanners(bs => bs.filter(b => b.id !== id));
      setSuccess('Банер удалён');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Ошибка удаления');
    }
  };

  const handleToggleActive = async (b: PageBanner) => {
    try {
      const updated = await bannersApi.updateBanner(b.id, { active: !b.active });
      setBanners(bs => bs.map(x => x.id === updated.id ? updated : x));
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newBanners = [...banners];
    [newBanners[index - 1], newBanners[index]] = [newBanners[index], newBanners[index - 1]];
    const items = newBanners.map((b, i) => ({ id: b.id, sortOrder: i }));
    setBanners(newBanners.map((b, i) => ({ ...b, sortOrder: i })));
    try { await bannersApi.reorderBanners(items); } catch {}
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const newBanners = [...banners];
    [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
    const items = newBanners.map((b, i) => ({ id: b.id, sortOrder: i }));
    setBanners(newBanners.map((b, i) => ({ ...b, sortOrder: i })));
    try { await bannersApi.reorderBanners(items); } catch {}
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Банеры</h1>
        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-2 rounded-lg">
            ✓ {success}
          </div>
        )}
      </div>

      {/* Page tabs */}
      <div className="flex gap-2 flex-wrap">
        {PAGES.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePage === page
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {PAGE_LABELS[page]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Banner list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-semibold">{PAGE_LABELS[activePage]}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {loading ? 'Загрузка...' : `${banners.length} банер${banners.length === 1 ? '' : banners.length < 5 ? 'а' : 'ов'}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              <span className="text-base leading-none">+</span> Добавить банер
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="font-medium text-zinc-400">Банеров нет</p>
            <p className="text-sm mt-1">Добавьте банер или загрузите стандартные</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {banners.map((banner, index) => (
              <div key={banner.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors">
                {/* Preview */}
                <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                  <img
                    src={banner.imageUrl}
                    alt={i18nStr(banner.title)}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="112" height="64" viewBox="0 0 112 64"><rect fill="%23374151" width="112" height="64"/><text fill="%236b7280" font-size="10" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">No image</text></svg>'; }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} opacity-60`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{i18nStr(banner.title)}</p>
                  <p className="text-zinc-400 text-xs truncate mt-0.5">{i18nStr(banner.subtitle) || '—'}</p>
                  <p className="text-zinc-600 text-xs mt-1 truncate">{banner.imageUrl}</p>
                </div>

                {/* Status */}
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    banner.active
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-700 text-zinc-500 border border-zinc-600'
                  }`}
                >
                  {banner.active ? 'Активен' : 'Скрыт'}
                </button>

                {/* Order controls */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 text-xs"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === banners.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 text-xs"
                  >
                    ▼
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(banner)}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition-all"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-all"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-white font-semibold">
                {editingBanner ? 'Редактировать банер' : 'Добавить банер'}
              </h3>
              <button onClick={closeForm} className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800">
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Image preview */}
              {previewUrl && (
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-zinc-800">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${form.gradient} opacity-70`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <p className="text-white font-bold text-lg drop-shadow">{form.title || 'Заголовок'}</p>
                    {form.subtitle && <p className="text-white/90 text-sm drop-shadow">{form.subtitle}</p>}
                  </div>
                </div>
              )}

              {/* Image URL */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2">Изображение</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="https://... (вставить ссылку)"
                    value={form.imageUrl}
                    onChange={e => handleUrlChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-700" />
                    <span className="text-zinc-500 text-xs">или</span>
                    <div className="flex-1 h-px bg-zinc-700" />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-dashed border-zinc-600 hover:border-zinc-500 text-zinc-400 text-sm py-3 rounded-lg transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Загрузка...
                      </>
                    ) : (
                      <>📁 Загрузить файл (JPG, PNG, WebP)</>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2">Заголовок *</label>
                <input
                  type="text"
                  placeholder="PUBG Mobile Championship"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2">Подзаголовок</label>
                <input
                  type="text"
                  placeholder="Призовой фонд $10,000 • Регистрация открыта"
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Gradient */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2">Градиент</label>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENTS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gradient: g.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                        form.gradient === g.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <div className={`w-10 h-4 rounded bg-gradient-to-r ${g.value} flex-shrink-0`} />
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Активен</span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : editingBanner ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
