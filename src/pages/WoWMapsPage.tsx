import { useState, useEffect, useRef } from 'react';
import { wowMapApi, type WoWMapAdmin } from '../lib/api';

export default function WoWMapsPage() {
  const [maps, setMaps] = useState<WoWMapAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMap, setEditingMap] = useState<WoWMapAdmin | null>(null);
  const [form, setForm] = useState({
    mapId: '', name: '', format: '', teamCount: 2, playersPerTeam: 1, rounds: 10,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await wowMapApi.list(); setMaps(r.maps); }
    catch { setError('Ошибка загрузки'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ mapId: '', name: '', format: '', teamCount: 2, playersPerTeam: 1, rounds: 10, isActive: true });
    setImageFile(null); setImagePreview(''); setEditingMap(null); setShowForm(false);
  };

  const openEdit = (m: WoWMapAdmin) => {
    setEditingMap(m);
    setForm({
      mapId: m.mapId, name: m.name, format: m.format, teamCount: m.teamCount,
      playersPerTeam: m.playersPerTeam, rounds: m.rounds, isActive: m.isActive,
    });
    setImagePreview(m.image);
    setImageFile(null);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Макс. размер 5 MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validate = (): string | null => {
    if (!editingMap && !imageFile && !imagePreview) return 'Загрузите изображение карты';
    if (!form.mapId.trim()) return 'Map ID — обязательное поле';
    if (form.mapId.length > 20) return 'Map ID — максимум 20 символов';
    if (!form.name.trim()) return 'Название — обязательное поле';
    if (form.name.length > 100) return 'Название — максимум 100 символов';
    if (!form.format.trim()) return 'Формат — обязательное поле';
    if (form.format.length > 20) return 'Формат — максимум 20 символов';
    if (form.teamCount < 2 || form.teamCount > 8) return 'Команд: от 2 до 8';
    if (form.playersPerTeam < 1 || form.playersPerTeam > 4) return 'Игроков/команда: от 1 до 4';
    if (form.rounds < 1 || form.rounds > 100) return 'Раундов: от 1 до 100';
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError('');
    try {
      const data: Record<string, unknown> = { ...form };
      // Convert image file to base64 for upload
      if (imageFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        data.imageData = base64;
      }
      if (editingMap) {
        await wowMapApi.update(editingMap.id, data);
      } else {
        if (!imageFile) { setError('Загрузите изображение карты'); setSaving(false); return; }
        await wowMapApi.create(data);
      }
      resetForm(); await load();
    } catch (e: unknown) { setError((e as Error)?.message || 'Ошибка'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m: WoWMapAdmin) => {
    if (!confirm(`Удалить "${m.name}"?`)) return;
    try { await wowMapApi.remove(m.id); await load(); }
    catch (e: unknown) { setError((e as Error)?.message || 'Ошибка'); }
  };

  const inp = "w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Карты Мир чудес</h1>
          <p className="text-zinc-400 text-sm mt-1">Управление картами War of Wonders</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">+ Добавить</button>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-red-400 text-sm whitespace-pre-line">{error}</div>}

      {showForm && (
        <div className="bg-zinc-800/80 rounded-xl border border-zinc-700 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">{editingMap ? 'Редактировать' : 'Новая карта'}</h2>

          {/* Image upload */}
          <div>
            <label className="text-xs text-zinc-400 block mb-2">Изображение карты</label>
            <div className="flex items-start gap-4">
              {imagePreview && (
                <div className="relative w-40 h-24 rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm border border-zinc-600">
                  {imagePreview ? 'Заменить фото' : 'Загрузить фото'}
                </button>
                <p className="text-xs text-zinc-500 mt-1">JPG, PNG или WebP. Макс. 5 MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-zinc-400 block mb-1">Map ID (из игры)</label><input value={form.mapId} onChange={e => setForm({...form, mapId: e.target.value})} className={inp} placeholder="847291" /></div>
            <div><label className="text-xs text-zinc-400 block mb-1">Название</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} placeholder="2 против 2 m416" /></div>
            <div><label className="text-xs text-zinc-400 block mb-1">Формат (категория)</label><input value={form.format} onChange={e => setForm({...form, format: e.target.value})} className={inp} placeholder="Арена" /></div>
            <div><label className="text-xs text-zinc-400 block mb-1">Команд</label><input type="number" value={form.teamCount} onChange={e => setForm({...form, teamCount: +e.target.value})} className={inp} min={2} max={8} /></div>
            <div><label className="text-xs text-zinc-400 block mb-1">Игроков/команда</label><input type="number" value={form.playersPerTeam} onChange={e => setForm({...form, playersPerTeam: +e.target.value})} className={inp} min={1} max={4} /></div>
            <div><label className="text-xs text-zinc-400 block mb-1">Раундов</label><input type="number" value={form.rounds} onChange={e => setForm({...form, rounds: +e.target.value})} className={inp} min={1} max={100} /></div>
            <div className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="w-4 h-4 accent-emerald-500" /><label className="text-sm text-zinc-300">Активна</label></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Сохранение...' : editingMap ? 'Сохранить' : 'Создать'}</button>
            <button onClick={resetForm} className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm">Отмена</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-zinc-500">Загрузка...</div> : maps.length === 0 ? <div className="text-center py-12 text-zinc-500">Карт нет</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map(m => (
            <div key={m.id} className={`bg-zinc-800/80 rounded-xl border overflow-hidden ${m.isActive ? 'border-zinc-700' : 'border-red-500/30 opacity-60'}`}>
              <div className="relative h-36">
                <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/80 font-mono">
                  ID: {m.mapId}
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.isActive ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>{m.isActive ? 'Активна' : 'Выкл'}</span>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="bg-blue-600/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white font-medium">{m.format}</span>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm text-white font-semibold truncate">{m.name}</p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">{m.teamCount} команд</span>
                  <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">{m.playersPerTeam} игр.</span>
                  <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded">{m.rounds}R</span>
                  <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded">Турниров: {m._count?.tournaments || 0}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEdit(m)} className="flex-1 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-xs">Изменить</button>
                  <button onClick={() => handleDelete(m)} className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs">Удалить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
