import { useState, useRef } from 'react';
import type { ClanAdminSettings } from '../../lib/clanApi';
import { updateClanSettings } from '../../lib/clanApi';
import { toast } from '../../lib/toast';

interface Props {
  clan: ClanAdminSettings;
  onRefresh: () => Promise<void>;
}

export default function ClanSettingsTab({ clan, onRefresh }: Props) {
  const [fee, setFee] = useState(String(clan.entryFee));
  const [season, setSeason] = useState(String(clan.season));
  const [tgChat, setTgChat] = useState(clan.telegramChat || '');
  const [tgChan, setTgChan] = useState(clan.telegramChannel || '');
  const [videoUrl, setVideoUrl] = useState(clan.videoGuideUrl || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState<boolean>(false);
  const rulesRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClanSettings({
        entryFee: Number(fee),
        season: Number(season),
        telegramChat: tgChat || null,
        telegramChannel: tgChan || null,
        rules: rulesRef.current?.value || null,
        videoGuideUrl: videoUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* General */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">🏠 Общие настройки</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Вступительный взнос ($)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Текущий сезон</label>
            <input type="number" value={season} onChange={e => setSeason(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50" />
          </div>
        </div>
      </div>

      {/* Telegram */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">📱 Telegram</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Ссылка на чат клана</label>
            <input type="url" value={tgChat} onChange={e => setTgChat(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Ссылка на канал клана</label>
            <input type="url" value={tgChan} onChange={e => setTgChan(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50" />
          </div>
        </div>
      </div>

      {/* Video Guide */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">📹 Видео-инструкция</h3>
        <div>
          <label className="text-zinc-400 text-xs mb-1 block">Ссылка на YouTube видео</label>
          <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
          <p className="text-zinc-600 text-xs mt-1">Это видео будет отображаться на странице клана в блоке «Видео-инструкция»</p>
        </div>
        {videoUrl && (
          <div className="rounded-lg overflow-hidden border border-zinc-800">
            <iframe
              src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').split('&')[0]}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">📜 Правила клана</h3>
        <textarea
          ref={rulesRef}
          rows={6}
          defaultValue={clan.rules || ''}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50 resize-none"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/30 disabled:opacity-50">
          {saving ? '⏳ Сохраняю...' : '💾 Сохранить настройки'}
        </button>
        {saved && <span className="text-emerald-400 text-sm font-medium animate-pulse">✓ Сохранено</span>}
      </div>
    </div>
  );
}
