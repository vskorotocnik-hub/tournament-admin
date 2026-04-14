import { useState, useEffect, useCallback, useRef } from 'react';
import { globalTournamentApi, type GTListItem, type GTDetail, type GTStatus, type GTGameMode, type GTFormat, type GTFormData } from '../lib/globalTournamentApi';
import { i18nStr } from '../lib/i18n';

const statusLabels: Record<GTStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Черновик', color: 'bg-zinc-500/20 text-zinc-400' },
  REGISTRATION: { label: 'Регистрация', color: 'bg-blue-500/20 text-blue-400' },
  CHECKIN: { label: 'Check-in', color: 'bg-purple-500/20 text-purple-400' },
  LIVE: { label: 'LIVE', color: 'bg-red-500/20 text-red-400' },
  FINISHED: { label: 'Завершён', color: 'bg-emerald-500/20 text-emerald-400' },
  CANCELLED: { label: 'Отменён', color: 'bg-zinc-600/20 text-zinc-500' },
};

const gameModeLabels: Record<string, string> = {
  CLASSIC: 'Classic', TDM: 'TDM', CLAN: 'Clan', CLAN_DISTRIBUTION: 'Clan Dist',
};

const formatLabels: Record<string, string> = {
  SOLO: 'Соло', DUO: 'Дуо', SQUAD: 'Сквад',
};

const statusFlow: GTStatus[] = ['DRAFT', 'REGISTRATION', 'CHECKIN', 'LIVE', 'FINISHED'];

const defaultForm: GTFormData = {
  name: '', subtitle: '', description: '', rules: '',
  gameMode: 'CLASSIC', format: 'SQUAD', status: 'DRAFT',
  prizePool: 0, entryFee: 0, commission: 0, maxParticipants: 128,
  minLevel: null, minRank: null,
  registrationStart: null, registrationEnd: null, checkInStart: null, checkInEnd: null,
  tournamentStart: null, tournamentEnd: null,
  region: 'Мировой', server: 'EUROPE', bannerImage: null, streamUrl: null,
  stages: [], prizes: [],
};

const INPUT_CLS = "w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500";
const SELECT_CLS = INPUT_CLS;

