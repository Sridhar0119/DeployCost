import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Configure from './pages/Configure';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import SettingsPage from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import { Rocket, Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  // 1. Loading Splash Screen
  if (loading) {
    return (
      <div id="app-loading-splash" className="min-h-screen bg-[#F1EFE8] flex flex-col justify-center items-center space-y-4">
        <div className="flex items-center space-x-2.5">
          <Rocket className="w-9 h-9 text-[#534AB7] animate-pulse" />
          <span className="font-sans font-extrabold text-2xl tracking-tight text-[#2C2C2A]">DeployCost</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-purple" />
          <span className="font-sans text-xs font-semibold">Securing team workspace credentials...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Layout Flow
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 3. Authenticated Responsive Layout Flow
  return (
    <div id="app-dashboard-layout" className="min-h-screen bg-[#F1EFE8] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Context Stage area */}
      <main 
        id="app-main-content-area" 
        className="flex-1 px-4 py-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full"
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/configure" element={<Configure />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
}
