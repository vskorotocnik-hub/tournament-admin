import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, type TwoFaStatus } from '../lib/api';

/**
 * Sidebar navigation. Each item declares the capability required to SEE
 * the link (ADMIN is a wildcard, so admins always see everything). If a
 * moderator lacks the capability the link is hidden AND the route's
 * endpoints 403 — the sidebar filter is just UX, not a security gate.
 */
type NavItem = { path: string; label: string; icon: string; end?: boolean; cap?: string };

const navItems: NavItem[] = [
  { path: '/', label: 'Дашборд', icon: '📊', end: true, cap: 'dashboard.view' },
  { path: '/users', label: 'Пользователи', icon: '👥', cap: 'users.view' },
  { path: '/listings', label: 'Аренда', icon: '🔑', cap: 'rental.view' },
  { path: '/accounts', label: 'Аккаунты', icon: '🛒', cap: 'listings.view' },
  { path: '/boost', label: 'Буст/Напарники', icon: '🚀', cap: 'boost.view' },
  { path: '/uc', label: 'Игровая валюта', icon: '💎', cap: 'listings.view' },
  { path: '/tournaments', label: 'Турниры', icon: '🏆', cap: 'tournaments.view' },
  { path: '/global-tournaments', label: 'Глобальные турниры', icon: '🌍', cap: 'tournaments.global' },
  { path: '/clan', label: 'Клан', icon: '🏰', cap: 'clan.view' },
  { path: '/referral', label: 'Рефералы', icon: '🤝', cap: 'referrals.view' },
  { path: '/quests', label: 'Задания', icon: '📋', cap: 'quests.view' },
  { path: '/lessons', label: 'Обучение', icon: '📚', cap: 'lessons.view' },
  { path: '/ip-monitor', label: 'IP Monitor', icon: '🔍', cap: 'ip_monitor.view' },
  { path: '/finances', label: 'Финансы', icon: '💰', cap: 'finances.view' },
  { path: '/support', label: 'Поддержка', icon: '💬', cap: 'support.view' },
  { path: '/banners', label: 'Банеры', icon: '🖼️', cap: 'banners.view' },
  { path: '/push', label: 'Push-уведомления', icon: '🔔', cap: 'push.send' },
  { path: '/audit', label: 'Аудит', icon: '📜', cap: 'audit.view' },
  { path: '/security', label: 'Безопасность', icon: '🔐', cap: 'security.view' },
  { path: '/staff', label: 'Персонал', icon: '👮', cap: 'staff.view' },
  { path: '/settings', label: 'Настройки', icon: '⚙️', cap: 'settings.view' },
];

// Build-time constants injected by vite (see vite.config.ts)
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const APP_COMMIT = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'local';
const APP_BUILD_TIME = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isModerator, hasCapability, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter the sidebar by capabilities. Admins are wildcard (hasCapability
  // returns true for everything) so they see every link. Moderators only
  // see links whose capability they hold. Items without a cap are always
  // visible (there shouldn't be any now, but keep it forward-compatible).
  const visibleNavItems = navItems.filter(item => !item.cap || hasCapability(item.cap));

  // 2FA gating: privileged roles must enable 2FA before they can use anything.
  const [twoFa, setTwoFa] = useState<TwoFaStatus | null>(null);
  useEffect(() => {
    authApi.twofaStatus().then(setTwoFa).catch(() => {});
  }, [user?.id, location.pathname]);

  const mustSetup2fa = !!twoFa && twoFa.required && !twoFa.enabled;
  useEffect(() => {
    if (mustSetup2fa && location.pathname !== '/security') {
      navigate('/security', { replace: true });
    }
  }, [mustSetup2fa, location.pathname, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Затемнение фона на мобилке */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Боковая панель */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Лого */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">G</div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-lg">{isModerator ? 'Модератор' : 'Админ'}</span>
              {isModerator && (
                <span className="text-[10px] text-amber-400/90">ограниченный доступ</span>
              )}
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Навигация */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Низ */}
        <div className="p-4 border-t border-zinc-800 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <span className="text-lg">🚪</span>
            <span>Выйти</span>
          </button>
          <div
            className="px-3 text-[10px] leading-tight text-zinc-600 select-text"
            title={APP_BUILD_TIME ? `Собрано: ${new Date(APP_BUILD_TIME).toLocaleString('ru-RU')}` : undefined}
          >
            <div>
              v{APP_VERSION} · <span className="font-mono">{APP_COMMIT}</span>
            </div>
            {APP_BUILD_TIME && (
              <div className="text-zinc-700 truncate">
                {new Date(APP_BUILD_TIME).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Верхняя панель */}
        <header className="h-16 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-zinc-400 hover:text-white p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-zinc-400 text-sm">{user?.username || 'Администратор'}</span>
          </div>
        </header>

        {/* Контент страницы */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
