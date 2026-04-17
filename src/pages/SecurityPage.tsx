import { useEffect, useState } from 'react';
import { adminApi as _adminApi, authApi, type TwoFaStatus, type TwoFaSetupResponse } from '../lib/api';
import { toast } from '../lib/toast';

// Suppress unused import — kept for future auditing hooks if this page
// starts reading audit entries about 2FA itself.
void _adminApi;

/**
 * 2FA management page. Flow:
 *  1. Loads current status.
 *  2. If not enabled, user presses "Включить" → gets QR + secret (setup).
 *  3. User enters a code → verify → backup codes shown ONCE.
 *  4. From the enabled state the user can disable 2FA or regenerate backup codes
 *     (both require a fresh code).
 */
export default function SecurityPage() {
  const [status, setStatus] = useState<TwoFaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const s = await authApi.twofaStatus();
      setStatus(s);
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось получить статус 2FA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleStartSetup = async () => {
    setBusy(true);
    try {
      const data = await authApi.twofaSetup();
      setSetupData(data);
      setCode('');
      setBackupCodes(null);
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось запустить настройку');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { backupCodes: codes } = await authApi.twofaVerify(code.trim());
      setBackupCodes(codes);
      setSetupData(null);
      setCode('');
      toast.success('2FA включена');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Неверный код');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!code.trim()) return;
    if (status?.required && !window.confirm(
      'Для вашей роли 2FA обязательна. После отключения вы будете вынуждены настроить её заново при следующем запросе. Продолжить?'
    )) return;
    setBusy(true);
    try {
      await authApi.twofaDisable(code.trim());
      setCode('');
      toast.success('2FA отключена');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось отключить');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenBackup = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { backupCodes: codes } = await authApi.twofaRegenBackup(code.trim());
      setBackupCodes(codes);
      setCode('');
      toast.success('Резервные коды обновлены');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось обновить коды');
    } finally {
      setBusy(false);
    }
  };

  const copyBackup = () => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Коды скопированы');
  };

  if (loading) {
    return <div className="text-zinc-500 text-sm">Загрузка...</div>;
  }

  const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-zinc-600';
  const btn = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">🔐 Безопасность</h1>
        <p className="text-zinc-500 text-sm mt-1">Двухфакторная аутентификация защищает ваш аккаунт даже при утечке пароля.</p>
      </div>

      {/* Status card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Двухфакторная аутентификация</h3>
            {status?.enabled ? (
              <p className="text-emerald-400 text-xs mt-0.5">
                ✓ Включена {status.enabledAt ? `• ${new Date(status.enabledAt).toLocaleDateString('ru-RU')}` : ''}
              </p>
            ) : (
              <p className="text-amber-400 text-xs mt-0.5">
                ⚠ Отключена{status?.required ? ' — обязательна для вашей роли' : ''}
              </p>
            )}
          </div>
          {status?.enabled && (
            <span className="text-xs text-zinc-500">
              Резервных кодов: <b className="text-white">{status.backupCodesRemaining}</b>
            </span>
          )}
        </div>

        {status?.required && !status.enabled && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs">
            Для ролей ADMIN и MODERATOR 2FA является обязательной. Доступ к админ-панели будет заблокирован до тех пор, пока вы не завершите настройку.
          </div>
        )}
      </div>

      {/* Backup codes display — shown once after enabling or regen */}
      {backupCodes && (
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold">🔑 Сохраните резервные коды</h3>
          <p className="text-zinc-400 text-xs">
            Эти коды — одноразовые. Используйте их если потеряете доступ к приложению-аутентификатору.
            После закрытия этой страницы показать их снова будет невозможно.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map(c => (
              <div key={c} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-emerald-300 tracking-wider">
                {c}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={copyBackup} className={`${btn} bg-zinc-800 hover:bg-zinc-700 text-white`}>📋 Копировать</button>
            <button onClick={() => setBackupCodes(null)} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>Я сохранил(а)</button>
          </div>
        </div>
      )}

      {/* Setup flow */}
      {!status?.enabled && !setupData && !backupCodes && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold">Включить 2FA</h3>
          <p className="text-zinc-400 text-sm">
            Установите приложение-аутентификатор — <b className="text-white">Google Authenticator</b>, <b className="text-white">Authy</b>, <b className="text-white">1Password</b> или любой аналог с поддержкой TOTP.
          </p>
          <button onClick={handleStartSetup} disabled={busy} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>
            {busy ? 'Подготовка...' : 'Сгенерировать QR-код'}
          </button>
        </div>
      )}

      {setupData && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold">1. Отсканируйте QR в приложении</h3>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <img src={setupData.qrDataUrl} alt="2FA QR" className="w-48 h-48 rounded-lg bg-white p-2" />
            <div className="flex-1 space-y-2">
              <p className="text-zinc-400 text-xs">Либо введите секрет вручную:</p>
              <div className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-emerald-300 font-mono text-sm break-all">
                {setupData.secret}
              </div>
            </div>
          </div>
          <h3 className="text-white font-semibold">2. Введите код из приложения</h3>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="123456"
              className={`${inp} flex-1 text-lg font-mono tracking-widest text-center`}
            />
            <button onClick={handleVerifySetup} disabled={busy || code.length !== 6} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>
              {busy ? '...' : 'Подтвердить'}
            </button>
          </div>
          <button onClick={() => { setSetupData(null); setCode(''); }} className="text-zinc-500 hover:text-zinc-300 text-sm">
            Отмена
          </button>
        </div>
      )}

      {/* Manage enabled 2FA */}
      {status?.enabled && !backupCodes && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold">Управление 2FA</h3>
          <p className="text-zinc-400 text-xs">Для любого действия подтвердите его текущим 6-значным кодом из приложения (или резервным кодом).</p>
          <div>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '').toUpperCase())}
              placeholder="Код 2FA"
              className={`${inp} w-full text-center font-mono tracking-widest`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleRegenBackup} disabled={busy || !code.trim()} className={`${btn} bg-blue-600 hover:bg-blue-500 text-white`}>
              🔄 Новые резервные коды
            </button>
            <button onClick={handleDisable} disabled={busy || !code.trim()} className={`${btn} bg-red-600/80 hover:bg-red-500 text-white`}>
              🚫 Отключить 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