const Badge = ({ status }: { status: string }) => {
  const cfg = statusLabels[status as GTStatus] || { label: status, color: 'bg-zinc-500/20 text-zinc-400' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-zinc-400 text-xs font-medium">{label}</span>
    {children}
  </label>
);

export default function GlobalTournamentsPage() {
  const [tournaments, setTournaments] = useState<GTListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GTDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GTFormData>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // ─── Data loading ──────────────────────────────────────────
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await globalTournamentApi.list({ page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) });
      setTournaments(res.tournaments);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { setDetail(await globalTournamentApi.get(id)); } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const refreshDetail = async () => {
    if (!detail) return;
    try { setDetail(await globalTournamentApi.get(detail.id)); } catch { /* ignore */ }
  };

  // ─── Form ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null); setForm({ ...defaultForm }); setFormError(''); setBannerPreview(null); setShowForm(true);
  };

  const openEdit = (t: GTDetail) => {
    setEditingId(t.id);
    setForm({
      name: i18nStr(t.name), subtitle: i18nStr(t.subtitle) || '', description: i18nStr(t.description) || '', rules: i18nStr(t.rules) || '',
      gameMode: t.gameMode, format: t.format, status: t.status,
      prizePool: t.prizePool, entryFee: t.entryFee, commission: t.commission,
      maxParticipants: t.maxParticipants, minLevel: t.minLevel, minRank: t.minRank,
      registrationStart: t.registrationStart ? new Date(t.registrationStart).toISOString().slice(0, 16) : null,
      registrationEnd: t.registrationEnd ? new Date(t.registrationEnd).toISOString().slice(0, 16) : null,
      checkInStart: t.checkInStart ? new Date(t.checkInStart).toISOString().slice(0, 16) : null,
      checkInEnd: t.checkInEnd ? new Date(t.checkInEnd).toISOString().slice(0, 16) : null,
      tournamentStart: t.tournamentStart ? new Date(t.tournamentStart).toISOString().slice(0, 16) : null,
      tournamentEnd: t.tournamentEnd ? new Date(t.tournamentEnd).toISOString().slice(0, 16) : null,
      region: t.region, server: t.server, bannerImage: t.bannerImage, streamUrl: t.streamUrl,
      stages: t.stages.map(s => ({ name: i18nStr(s.name), date: s.date, status: s.status })),
      prizes: t.prizes.map(p => ({ place: p.place, amount: p.amount, icon: p.icon || undefined })),
    });
    setFormError(''); setBannerPreview(t.bannerImage); setShowForm(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) { setFormError('Введите название'); return; }
    setSaving(true); setFormError('');
    try {
      if (editingId) {
        await globalTournamentApi.update(editingId, form);
      } else {
        await globalTournamentApi.create(form);
      }
      setShowForm(false);
      loadList();
      if (editingId && detail?.id === editingId) refreshDetail();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  // ─── Actions ───────────────────────────────────────────────
  const changeStatus = async (id: string, status: GTStatus) => {
    setActionLoading(id + status);
    try {
      await globalTournamentApi.changeStatus(id, status);
      loadList();
      if (detail?.id === id) refreshDetail();
    } catch { /* ignore */ }
    setActionLoading('');
  };

  const deleteTournament = async (id: string) => {
    if (!confirm('Удалить турнир? Это необратимо.')) return;
    try {
      await globalTournamentApi.remove(id);
      if (detail?.id === id) setDetail(null);
      loadList();
    } catch { /* ignore */ }
  };

  const disqualifyReg = async (regId: string) => {
    if (!detail) return;
    const reason = prompt('Причина дисквалификации:');
    if (!reason) return;
    try {
      await globalTournamentApi.disqualifyRegistration(detail.id, regId, reason);
      refreshDetail();
    } catch { /* ignore */ }
  };

  const removeReg = async (regId: string) => {
    if (!detail || !confirm('Удалить регистрацию?')) return;
    try {
      await globalTournamentApi.removeRegistration(detail.id, regId);
      refreshDetail();
    } catch { /* ignore */ }
  };

  // ─── Render helpers ────────────────────────────────────────
  const inputCls = INPUT_CLS;
  const selectCls = SELECT_CLS;

  // ─── Form UI ───────────────────────────────────────────────
  const renderForm = () => (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl mt-8 mb-20">
        <div className="p-5 border-b border-zinc-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{editingId ? 'Редактировать турнир' : 'Новый глобальный турнир'}</h2>
          <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {formError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Название *">
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Подзаголовок">
              <input className={inputCls} value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Режим">
              <select className={selectCls} value={form.gameMode} onChange={e => setForm(f => ({ ...f, gameMode: e.target.value as GTGameMode }))}>
                <option value="CLASSIC">Classic</option>
                <option value="TDM">TDM</option>
                <option value="CLAN">Clan</option>
                <option value="CLAN_DISTRIBUTION">Clan Distribution</option>
              </select>
            </Field>
            <Field label="Формат">
              <select className={selectCls} value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value as GTFormat }))}>
                <option value="SOLO">Solo</option>
                <option value="DUO">Duo</option>
                <option value="SQUAD">Squad</option>
              </select>
            </Field>
            <Field label="Статус">
              <select className={selectCls} value={form.status || 'DRAFT'} onChange={e => setForm(f => ({ ...f, status: e.target.value as GTStatus }))}>
                {statusFlow.map(s => <option key={s} value={s}>{statusLabels[s].label}</option>)}
                <option value="CANCELLED">Отменён</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Призовой фонд ($)">
              <input className={inputCls} type="number" value={form.prizePool} onChange={e => setForm(f => ({ ...f, prizePool: +e.target.value }))} />
            </Field>
            <Field label="Взнос ($)">
              <input className={inputCls} type="number" value={form.entryFee} onChange={e => setForm(f => ({ ...f, entryFee: +e.target.value }))} />
            </Field>
            <Field label="Комиссия ($)">
              <input className={inputCls} type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: +e.target.value }))} />
            </Field>
            <Field label="Макс. участников">
              <input className={inputCls} type="number" value={form.maxParticipants} onChange={e => setForm(f => ({ ...f, maxParticipants: +e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Сервер">
              <select className={selectCls} value={form.server} onChange={e => setForm(f => ({ ...f, server: e.target.value }))}>
                <option value="EUROPE">Европа</option>
                <option value="NA">Северная Америка</option>
                <option value="ASIA">Азия</option>
                <option value="ME">Ближний Восток</option>
                <option value="SA">Южная Америка</option>
              </select>
            </Field>
            <Field label="Регион">
              <input className={inputCls} value={form.region || ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Мировой" />
            </Field>
            <Field label="Мин. ранг">
              <input className={inputCls} value={form.minRank || ''} onChange={e => setForm(f => ({ ...f, minRank: e.target.value }))} placeholder="Ace" />
            </Field>
          </div>

          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider pt-2">Даты</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Начало регистрации">
              <input className={inputCls} type="datetime-local" value={form.registrationStart || ''} onChange={e => setForm(f => ({ ...f, registrationStart: e.target.value || null }))} />
            </Field>
            <Field label="Конец регистрации">
              <input className={inputCls} type="datetime-local" value={form.registrationEnd || ''} onChange={e => setForm(f => ({ ...f, registrationEnd: e.target.value || null }))} />
            </Field>
            <Field label="Начало check-in">
              <input className={inputCls} type="datetime-local" value={form.checkInStart || ''} onChange={e => setForm(f => ({ ...f, checkInStart: e.target.value || null }))} />
            </Field>
            <Field label="Конец check-in">
              <input className={inputCls} type="datetime-local" value={form.checkInEnd || ''} onChange={e => setForm(f => ({ ...f, checkInEnd: e.target.value || null }))} />
            </Field>
            <Field label="Старт турнира">
              <input className={inputCls} type="datetime-local" value={form.tournamentStart || ''} onChange={e => setForm(f => ({ ...f, tournamentStart: e.target.value || null }))} />
            </Field>
            <Field label="Конец турнира">
              <input className={inputCls} type="datetime-local" value={form.tournamentEnd || ''} onChange={e => setForm(f => ({ ...f, tournamentEnd: e.target.value || null }))} />
            </Field>
          </div>

          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider pt-2">Медиа</p>
          {/* Banner image upload */}
          <Field label="Баннер турнира">
            <div className="mt-1">
              {bannerPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-700">
                  <img src={bannerPreview} alt="Баннер" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg"
                    >
                      Заменить
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBannerPreview(null); setForm(f => ({ ...f, bannerImage: null, bannerImageData: null })); }}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <span className="text-2xl mb-1">📸</span>
                  <span className="text-zinc-400 text-sm font-medium">Нажмите для загрузки фото</span>
                  <span className="text-zinc-600 text-xs mt-0.5">JPG, PNG, WebP · макс. 5 МБ</span>
                </div>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { setFormError('Файл слишком большой (макс. 5 МБ)'); return; }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result as string;
                    setBannerPreview(base64);
                    setForm(f => ({ ...f, bannerImageData: base64, bannerImage: null }));
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </div>
          </Field>

          <Field label="URL стрима">
            <input className={inputCls} value={form.streamUrl || ''} onChange={e => setForm(f => ({ ...f, streamUrl: e.target.value || null }))} placeholder="https://twitch.tv/..." />
          </Field>

          <Field label="Описание">
            <textarea className={inputCls + " h-24 resize-none"} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>

          <Field label="Правила (каждая строка — отдельное правило)">
            <textarea className={inputCls + " h-24 resize-none"} value={form.rules || ''} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} />
          </Field>

          {/* ── STAGES ─────────────────────────── */}
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider pt-2">Этапы турнира</p>
          <div className="space-y-2">
            {(form.stages || []).map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls + " flex-1"} placeholder="Название этапа" value={stage.name}
                  onChange={e => { const s = [...(form.stages || [])]; s[i] = { ...s[i], name: e.target.value }; setForm(f => ({ ...f, stages: s })); }} />
                <input className={inputCls + " w-44"} placeholder="Дата" value={stage.date}
                  onChange={e => { const s = [...(form.stages || [])]; s[i] = { ...s[i], date: e.target.value }; setForm(f => ({ ...f, stages: s })); }} />
                <select className={selectCls + " w-32"} value={stage.status}
                  onChange={e => { const s = [...(form.stages || [])]; s[i] = { ...s[i], status: e.target.value }; setForm(f => ({ ...f, stages: s })); }}>
                  <option value="upcoming">Скоро</option>
                  <option value="live">LIVE</option>
                  <option value="completed">Завершён</option>
                </select>
                <button type="button" onClick={() => { const s = [...(form.stages || [])]; s.splice(i, 1); setForm(f => ({ ...f, stages: s })); }}
                  className="text-red-400 hover:text-red-300 text-lg px-1">✕</button>
              </div>
            ))}
            <button type="button"
              onClick={() => setForm(f => ({ ...f, stages: [...(f.stages || []), { name: '', date: '', status: 'upcoming' }] }))}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700">
              + Добавить этап
            </button>
          </div>

          {/* ── PRIZES ─────────────────────────── */}
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider pt-2">Призовые места</p>
          <div className="space-y-2">
            {(form.prizes || []).map((prize, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls + " w-28"} placeholder="Место" value={prize.place}
                  onChange={e => { const p = [...(form.prizes || [])]; p[i] = { ...p[i], place: e.target.value }; setForm(f => ({ ...f, prizes: p })); }} />
                <input className={inputCls + " w-32"} type="number" placeholder="Сумма $" value={prize.amount || ''}
                  onChange={e => { const p = [...(form.prizes || [])]; p[i] = { ...p[i], amount: +e.target.value }; setForm(f => ({ ...f, prizes: p })); }} />
                <input className={inputCls + " w-20"} placeholder="🏆" value={prize.icon || ''}
                  onChange={e => { const p = [...(form.prizes || [])]; p[i] = { ...p[i], icon: e.target.value }; setForm(f => ({ ...f, prizes: p })); }} />
                <button type="button" onClick={() => { const p = [...(form.prizes || [])]; p.splice(i, 1); setForm(f => ({ ...f, prizes: p })); }}
                  className="text-red-400 hover:text-red-300 text-lg px-1">✕</button>
              </div>
            ))}
            <button type="button"
              onClick={() => setForm(f => ({ ...f, prizes: [...(f.prizes || []), { place: `${(f.prizes || []).length + 1} место`, amount: 0, icon: (f.prizes || []).length === 0 ? '🥇' : (f.prizes || []).length === 1 ? '🥈' : (f.prizes || []).length === 2 ? '🥉' : '🏅' }] }))}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700">
              + Добавить призовое место
            </button>
          </div>
        </div>
        <div className="p-5 border-t border-zinc-700 flex gap-3 justify-end">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Отмена</button>
          <button onClick={saveForm} disabled={saving} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Detail panel ──────────────────────────────────────────
  const renderDetail = () => {
    if (!detail) return null;
    const nextStatus = statusFlow[statusFlow.indexOf(detail.status as GTStatus) + 1];
    const regs = detail.registrations || [];
    const checkedIn = regs.filter(r => r.isCheckedIn).length;
    const disqualified = regs.filter(r => r.isDisqualified).length;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl mt-8 mb-20">
          <div className="p-5 border-b border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{i18nStr(detail.name)}</h2>
                <p className="text-sm text-zinc-500">{gameModeLabels[detail.gameMode]} {formatLabels[detail.format]} · {detail.region}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={detail.status} />
                <button onClick={() => setDetail(null)} className="text-zinc-400 hover:text-white text-xl ml-2">✕</button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-500">Призовой фонд</p>
                <p className="text-lg font-bold text-white">${detail.prizePool.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-500">Взнос</p>
                <p className="text-lg font-bold text-white">{detail.entryFee === 0 ? 'FREE' : `$${detail.entryFee}`}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-500">Участники</p>
                <p className="text-lg font-bold text-white">{regs.length}/{detail.maxParticipants}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-500">Check-in</p>
                <p className="text-lg font-bold text-white">{checkedIn}/{regs.length}</p>
              </div>
            </div>

            {/* Status actions */}
            <div className="flex gap-2 flex-wrap">
              {nextStatus && (
                <button
                  onClick={() => changeStatus(detail.id, nextStatus)}
                  disabled={actionLoading === detail.id + nextStatus}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
                >
                  → {statusLabels[nextStatus].label}
                </button>
              )}
              <button onClick={() => openEdit(detail)} className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg">✏️ Редактировать</button>
              {detail.status !== 'CANCELLED' && (
                <button
                  onClick={() => changeStatus(detail.id, 'CANCELLED')}
                  className="px-4 py-2 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg"
                >
                  Отменить
                </button>
              )}
              <button onClick={() => deleteTournament(detail.id)} className="px-4 py-2 text-sm bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg ml-auto">
                🗑 Удалить
              </button>
            </div>

            {/* Registrations */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Регистрации ({regs.length}) {disqualified > 0 && <span className="text-red-400">· {disqualified} DQ</span>}</h3>
              {regs.length === 0 ? (
                <p className="text-sm text-zinc-600">Нет регистраций</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {regs.map(reg => (
                    <div key={reg.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${reg.isDisqualified ? 'bg-red-500/5 opacity-50' : 'bg-zinc-800'}`}>
                      <img src={reg.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reg.user.username}`} className="w-8 h-8 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{reg.user.displayName || reg.user.username}</p>
                        <p className="text-xs text-zinc-500">{reg.teamName || 'Без команды'} · {reg.pubgIds.join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {reg.isCheckedIn && <span className="text-emerald-400 text-xs font-medium">✓ CI</span>}
                        {reg.isPaid && <span className="text-blue-400 text-xs font-medium">💰</span>}
                        {reg.isDisqualified && <span className="text-red-400 text-xs font-medium">DQ</span>}
                        {!reg.isDisqualified && (
                          <button onClick={() => disqualifyReg(reg.id)} className="text-xs text-yellow-400/60 hover:text-yellow-400">DQ</button>
                        )}
                        <button onClick={() => removeReg(reg.id)} className="text-xs text-red-400/60 hover:text-red-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teams */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-300">Команды ({detail.teams.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setActionLoading('gen-teams');
                      try {
                        const res = await globalTournamentApi.generateTeams(detail.id);
                        alert(`Создано ${res.totalTeams} команд${res.unassigned > 0 ? `, ${res.unassigned} игрок(ов) без команды` : ''}`);
                        refreshDetail();
                      } catch (e: any) { alert(e.message || 'Ошибка'); }
                      setActionLoading('');
                    }}
                    disabled={actionLoading === 'gen-teams'}
                    className="px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg disabled:opacity-50"
                  >
                    ⚡ Сформировать команды
                  </button>
                </div>
              </div>
              {detail.teams.length === 0 ? (
                <p className="text-sm text-zinc-600">Нет команд. Нажмите «Сформировать» после check-in.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {detail.teams.map((t: any, idx: number) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-6">#{idx + 1}</span>
                        <span className="text-sm text-white font-medium">{i18nStr(t.name)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>{t.wins}W</span>
                        <span>{t.kills} kills</span>
                        <span className="text-blue-400 font-bold">{t.points} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-300">Матчи ({detail.matches.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('Сгенерировать матчи (round-robin)? Старые будут удалены.')) return;
                      setActionLoading('gen-matches');
                      try {
                        const res = await globalTournamentApi.generateMatches(detail.id);
                        alert(`Создано ${res.created} матчей`);
                        refreshDetail();
                      } catch (e: any) { alert(e.message || 'Ошибка'); }
                      setActionLoading('');
                    }}
                    disabled={actionLoading === 'gen-matches' || detail.teams.length < 2}
                    className="px-3 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg disabled:opacity-50"
                  >
                    ⚡ Сгенерировать матчи
                  </button>
                </div>
              </div>
              {detail.matches.length === 0 ? (
                <p className="text-sm text-zinc-600">Нет матчей. Сначала сформируйте команды.</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {detail.matches.map((m: any) => (
                    <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${m.status === 'COMPLETED' ? 'bg-emerald-500/5' : 'bg-zinc-800'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${m.winnerId === m.teamAId ? 'text-emerald-400' : 'text-white'}`}>{m.teamA?.name || '—'}</span>
                          <span className="text-zinc-500">{m.scoreA ?? '?'}</span>
                          <span className="text-zinc-600 text-xs">vs</span>
                          <span className="text-zinc-500">{m.scoreB ?? '?'}</span>
                          <span className={`font-medium ${m.winnerId === m.teamBId ? 'text-emerald-400' : 'text-white'}`}>{m.teamB?.name || '—'}</span>
                        </div>
                        <p className="text-xs text-zinc-600">#{m.matchNumber} · {m.stage} R{m.round}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : m.status === 'LIVE' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-400'}`}>
                          {m.status}
                        </span>
                        {m.status !== 'COMPLETED' && (
                          <button
                            onClick={async () => {
                              const scoreA = prompt(`Счёт ${m.teamA?.name || 'A'} (kills):`, '0');
                              if (scoreA === null) return;
                              const scoreB = prompt(`Счёт ${m.teamB?.name || 'B'} (kills):`, '0');
                              if (scoreB === null) return;
                              const a = parseInt(scoreA) || 0;
                              const b = parseInt(scoreB) || 0;
                              const winnerId = a >= b ? m.teamAId : m.teamBId;
                              try {
                                await globalTournamentApi.updateMatch(m.id, { scoreA: a, scoreB: b, winnerId, status: 'COMPLETED' });
                                refreshDetail();
                              } catch (e: any) { alert(e.message || 'Ошибка'); }
                            }}
                            className="text-xs text-blue-400/60 hover:text-blue-400 px-1"
                          >
                            ✅
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm('Удалить матч?')) return;
                            try { await globalTournamentApi.deleteMatch(m.id); refreshDetail(); } catch { /* ignore */ }
                          }}
                          className="text-xs text-red-400/60 hover:text-red-400 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Champions */}
            {detail.champions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Чемпионы ({detail.champions.length})</h3>
                <div className="space-y-1">
                  {detail.champions.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-zinc-800 rounded-lg">
                      <span className="text-sm">{c.place === 1 ? '🥇' : c.place === 2 ? '🥈' : c.place === 3 ? '🥉' : `#${c.place}`}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white">{c.championName} {c.championCountry}</p>
                        <p className="text-xs text-zinc-500">{c.year} · ${c.prizeWon.toLocaleString()} · {c.kills} kills · {c.winRate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🌍 Глобальные турниры</h1>
          <p className="text-sm text-zinc-500 mt-1">Управление масштабными турнирами с регистрацией, check-in, матчами</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl">
          + Создать турнир
        </button>
      </div>

      {/* Stats Banner */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Всего турниров', value: total, icon: '🏆', color: 'text-white' },
            { label: 'Активные', value: tournaments.filter(t => ['REGISTRATION', 'CHECKIN', 'LIVE'].includes(t.status)).length, icon: '🔥', color: 'text-emerald-400' },
            { label: 'Общий призовой', value: `$${tournaments.reduce((s, t) => s + t.prizePool, 0).toLocaleString()}`, icon: '💰', color: 'text-amber-400' },
            { label: 'Участников', value: tournaments.reduce((s, t) => s + t._count.registrations, 0), icon: '👥', color: 'text-blue-400' },
            { label: 'Завершённые', value: tournaments.filter(t => t.status === 'FINISHED').length, icon: '✅', color: 'text-zinc-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <span className="text-lg">{s.icon}</span>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
          Все ({total})
        </button>
        {Object.entries(statusLabels).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Загрузка...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">Нет турниров</div>
      ) : (
        <div className="space-y-2">
          {tournaments.map(t => (
            <button
              key={t.id}
              onClick={() => openDetail(t.id)}
              className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-4 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={t.status} />
                  <span className="text-xs text-zinc-500">{gameModeLabels[t.gameMode]} {formatLabels[t.format]}</span>
                </div>
                <p className="text-sm font-semibold text-white truncate">{i18nStr(t.name)}</p>
                {i18nStr(t.subtitle) && <p className="text-xs text-zinc-500 truncate">{i18nStr(t.subtitle)}</p>}
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="text-sm font-bold text-white">${t.prizePool.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">{t._count.registrations}/{t.maxParticipants} участников</p>
                {t.tournamentStart && (
                  <p className="text-xs text-zinc-600">{new Date(t.tournamentStart).toLocaleDateString('ru')}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm bg-zinc-800 text-zinc-400 rounded-lg disabled:opacity-30">←</button>
          <span className="px-3 py-1 text-sm text-zinc-400">Стр. {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={tournaments.length < 20} className="px-3 py-1 text-sm bg-zinc-800 text-zinc-400 rounded-lg disabled:opacity-30">→</button>
        </div>
      )}

      {/* Modals */}
      {showForm && renderForm()}
      {detail && !detailLoading && renderDetail()}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="text-white">Загрузка...</div>
        </div>
      )}
    </div>
  );
}
