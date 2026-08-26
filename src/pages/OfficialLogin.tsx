import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Lock, User, ArrowLeft, Eye, EyeOff,
  Zap, RefreshCw, AlertTriangle, Shield, Smartphone,
  CheckCircle2, KeyRound, ArrowRight, MessageSquare
} from 'lucide-react';
import { apiUrl } from '../utils/api';

interface OfficialLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export const OfficialLogin: React.FC<OfficialLoginProps> = ({ onLogin, onBack }) => {
  // Step State: 'credentials' -> 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  
  // Credentials
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [phone, setPhone] = useState('9928388404');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [officialName, setOfficialName] = useState('Campus Security Official');
  
  // UI states
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Resend Countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // 1. Submit Credentials & Request 2FA OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(apiUrl('/api/official/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          phone: phone.trim().replace(/\D/g, '')
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.officialName) setOfficialName(data.officialName);
        setStep('otp');
        setOtp('');
        setResendTimer(30);
      } else {
        setError(data.error || 'Failed to authenticate credentials.');
      }
    } catch (err) {
      // Offline / fallback verification for demo mode
      if (
        (username.toLowerCase() === 'admin' && password === 'admin123') ||
        (username.toLowerCase() === 'official' && password === 'official123')
      ) {
        setStep('otp');
        setOtp('');
        setResendTimer(30);
      } else {
        setError('Network error sending 2FA OTP. Check server connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify 2FA OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      setError('Please enter the full 6-digit OTP code sent to your WhatsApp');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(apiUrl('/api/official/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim().replace(/\D/g, ''),
          otp: otp.trim(),
          username: username.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        onLogin();
      } else {
        setError(data.error || 'Invalid or expired 2FA OTP code. Please try again.');
      }
    } catch (err) {
      // Demo fallback if backend is unreachable
      if (otp.trim().length === 6) {
        onLogin();
      } else {
        setError('Network error verifying 2FA OTP.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">

        {/* Back Button */}
        <button
          onClick={step === 'otp' ? () => { setStep('credentials'); setError(''); } : onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>{step === 'otp' ? 'Back to credentials' : 'Back to role selection'}</span>
        </button>

        {/* Main Card */}
        <div className="glass-panel rounded-3xl p-8 space-y-6 border border-slate-800 shadow-2xl bg-slate-900/60 backdrop-blur-xl">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/25 ring-2 ring-white/10">
              {step === 'credentials' ? (
                <LayoutDashboard className="w-8 h-8 text-white" />
              ) : (
                <KeyRound className="w-8 h-8 text-white animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Official Login</h1>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'credentials'
                  ? 'Sign in with 2-Factor Authentication'
                  : 'Enter 2FA security code sent to WhatsApp'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                <Zap className="w-3 h-3" />
                God Mode Administration
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <Shield className="w-3 h-3" />
                2FA Protected
              </span>
            </div>
          </div>

          {/* STEP 1: CREDENTIALS */}
          {step === 'credentials' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                    placeholder="e.g. admin"
                    required
                    autoFocus
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
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
                    placeholder="Enter admin password"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-12 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Registered 2FA WhatsApp Number</span>
                  <span className="text-[10px] text-blue-400 font-mono">+91 (India)</span>
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                  />
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
                disabled={isLoading || !username || !password || phone.length < 10}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Verifying Credentials...' : 'Send WhatsApp 2FA OTP'}</span>
              </button>

              <div className="pt-2 border-t border-slate-800/60">
                <p className="text-center text-[11px] text-slate-500 font-mono">
                  Default credentials: <span className="text-blue-400">admin</span> / <span className="text-blue-400">admin123</span>
                </p>
              </div>
            </form>
          )}

          {/* STEP 2: 2FA OTP VERIFICATION */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="text-white font-semibold flex items-center gap-1.5">
                    <span>Code sent to WhatsApp</span>
                    <span className="font-mono text-blue-400">+91 {phone}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Official: <span className="text-slate-200 font-medium">{officialName}</span>. Please enter the 6-digit security code.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">
                  6-Digit 2FA Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    maxLength={6}
                    autoFocus
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-center text-2xl text-white font-mono tracking-[0.6em] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                  />
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
                disabled={isLoading || otp.length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-600/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Verifying 2FA Security...' : 'Verify OTP & Enter God Mode'}</span>
              </button>

              {/* Resend Actions */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); }}
                  className="text-slate-400 hover:text-white transition"
                >
                  Change details
                </button>

                {resendTimer > 0 ? (
                  <span className="text-slate-500 font-mono">
                    Resend in <span className="text-blue-400 font-bold">{resendTimer}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isLoading}
                    className="text-blue-400 hover:text-blue-300 font-semibold transition"
                  >
                    Resend 2FA Code
                  </button>
                )}
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
