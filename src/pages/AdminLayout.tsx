import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Дашборд', icon: '📊', end: true },
  { path: '/users', label: 'Пользователи', icon: '👥' },
  { path: '/listings', label: 'Аренда', icon: '🔑' },
  { path: '/accounts', label: 'Аккаунты', icon: '🛒' },
  { path: '/boost', label: 'Буст/Напарники', icon: '🚀' },
  { path: '/uc', label: 'Игровая валюта', icon: '💎' },
  { path: '/tournaments', label: 'Турниры', icon: '🏆' },
  { path: '/global-tournaments', label: 'Глобальные турниры', icon: '🌍' },
  { path: '/clan', label: 'Клан', icon: '🏰' },
  { path: '/referral', label: 'Рефералы', icon: '🤝' },
  { path: '/quests', label: 'Задания', icon: '📋' },
  { path: '/lessons', label: 'Обучение', icon: '📚' },
  { path: '/ip-monitor', label: 'IP Monitor', icon: '🔍' },
  { path: '/finances', label: 'Финансы', icon: '💰' },
  { path: '/support', label: 'Поддержка', icon: '💬' },
  { path: '/banners', label: 'Банеры', icon: '🖼️' },
  { path: '/push', label: 'Push-уведомления', icon: '🔔' },
  { path: '/content', label: 'Контент', icon: '📢' },
  { path: '/settings', label: 'Настройки', icon: '⚙️' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            <span className="text-white font-bold text-lg">Админ</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Навигация */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
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
        <div className="p-4 border-t border-zinc-800 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <span className="text-lg">🚪</span>
            <span>Выйти</span>
          </button>
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
