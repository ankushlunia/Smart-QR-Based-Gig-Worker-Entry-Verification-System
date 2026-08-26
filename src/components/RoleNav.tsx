import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, Smartphone, LayoutDashboard, Zap, Sparkles, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiUrl } from '../utils/api';

export const RoleNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { connected, showToast, refreshData } = useApp();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    return () => clearInterval(timer);
  }, []);

  const handleSimulateQuickEntry = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(apiUrl('/api/demo/simulate-entry'), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`🚀 Demo Entry Simulated! Driver: ${data.entry.driverName} (${data.entry.company})`, 'success');
        refreshData();
      }
    } catch (e) {
      showToast('Error simulating demo entry', 'warning');
    } finally {
      setIsSimulating(false);
    }
  };

  const isPath = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand & Live Clock */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            <Shield className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                GATEPASS <span className="text-blue-500 text-sm font-semibold tracking-wider uppercase ml-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">Smart QR</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                <Radio className="w-3 h-3 animate-ping" />
                {connected ? 'REALTIME SYNC' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Campus Gate Verification • <span className="text-blue-400 font-semibold">{currentTime}</span>
            </p>
          </div>
        </div>

        {/* Interface Selector Tabs */}
        <nav className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
          <Link
            to="/admin"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isPath('/admin') || isPath('/')
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Admin God Mode</span>
          </Link>

          <Link
            to="/guard"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isPath('/guard')
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Guard Portal</span>
          </Link>

          <Link
            to="/entry"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isPath('/entry')
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Driver Entry Page</span>
          </Link>
        </nav>

        {/* Quick Demo Action Trigger */}
        <button
          onClick={handleSimulateQuickEntry}
          disabled={isSimulating}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Simulating...' : 'Simulate Driver Scan'}</span>
        </button>

      </div>
    </header>
  );
};
