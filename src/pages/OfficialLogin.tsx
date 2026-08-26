import React, { useState } from 'react';
import {
  LayoutDashboard, Lock, User, ArrowLeft, Eye, EyeOff,
  Zap, RefreshCw, AlertTriangle, Shield
} from 'lucide-react';

interface OfficialLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export const OfficialLogin: React.FC<OfficialLoginProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hardcoded credentials for now — can be replaced with backend auth
  const VALID_CREDENTIALS = [
    { username: 'admin', password: 'admin123' },
    { username: 'official', password: 'official123' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate auth delay
    await new Promise(r => setTimeout(r, 800));

    const match = VALID_CREDENTIALS.find(
      c => c.username.toLowerCase() === username.toLowerCase() && c.password === password
    );

    if (match) {
      onLogin();
    } else {
      setError('Invalid username or password. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Subtle Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">

        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to role selection</span>
        </button>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-8 space-y-6 border border-slate-800 shadow-2xl">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/25 ring-2 ring-white/10">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Official Login</h1>
              <p className="text-sm text-slate-400 mt-1">Sign in to access the administrative control panel</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              <Zap className="w-3 h-3" />
              God Mode Administration
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          {/* Demo Hint */}
          <div className="pt-2 border-t border-slate-800/60">
            <p className="text-center text-[11px] text-slate-500 font-mono">
              Default credentials: <span className="text-blue-400">admin</span> / <span className="text-blue-400">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
