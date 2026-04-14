import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';

const toEmbed = (url: string): string => {
  if (!url) return '';
  if (url.includes('/embed/')) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url;
};

export default function SettingsPage() {
  const [videoAndroid, setVideoAndroid] = useState('');
  const [videoIos, setVideoIos] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getConfig().then(cfg => {
      setVideoAndroid(cfg.video_android || '');
      setVideoIos(cfg.video_ios || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await adminApi.updateConfig({
        video_android: videoAndroid.trim(),
        video_ios: videoIos.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Ошибка сохранения'); }
    setSaving(false);
  };

  const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-zinc-600";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">⚙️ Настройки</h1>
        <p className="text-zinc-500 text-sm mt-1">Глобальные параметры платформы</p>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>
      ) : (
        <>
          {/* Video URLs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-white font-semibold text-sm mb-1">🎬 Видео для чата турниров</h2>
              <p className="text-zinc-500 text-xs">YouTube embed ссылки для Android и iOS инструкций. Формат: https://www.youtube.com/embed/VIDEO_ID</p>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">🤖 Видео Android</label>
              <input value={videoAndroid} onChange={e => setVideoAndroid(e.target.value)}
                placeholder="https://www.youtube.com/embed/..." className={inp} />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">🍎 Видео iOS</label>
              <input value={videoIos} onChange={e => setVideoIos(e.target.value)}
                placeholder="https://www.youtube.com/embed/..." className={inp} />
            </div>

            {/* Preview */}
            {(videoAndroid || videoIos) && (
              <div className="grid grid-cols-2 gap-3">
                {videoAndroid && (
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">Android превью:</p>
                    <div className="rounded-lg overflow-hidden border border-zinc-700">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe className="absolute inset-0 w-full h-full" src={toEmbed(videoAndroid)} title="Android" />
                      </div>
                    </div>
                  </div>
                )}
                {videoIos && (
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">iOS превью:</p>
                    <div className="rounded-lg overflow-hidden border border-zinc-700">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe className="absolute inset-0 w-full h-full" src={toEmbed(videoIos)} title="iOS" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              {saved && <span className="text-emerald-400 text-sm">✅ Сохранено</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
