import React, { useState } from 'react';
import {
  Shield, ShieldCheck, LayoutDashboard, ChevronRight, Zap,
  Lock, QrCode, Users, Eye, Smartphone, Radio, Truck, MessageSquare
} from 'lucide-react';

interface HomePageProps {
  onSelectRole: (role: 'official' | 'guard' | 'driver') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectRole }) => {
  const [hoveredRole, setHoveredRole] = useState<'official' | 'guard' | 'driver' | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  React.useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden">

      {/* Animated Background Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-600/3 blur-[100px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl space-y-10">

        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-semibold tracking-wider uppercase mb-1">
            <Radio className="w-3 h-3 text-emerald-400 animate-ping" />
            <span>Campus GatePass Network • Live</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">{currentTime}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-600/20 ring-2 ring-white/10">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Smart Campus <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">GatePass</span>
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Role-based digital access and verification network for campus security and delivery personnel.
          </p>
        </div>

        {/* 3 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* 1. College Official / Admin Card */}
          <button
            onClick={() => onSelectRole('official')}
            onMouseEnter={() => setHoveredRole('official')}
            onMouseLeave={() => setHoveredRole(null)}
            className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              hoveredRole === 'official'
                ? 'bg-blue-600/10 border-blue-500/40 shadow-2xl shadow-blue-600/10 scale-[1.02]'
                : 'glass-panel border-slate-800 hover:border-blue-500/30'
            }`}
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:shadow-xl group-hover:shadow-blue-600/30 transition-shadow">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-600 transition-all duration-300 ${hoveredRole === 'official' ? 'text-blue-400 translate-x-1' : ''}`} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-blue-100 transition-colors">
                  College Official
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Admin & Central Monitoring</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5 text-blue-400/60" />
                  <span>Centralized God Mode dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-blue-400/60" />
                  <span>Guard duty sessions & driver audit</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-blue-400/60" />
                  <span>Incident queue & complaint resolution</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800/60">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400/80 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                <Zap className="w-3 h-3" />
                God Mode Sign In
              </span>
            </div>
          </button>

          {/* 2. Gate Guard Card */}
          <button
            onClick={() => onSelectRole('guard')}
            onMouseEnter={() => setHoveredRole('guard')}
            onMouseLeave={() => setHoveredRole(null)}
            className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              hoveredRole === 'guard'
                ? 'bg-emerald-600/10 border-emerald-500/40 shadow-2xl shadow-emerald-600/10 scale-[1.02]'
                : 'glass-panel border-slate-800 hover:border-emerald-500/30'
            }`}
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:shadow-xl group-hover:shadow-emerald-600/30 transition-shadow">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-600 transition-all duration-300 ${hoveredRole === 'guard' ? 'text-emerald-400 translate-x-1' : ''}`} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-emerald-100 transition-colors">
                  Gate Guard
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Gate Duty & Physical Check</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400/60" />
                  <span>Generate temporary single-use QRs</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400/60" />
                  <span>Live incoming driver submission alerts</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/60" />
                  <span>Selfie check, accept or file complaint</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800/60">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <Shield className="w-3 h-3" />
                Gate Guard Duty PIN
              </span>
            </div>
          </button>

          {/* 3. Other / Gig Worker / Driver Card */}
          <button
            onClick={() => onSelectRole('driver')}
            onMouseEnter={() => setHoveredRole('driver')}
            onMouseLeave={() => setHoveredRole(null)}
            className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              hoveredRole === 'driver'
                ? 'bg-purple-600/10 border-purple-500/40 shadow-2xl shadow-purple-600/10 scale-[1.02]'
                : 'glass-panel border-slate-800 hover:border-purple-500/30'
            }`}
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-600/20 group-hover:shadow-xl group-hover:shadow-purple-600/30 transition-shadow">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-600 transition-all duration-300 ${hoveredRole === 'driver' ? 'text-purple-400 translate-x-1' : ''}`} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-purple-100 transition-colors">
                  Other / Gig Worker
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Sign In / Sign Up Profile</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400/60" />
                  <span>WhatsApp OTP Auth from 9928388404</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Truck className="w-3.5 h-3.5 text-purple-400/60" />
                  <span>Manage Swiggy, Zomato, Amazon IDs</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Smartphone className="w-3.5 h-3.5 text-purple-400/60" />
                  <span>View past gate passes & verified status</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800/60">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400/80 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                <span>💬</span>
                WhatsApp OTP Sign In
              </span>
            </div>
          </button>

        </div>

        {/* Footer Info */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-slate-500 font-mono">
            Arrival at campus gate? <a href="/entry" className="text-blue-400 hover:text-blue-300 underline font-semibold ml-1">Scan Gate QR Directly</a>
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600">
            <span>Secure • Traceable • Instant Verification</span>
          </div>
        </div>

      </div>
    </div>
  );
};
