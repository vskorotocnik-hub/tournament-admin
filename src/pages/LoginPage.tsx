import { useState, type FormEvent } from 'react';
import { useAuth, type TwoFactorChallenge } from '../context/AuthContext';
import { ApiError } from '../lib/api';

/**
 * IP-based login blocks come back from the backend as ApiError with
 * `code === 'IP_NOT_APPROVED'` and a payload carrying `{ status, ip,
 * message }`. We render a dedicated banner for them instead of the
 * generic red error so the user knows to contact the owner.
 */
interface IpBlock {
  ip: string;
  status: 'PENDING' | 'REJECTED';
  message: string;
}

function extractIpBlock(err: unknown): IpBlock | null {
  if (!(err instanceof ApiError) || err.code !== 'IP_NOT_APPROVED') return null;
  const p = err.payload || {};
  return {
    ip: String(p.ip || 'unknown'),
    status: (p.status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
    message: String(p.message || err.message),
  };
}

export default function AdminLoginPage() {
  const { login, verify2fa } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ipBlock, setIpBlock] = useState<IpBlock | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA second step
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [otpCode, setOtpCode] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIpBlock(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.challenge) {
        setChallenge(result.challenge);
      }
    } catch (err) {
      const ip = extractIpBlock(err);
      if (ip) { setIpBlock(ip); setChallenge(null); }
      else setError(err instanceof ApiError ? err.message : 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setError('');
    setIpBlock(null);
    setLoading(true);
    try {
      await verify2fa(challenge.pending2faToken, otpCode.trim());
    } catch (err) {
      const ip = extractIpBlock(err);
      if (ip) { setIpBlock(ip); setChallenge(null); }
      else setError(err instanceof ApiError ? err.message : 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const cancelChallenge = () => {
    setChallenge(null);
    setOtpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">G</div>
          <h1 className="text-2xl font-bold text-white">Панель управления</h1>
          <p className="text-zinc-500 text-sm mt-1">Вход только для администраторов</p>
        </div>

        {challenge ? (
          <form onSubmit={handle2faSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300 text-sm">
              Привет, <b>{challenge.username}</b>! Введите 6-значный код из приложения-аутентификатора.
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-400 block mb-1.5">Код 2FA</label>
              <input
                type="text"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '').toUpperCase())}
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456 или резервный код"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-mono tracking-widest text-center placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <p className="text-[11px] text-zinc-600 mt-2">
                Потеряли доступ к приложению? Введите один из ранее сохранённых резервных кодов.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !otpCode.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
            <button
              type="button"
              onClick={cancelChallenge}
              className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              ← Назад ко входу
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {ipBlock && (
              <div className={`rounded-xl border px-4 py-3 text-sm space-y-1.5 ${
                ipBlock.status === 'PENDING'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-red-500/10 border-red-500/30 text-red-200'
              }`}>
                <div className="font-semibold">
                  {ipBlock.status === 'PENDING' ? '⏳ Ждёт одобрения' : '🚫 IP заблокирован'}
                </div>
                <div className="text-xs opacity-90">{ipBlock.message}</div>
                <div className="text-xs opacity-70">
                  Ваш IP: <code className="font-mono">{ipBlock.ip}</code>
                </div>
              </div>
            )}
            {error && !ipBlock && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-zinc-400 block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-400 block mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        )}

        <p className="text-center text-zinc-600 text-xs mt-6">
          Доступ ограничен. Только для роли ADMIN.
        </p>
      </div>
    </div>
  );
}
