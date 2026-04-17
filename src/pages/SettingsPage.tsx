import { useState, useEffect, useCallback } from 'react';
import {
  adminApi,
  type DisputeFeeConfig,
  type PlatformFeesConfig,
  type UsernameChangeConfig,
  type FeatureFlagsConfig,
  type FeatureModuleKey,
} from '../lib/api';
import { toast } from '../lib/toast';

// ─── Shared helpers ──────────────────────────────────────────

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-zinc-600';
const btnPrimary = 'px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50';
const SECTION = 'bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4';

const toEmbed = (url: string): string => {
  if (!url) return '';
  if (url.includes('/embed/')) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url;
};

const clampNumber = (raw: string, min: number, max: number): number | null => {
  if (raw.trim() === '') return null;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
};

type Tab = 'media' | 'fees' | 'username' | 'disputes' | 'modules';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'media', label: 'Медиа', icon: '🎬' },
  { id: 'fees', label: 'Комиссии', icon: '💰' },
  { id: 'username', label: 'Никнеймы', icon: '👤' },
  { id: 'disputes', label: 'Штраф за спор', icon: '⚖️' },
  { id: 'modules', label: 'Модули', icon: '🚦' },
];

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('media');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">⚙️ Настройки</h1>
        <p className="text-zinc-500 text-sm mt-1">Глобальные параметры платформы</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${
              tab === t.id
                ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-400'
                : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'media' && <MediaSection />}
      {tab === 'fees' && <PlatformFeesSection />}
      {tab === 'username' && <UsernameChangeSection />}
      {tab === 'disputes' && <DisputeFeeSection />}
      {tab === 'modules' && <FeatureFlagsSection />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Media (YouTube instructions)
// ═══════════════════════════════════════════════════════════════

function MediaSection() {
  const [videoAndroid, setVideoAndroid] = useState('');
  const [videoIos, setVideoIos] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getConfig()
      .then(cfg => {
        setVideoAndroid(cfg.video_android || '');
        setVideoIos(cfg.video_ios || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateConfig({
        video_android: videoAndroid.trim(),
        video_ios: videoIos.trim(),
      });
      toast.success('Видео-инструкции сохранены');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  if (loading) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;

  return (
    <div className={SECTION}>
      <div>
        <h2 className="text-white font-semibold text-sm mb-1">🎬 Видео для чата турниров</h2>
        <p className="text-zinc-500 text-xs">YouTube embed-ссылки для Android и iOS инструкций.</p>
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

      {(videoAndroid || videoIos) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videoAndroid && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">Android превью:</p>
              <div className="rounded-lg overflow-hidden border border-zinc-700 relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe className="absolute inset-0 w-full h-full" src={toEmbed(videoAndroid)} title="Android" />
              </div>
            </div>
          )}
          {videoIos && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">iOS превью:</p>
              <div className="rounded-lg overflow-hidden border border-zinc-700 relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe className="absolute inset-0 w-full h-full" src={toEmbed(videoIos)} title="iOS" />
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className={btnPrimary}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Platform fees (marketplace commission)
// ═══════════════════════════════════════════════════════════════

const MARKET_LABELS: Record<'account' | 'boost' | 'rental', string> = {
  account: '🎮 Аккаунты',
  boost: '🚀 Бусты',
  rental: '🏠 Аренда',
};

function PlatformFeesSection() {
  const [config, setConfig] = useState<PlatformFeesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getPlatformFeesConfig()
      .then(({ config }) => setConfig(config))
      .catch(err => toast.error(err?.message || 'Не удалось загрузить комиссии'))
      .finally(() => setLoading(false));
  }, []);

  const updateDefault = (raw: string) => {
    const n = clampNumber(raw, 0, 50);
    setConfig(prev => prev ? { ...prev, defaultPct: n ?? 0 } : prev);
  };
  const updateOverride = (k: 'account' | 'boost' | 'rental', raw: string) => {
    const n = clampNumber(raw, 0, 50);
    setConfig(prev => prev ? { ...prev, perTypePct: { ...prev.perTypePct, [k]: n } } : prev);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { config: saved } = await adminApi.updatePlatformFeesConfig(config);
      setConfig(saved);
      toast.success('Комиссии сохранены');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  if (loading || !config) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;

  return (
    <div className={SECTION}>
      <div>
        <h2 className="text-white font-semibold text-sm mb-1">💰 Комиссия платформы</h2>
        <p className="text-zinc-500 text-xs">
          Процент, который сайт удерживает с каждой сделки. Продавец получает <b className="text-zinc-300">100% − комиссия</b>.
          Лимит: 0–50%.
        </p>
      </div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">Комиссия по умолчанию (%)</label>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={50} step={0.1}
            value={config.defaultPct}
            onChange={e => updateDefault(e.target.value)}
            className={inp} />
          <span className="text-zinc-500 text-sm">%</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          Применяется ко всем типам сделок, если нет переопределения ниже.
        </p>
      </div>

      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Переопределения по типу</p>
        {(['account', 'boost', 'rental'] as const).map(type => {
          const override = config.perTypePct[type];
          const effective = override !== null ? override : config.defaultPct;
          return (
            <div key={type} className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white">{MARKET_LABELS[type]}</span>
                <span className="text-xs text-zinc-500">
                  Эффективно: <span className="text-emerald-400 font-semibold">{effective.toFixed(2)}%</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={50} step={0.1}
                  value={override ?? ''}
                  placeholder={`По умолчанию (${config.defaultPct}%)`}
                  onChange={e => updateOverride(type, e.target.value)}
                  className={`${inp} flex-1`} />
                <button
                  onClick={() => updateOverride(type, '')}
                  disabled={override === null}
                  className="px-3 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg disabled:opacity-30 whitespace-nowrap"
                >
                  Сброс
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <p className="text-amber-400 text-xs leading-relaxed">
          ⚠️ Изменения применятся только к <b>новым сделкам</b>. Активные сделки сохранят комиссию, зафиксированную на момент начала.
        </p>
      </div>

      <button onClick={handleSave} disabled={saving} className={btnPrimary}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Username change price
// ═══════════════════════════════════════════════════════════════

function UsernameChangeSection() {
  const [config, setConfig] = useState<UsernameChangeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getUsernameChangeConfig()
      .then(({ config }) => setConfig(config))
      .catch(err => toast.error(err?.message || 'Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { config: saved } = await adminApi.updateUsernameChangeConfig(config);
      setConfig(saved);
      toast.success('Настройки смены никнейма сохранены');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  if (loading || !config) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;

  return (
    <div className={SECTION}>
      <div>
        <h2 className="text-white font-semibold text-sm mb-1">👤 Смена никнейма</h2>
        <p className="text-zinc-500 text-xs">Правила и цена смены никнейма для пользователей.</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none bg-zinc-800/50 border border-zinc-800 rounded-lg p-3">
        <input type="checkbox" checked={config.firstFree}
          onChange={e => setConfig({ ...config, firstFree: e.target.checked })}
          className="w-4 h-4 accent-emerald-500" />
        <div>
          <p className="text-sm text-white font-medium">Первая смена бесплатная</p>
          <p className="text-[10px] text-zinc-500">Каждый пользователь может один раз сменить ник без оплаты.</p>
        </div>
      </label>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">💵 Цена за платную смену (USD)</label>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={1000} step={0.01}
            value={config.priceUsd}
            onChange={e => setConfig({ ...config, priceUsd: Math.max(0, Math.min(1000, parseFloat(e.target.value) || 0)) })}
            className={inp} />
          <span className="text-zinc-500 text-sm">USD</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          {config.firstFree
            ? 'Списывается со второй и последующих смен.'
            : 'Списывается с каждой смены (включая первую).'}
        </p>
      </div>

      <button onClick={handleSave} disabled={saving} className={btnPrimary}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Dispute fee (extracted from previous version)
// ═══════════════════════════════════════════════════════════════

const DISPUTE_LABELS: Record<'account' | 'boost' | 'rental', string> = {
  account: '🎮 Аккаунты',
  boost: '🚀 Бусты',
  rental: '🏠 Аренда',
};

function DisputeFeeSection() {
  const [config, setConfig] = useState<DisputeFeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getDisputeFeeConfig()
      .then(({ config }) => setConfig(config))
      .catch(err => toast.error(err?.message || 'Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<DisputeFeeConfig>) => setConfig(prev => prev ? { ...prev, ...patch } : prev);
  const updatePerTypeEnabled = (k: 'account' | 'boost' | 'rental', v: boolean) =>
    setConfig(prev => prev ? { ...prev, perTypeEnabled: { ...prev.perTypeEnabled, [k]: v } } : prev);
  const updatePerTypeAmount = (k: 'account' | 'boost' | 'rental', raw: string) => {
    const n = clampNumber(raw, 0, 1000);
    setConfig(prev => prev ? { ...prev, perTypeAmount: { ...prev.perTypeAmount, [k]: n } } : prev);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { config: saved } = await adminApi.updateDisputeFeeConfig(config);
      setConfig(saved);
      toast.success('Штрафы за спор сохранены');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  if (loading || !config) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;

  return (
    <div className={SECTION}>
      <div>
        <h2 className="text-white font-semibold text-sm mb-1">⚖️ Штраф за ложную жалобу</h2>
        <p className="text-zinc-500 text-xs">
          Сумма в USD, которая списывается с проигравшей стороны спора (или с подавшего ложную жалобу при отклонении админом).
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={config.enabled}
          onChange={e => update({ enabled: e.target.checked })}
          className="w-4 h-4 accent-emerald-500" />
        <span className="text-sm text-white font-medium">Штрафы включены</span>
        {!config.enabled && <span className="text-xs text-amber-400">(выключено — ничего не списывается)</span>}
      </label>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">💵 Сумма по умолчанию (USD)</label>
        <input type="number" min={0} max={1000} step={0.01}
          value={config.amountUsd}
          onChange={e => update({ amountUsd: Math.max(0, Math.min(1000, parseFloat(e.target.value) || 0)) })}
          className={inp} />
      </div>

      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Переопределения по типу</p>
        {(['account', 'boost', 'rental'] as const).map(type => {
          const override = config.perTypeAmount[type];
          const effective = config.perTypeEnabled[type]
            ? (override !== null ? override : config.amountUsd)
            : 0;
          return (
            <div key={type} className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={config.perTypeEnabled[type]}
                    onChange={e => updatePerTypeEnabled(type, e.target.checked)}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-sm text-white">{DISPUTE_LABELS[type]}</span>
                </label>
                <span className="text-xs text-zinc-500">
                  Эффективно: <span className={effective > 0 ? 'text-emerald-400 font-semibold' : 'text-zinc-600'}>${effective.toFixed(2)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={1000} step={0.01}
                  value={override ?? ''}
                  placeholder={`По умолчанию ($${config.amountUsd.toFixed(2)})`}
                  onChange={e => updatePerTypeAmount(type, e.target.value)}
                  disabled={!config.perTypeEnabled[type]}
                  className={`${inp} flex-1 disabled:opacity-40`} />
                <button
                  onClick={() => updatePerTypeAmount(type, '')}
                  disabled={override === null || !config.perTypeEnabled[type]}
                  className="px-3 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg disabled:opacity-30 whitespace-nowrap"
                >
                  Сброс
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving} className={btnPrimary}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Feature flags (kill-switches)
// ═══════════════════════════════════════════════════════════════

const MODULE_META: { key: FeatureModuleKey; icon: string; label: string; description: string }[] = [
  { key: 'rental',            icon: '🏠', label: 'Аренда',             description: 'Сдача/аренда аккаунтов' },
  { key: 'account',           icon: '🎮', label: 'Аккаунты',           description: 'Продажа аккаунтов' },
  { key: 'boost',             icon: '🚀', label: 'Буст/Напарники',     description: 'Услуги буста и напарников' },
  { key: 'uc',                icon: '💎', label: 'Игровая валюта',     description: 'Покупка UC' },
  { key: 'tournaments',       icon: '🏆', label: 'Турниры',            description: 'TDM, WoW, Classic' },
  { key: 'globalTournaments', icon: '🌍', label: 'Глобальные турниры', description: 'Крупные турниры' },
  { key: 'clan',              icon: '🏰', label: 'Клан',               description: 'Заявки, башня, выплаты' },
  { key: 'withdrawal',        icon: '💸', label: 'Выводы',             description: 'Заявки на вывод средств' },
  { key: 'lessons',           icon: '📚', label: 'Обучение',           description: 'Уроки и курсы' },
  { key: 'quests',            icon: '📋', label: 'Задания',            description: 'Квесты и награды' },
  { key: 'support',           icon: '💬', label: 'Поддержка',          description: 'Чат с саппортом' },
];

function FeatureFlagsSection() {
  const [config, setConfig] = useState<FeatureFlagsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getFeatureFlagsConfig()
      .then(({ config }) => setConfig(config))
      .catch(err => toast.error(err?.message || 'Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { config: saved } = await adminApi.updateFeatureFlagsConfig(config);
      setConfig(saved);
      toast.success('Модули обновлены');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  const toggleModule = (k: FeatureModuleKey) => {
    setConfig(prev => prev ? { ...prev, modules: { ...prev.modules, [k]: !prev.modules[k] } } : prev);
  };

  const enableAll = () => {
    if (!config) return;
    setConfig({ ...config, modules: Object.fromEntries(MODULE_META.map(m => [m.key, true])) as Record<FeatureModuleKey, boolean> });
  };

  const flushCache = async () => {
    try {
      await adminApi.invalidateConfigCache();
      toast.success('Кеш настроек сброшен');
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка сброса кеша');
    }
  };

  if (loading || !config) return <p className="text-zinc-500 text-sm py-8 text-center">Загрузка...</p>;

  const disabledCount = MODULE_META.filter(m => config.modules[m.key] === false).length;

  return (
    <div className="space-y-6">
      {/* Maintenance mode */}
      <div className={SECTION}>
        <div>
          <h2 className="text-white font-semibold text-sm mb-1">🛠 Режим обслуживания</h2>
          <p className="text-zinc-500 text-xs">
            Полностью блокирует все модули для пользователей. Админы и модераторы продолжают работать как обычно.
          </p>
        </div>

        <label className={`flex items-start gap-3 cursor-pointer select-none rounded-lg p-3 border ${
          config.maintenance ? 'bg-red-500/10 border-red-500/40' : 'bg-zinc-800/50 border-zinc-800'
        }`}>
          <input type="checkbox" checked={config.maintenance}
            onChange={e => setConfig({ ...config, maintenance: e.target.checked })}
            className="w-4 h-4 accent-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">
              {config.maintenance ? '🔴 Режим обслуживания ВКЛЮЧЁН' : 'Выключен'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Когда включён, пользователи видят сообщение ниже при попытке работы с любым модулем.
            </p>
          </div>
        </label>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Сообщение для пользователей</label>
          <textarea
            value={config.maintenanceMessage}
            onChange={e => setConfig({ ...config, maintenanceMessage: e.target.value.slice(0, 500) })}
            placeholder="Раздел временно отключён. Попробуйте позже."
            rows={2}
            className={`${inp} resize-none`} />
          <p className="text-[10px] text-zinc-600 mt-1">{config.maintenanceMessage.length}/500</p>
        </div>
      </div>

      {/* Modules */}
      <div className={SECTION}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-white font-semibold text-sm mb-1">🚦 Модули</h2>
            <p className="text-zinc-500 text-xs">
              Если модуль сломался — выключи его здесь. Пользователь получит 503, админы продолжат работать.
            </p>
          </div>
          {disabledCount > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg whitespace-nowrap">
              Выключено: {disabledCount}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULE_META.map(m => {
            const enabled = config.modules[m.key] !== false;
            return (
              <label
                key={m.key}
                className={`flex items-start gap-3 cursor-pointer select-none rounded-lg p-3 border transition-colors ${
                  enabled
                    ? 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'
                    : 'bg-red-500/5 border-red-500/30'
                }`}
              >
                <input type="checkbox" checked={enabled}
                  onChange={() => toggleModule(m.key)}
                  className="w-4 h-4 accent-emerald-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium flex items-center gap-1.5">
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                    {!enabled && <span className="text-[10px] text-red-400 font-normal">(выключен)</span>}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{m.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            onClick={enableAll}
            className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-xl"
          >
            Включить все
          </button>
          <button
            onClick={flushCache}
            title="Принудительно перечитать настройки из БД (если редактировали напрямую)"
            className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-xl ml-auto"
          >
            🔄 Сбросить кеш
          </button>
        </div>

        {config.maintenance && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-400 text-xs">
              ⚠️ Режим обслуживания включён выше — настройки отдельных модулей пока игнорируются.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
