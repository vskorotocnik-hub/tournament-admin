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

function ProtectedRoutes() {
  const { isAuthenticated, isStaff, loading } = useAuth();

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
        <Route path="support" element={<SupportPage />} />
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
