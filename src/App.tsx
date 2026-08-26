import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { HomePage } from './pages/HomePage';
import { OfficialLogin } from './pages/OfficialLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { GuardPortal } from './pages/GuardPortal';
import { DriverPortal } from './pages/DriverPortal';
import { DriverEntry } from './pages/DriverEntry';
import {
  CheckCircle2, AlertTriangle, Info, LayoutDashboard, ShieldCheck,
  LogOut, Radio, Clock
} from 'lucide-react';

// ── Toast Notification ─────────────────────────────────
const Toast: React.FC = () => {
  const { toastMessage } = useApp();
  if (!toastMessage) return null;

  const colorMap = {
    info: 'from-blue-600/90 to-indigo-600/90 border-blue-500/30',
    success: 'from-emerald-600/90 to-teal-600/90 border-emerald-500/30',
    warning: 'from-rose-600/90 to-red-600/90 border-rose-500/30'
  };
  const iconMap = {
    info: <Info className="w-4 h-4 text-blue-200" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-200" />,
    warning: <AlertTriangle className="w-4 h-4 text-rose-200" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] animate-slideUp">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r ${colorMap[toastMessage.type]} border backdrop-blur-xl shadow-2xl max-w-md`}>
        {iconMap[toastMessage.type]}
        <span className="text-sm font-semibold text-white">{toastMessage.text}</span>
      </div>
    </div>
  );
};

// ── Authenticated Top Bar (for Admin & Guard) ──────────
const AuthHeader: React.FC<{
  role: 'official' | 'guard';
  onLogout: () => void;
}> = ({ role, onLogout }) => {
  const { connected } = useApp();
  const [currentTime, setCurrentTime] = React.useState('');

  React.useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10 ${
            role === 'official'
              ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-blue-500/20'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
          }`}>
            {role === 'official' ? <LayoutDashboard className="w-4.5 h-4.5 text-white" /> : <ShieldCheck className="w-4.5 h-4.5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                GATEPASS
              </span>
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                role === 'official'
                  ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                {role === 'official' ? 'Admin Panel' : 'Guard Portal'}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <Radio className="w-2.5 h-2.5 animate-ping" />
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {currentTime}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

// ── Main App Routing Shell with Persistent Sessions ───
const AppShell: React.FC = () => {
  const { activeGuard, logoutGuard } = useApp();

  // Initialize screen from localStorage
  const [screen, setScreen] = useState<'home' | 'official-login' | 'guard-login' | 'driver-portal' | 'admin' | 'guard'>(() => {
    try {
      if (localStorage.getItem('gatepass_official_auth') === 'true') {
        return 'admin';
      }
      if (localStorage.getItem('gatepass_guard')) {
        return 'guard';
      }
      if (localStorage.getItem('gatepass_driver')) {
        return 'driver-portal';
      }
    } catch {}
    return 'home';
  });

  const handleSelectRole = (role: 'official' | 'guard' | 'driver') => {
    if (role === 'official') setScreen('official-login');
    else if (role === 'guard') setScreen('guard-login');
    else if (role === 'driver') setScreen('driver-portal');
  };

  const handleOfficialLogin = () => {
    localStorage.setItem('gatepass_official_auth', 'true');
    setScreen('admin');
  };

  const handleOfficialLogout = () => {
    localStorage.removeItem('gatepass_official_auth');
    setScreen('home');
  };

  const handleGuardLogout = () => {
    logoutGuard();
    setScreen('home');
  };

  return (
    <Routes>
      {/* Driver Entry — always accessible via QR scan link */}
      <Route path="/entry" element={<DriverEntry />} />

      {/* Role-based workflows */}
      <Route
        path="*"
        element={
          <>
            {/* HOME — 3 Role Options */}
            {screen === 'home' && <HomePage onSelectRole={handleSelectRole} />}

            {/* OFFICIAL LOGIN */}
            {screen === 'official-login' && (
              <OfficialLogin
                onLogin={handleOfficialLogin}
                onBack={() => setScreen('home')}
              />
            )}

            {/* GUARD LOGIN + PORTAL */}
            {screen === 'guard-login' && (
              <GuardPortalWrapper onBack={() => setScreen('home')} />
            )}

            {/* OTHER / GIG WORKER PORTAL */}
            {screen === 'driver-portal' && (
              <DriverPortal onBack={() => setScreen('home')} />
            )}

            {/* ADMIN DASHBOARD (authenticated) */}
            {screen === 'admin' && (
              <>
                <AuthHeader role="official" onLogout={handleOfficialLogout} />
                <main className="min-h-[calc(100vh-56px)]">
                  <AdminDashboard />
                </main>
              </>
            )}

            {/* GUARD PORTAL (authenticated) */}
            {screen === 'guard' && (
              <>
                <AuthHeader role="guard" onLogout={handleGuardLogout} />
                <main className="min-h-[calc(100vh-56px)]">
                  <GuardPortal />
                </main>
              </>
            )}
          </>
        }
      />
    </Routes>
  );
};

// ── Guard Portal Wrapper with back-to-home ─────────────
const GuardPortalWrapper: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition group bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>
      <GuardPortal />
    </div>
  );
};

// ── Root App ───────────────────────────────────────────
const AppRoutes: React.FC = () => (
  <>
    <AppShell />
    <Toast />
  </>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  </BrowserRouter>
);

export default App;
