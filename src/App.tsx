import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Toaster from './components/Toaster';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RentalManagementPage from './pages/RentalManagementPage';
import UnifiedTournamentsPage from './pages/UnifiedTournamentsPage';
import SupportPage from './pages/SupportPage';
import ClanManagementPage from './pages/ClanManagementPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import CurrencyPage from './pages/CurrencyPage';
import AccountManagementPage from './pages/AccountManagementPage';
import BoostManagementPage from './pages/BoostManagementPage';
import SettingsPage from './pages/SettingsPage';
import StaffPage from './pages/StaffPage';
import IpWhitelistPage from './pages/IpWhitelistPage';
import UcManagementPage from './pages/UcManagementPage';
import ReferralStatsPage from './pages/ReferralStatsPage';
import QuestsPage from './pages/QuestsPage';
import IpMonitorPage from './pages/IpMonitorPage';
import LessonsPage from './pages/LessonsPage';
import BannersPage from './pages/BannersPage';
import PushPage from './pages/PushPage';
import GlobalTournamentsPage from './pages/GlobalTournamentsPage';
import AuditLogPage from './pages/AuditLogPage';
import SecurityPage from './pages/SecurityPage';
import ModerationPage from './pages/ModerationPage';

function ProtectedRoutes() {
  const { isAuthenticated, isStaff, loading, ipBlock } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="w-10 h-10 animate-spin text-emerald-400 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-zinc-500 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  // IP whitelist block: stored session is valid but this IP isn't
  // approved. Render a single dedicated screen so no admin page mounts
  // and floods DevTools with 403s.
  if (ipBlock) {
    return <IpBlockedScreen block={ipBlock} />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!isStaff) {
    return <AccessDeniedScreen />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="listings" element={<RentalManagementPage />} />
        <Route path="accounts" element={<AccountManagementPage />} />
        <Route path="boost" element={<BoostManagementPage />} />
        <Route path="uc" element={<UcManagementPage />} />
        <Route path="tournaments" element={<UnifiedTournamentsPage />} />
        <Route path="clan" element={<ClanManagementPage />} />
        <Route path="finances" element={<WithdrawalsPage />} />
        <Route path="currency" element={<CurrencyPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="referral" element={<ReferralStatsPage />} />
        <Route path="quests" element={<QuestsPage />} />
        <Route path="ip-monitor" element={<IpMonitorPage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="push" element={<PushPage />} />
        <Route path="global-tournaments" element={<GlobalTournamentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="ip-whitelist" element={<IpWhitelistPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="security" element={<SecurityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function IpBlockedScreen({ block }: { block: { ip: string; status: string; message: string } }) {
  const { refreshUser, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const isPending = block.status === 'PENDING';
  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refreshUser();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
          <span className="text-4xl">🛡️</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">
            {isPending ? 'Ожидание одобрения IP' : 'IP не одобрен'}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">{block.message}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-left">
          <p className="text-zinc-400 text-xs mb-1">Ваш IP:</p>
          <p className="text-amber-300 font-mono text-sm">{block.ip}</p>
          <p className="text-zinc-500 text-xs mt-2">
            Статус: <span className="text-zinc-300">{block.status}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {retrying ? 'Проверяем…' : '🔄 Проверить ещё раз'}
          </button>
          <button
            onClick={logout}
            className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-1"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessDeniedScreen() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-5xl">🚫</p>
        <h1 className="text-xl font-bold text-white">Доступ запрещён</h1>
        <p className="text-zinc-500 text-sm">У вашего аккаунта нет прав персонала</p>
        <p className="text-zinc-600 text-xs">Роль: {user?.role || 'неизвестно'}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
