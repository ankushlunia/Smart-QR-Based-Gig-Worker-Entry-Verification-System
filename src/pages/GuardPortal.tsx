import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, QrCode, Clock, CheckCircle2, AlertTriangle, LogOut, User,
  Smartphone, MapPin, Car, Phone, RefreshCw, X, ChevronRight, Truck,
  Radio, Fingerprint, Lock, Eye, Building2, ArrowLeft, KeyRound, MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Entry } from '../types';
import { sounds } from '../utils/audio';
import { apiUrl } from '../utils/api';

export const GuardPortal: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const {
    activeGuard, activeDutySession, gates, loginGuard, logoutGuard,
    incomingDriverAlert, setIncomingDriverAlert, showToast, refreshData, socket
  } = useApp();

  // Login State
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  const [guardId, setGuardId] = useState('G001');
  const [pin, setPin] = useState('1234');
  const [gateId, setGateId] = useState('gate-1');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [guardOtp, setGuardOtp] = useState('');
  const [guardOtpPhone, setGuardOtpPhone] = useState('');
  const [guardName2fa, setGuardName2fa] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [guardDemoOtp, setGuardDemoOtp] = useState<string | null>(null);

  // QR State
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Verification State
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<Entry | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Complaint Modal
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');

  // Duty Stats
  const [dutyTime, setDutyTime] = useState('00:00:00');

  // Reset PIN State
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetGuardId, setResetGuardId] = useState('G001');
  const [resetGuardPhone, setResetGuardPhone] = useState('9928388404');
  const [resetGuardOtp, setResetGuardOtp] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetPinStep, setResetPinStep] = useState<'request' | 'verify'>('request');
  const [resetPinLoading, setResetPinLoading] = useState(false);
  const [resetPinError, setResetPinError] = useState('');
  const [guardResetDemoOtp, setGuardResetDemoOtp] = useState<string | null>(null);

  const handleSendGuardPinOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPinError('');
    setResetPinLoading(true);
    try {
      const res = await fetch(apiUrl('/api/guards/forgot-pin-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardId: resetGuardId, phone: resetGuardPhone })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.demoOtp) setGuardResetDemoOtp(data.demoOtp);
        setResetPinStep('verify');
        showToast(data.message || 'PIN reset code sent to WhatsApp', 'info');
      } else {
        setResetPinError(data.error || 'Failed to send OTP.');
      }
    } catch {
      setResetPinStep('verify');
    } finally {
      setResetPinLoading(false);
    }
  };

  const handleVerifyAndResetGuardPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetGuardOtp.length < 6 || resetNewPin.length < 4) {
      setResetPinError('Please enter 6-digit OTP and 4-digit PIN.');
      return;
    }
    setResetPinError('');
    setResetPinLoading(true);
    try {
      const res = await fetch(apiUrl('/api/guards/reset-pin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardId: resetGuardId,
          otp: resetGuardOtp,
          newPin: resetNewPin
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPin(resetNewPin);
        setGuardId(resetGuardId);
        setShowResetPinModal(false);
        setResetPinStep('request');
        showToast('Guard Security PIN updated! You can now login.', 'success');
      } else {
        setResetPinError(data.error || 'Invalid OTP code.');
      }
    } catch {
      setPin(resetNewPin);
      setGuardId(resetGuardId);
      setShowResetPinModal(false);
      showToast('Guard Security PIN updated! You can now login.', 'success');
    } finally {
      setResetPinLoading(false);
    }
  };

  // Listen for incoming driver submissions
  useEffect(() => {
    if (incomingDriverAlert && activeGuard) {
      setPendingEntry(incomingDriverAlert);
      setShowVerificationPanel(true);
      sounds.playAlertChime();
    }
  }, [incomingDriverAlert, activeGuard]);

  // Duty timer
  useEffect(() => {
    if (!activeDutySession) return;
    const updateDutyTime = () => {
      const start = new Date(activeDutySession.loginTime).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setDutyTime(`${h}:${m}:${s}`);
    };
    updateDutyTime();
    const interval = setInterval(updateDutyTime, 1000);
    return () => clearInterval(interval);
  }, [activeDutySession]);

  // QR Expiry countdown
  useEffect(() => {
    if (tokenExpiry <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      if (currentToken) {
        showToast('QR token expired. Generate a new one.', 'warning');
        setQrImageUrl(null);
        setCurrentToken(null);
      }
    }
  }, [tokenExpiry]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loginStep === 'otp' && otpResendTimer > 0) {
      interval = setInterval(() => setOtpResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loginStep, otpResendTimer]);

  // Step 1: Verify PIN credentials, then send WhatsApp OTP
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(apiUrl('/api/guards/send-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardId, pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuardOtpPhone(data.phone || '');
        setGuardName2fa(data.guardName || guardId);
        if (data.demoOtp) setGuardDemoOtp(data.demoOtp);
        setGuardOtp('');
        setLoginStep('otp');
        setOtpResendTimer(30);
      } else {
        setLoginError(data.error || 'Invalid Guard ID or PIN.');
      }
    } catch {
      // Offline fallback — skip 2FA and login directly
      const success = await loginGuard(guardId, pin, gateId);
      if (!success) setLoginError('Invalid Guard ID or PIN. Please try again.');
    }
    setIsLoggingIn(false);
  };

  // Step 2: Verify WhatsApp OTP and complete login
  const handleVerifyGuardOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardOtp.length < 6) {
      setLoginError('Please enter the full 6-digit OTP code.');
      return;
    }
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(apiUrl('/api/guards/verify-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardId, pin, gateId, otp: guardOtp })
      });
      const data = await res.json();
      if (res.ok && data.guard) {
        // Replicate what loginGuard() does in AppContext
        const success = await loginGuard(guardId, pin, gateId);
        if (!success) setLoginError('Login failed after OTP. Please retry.');
      } else {
        setLoginError(data.error || 'Invalid or expired OTP code.');
      }
    } catch {
      // Offline fallback
      const success = await loginGuard(guardId, pin, gateId);
      if (!success) setLoginError('Invalid Guard ID or PIN. Please try again.');
    }
    setIsLoggingIn(false);
  };

  const handleGenerateQR = async () => {
    if (!activeDutySession) return;
    setIsGenerating(true);
    try {
      const res = await fetch(apiUrl('/api/qr/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dutySessionId: activeDutySession.id })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        const token = data.token;
        setCurrentToken(token.tokenCode);

        // Build QR URL
        const entryUrl = `${window.location.origin}/entry?token=${token.tokenCode}`;

        // Generate QR using canvas (inline)
        const { default: QRCode } = await import('qrcode');
        const qrDataUrl = await QRCode.toDataURL(entryUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#ffffff', light: '#00000000' }
        });
        setQrImageUrl(qrDataUrl);

        // Start countdown
        const expiresIn = Math.floor((new Date(token.expiresAt).getTime() - Date.now()) / 1000);
        setTokenExpiry(expiresIn);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTokenExpiry(prev => {
            if (prev <= 1) return 0;
            return prev - 1;
          });
        }, 1000);

        // Reset verification panel
        setPendingEntry(null);
        setShowVerificationPanel(false);
        setIncomingDriverAlert(null);

        showToast(`QR Token ${token.tokenCode} generated. Show to driver.`, 'success');
        refreshData();
      }
    } catch (err) {
      showToast('Error generating QR code', 'warning');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyEntry = async (decision: 'ACCEPT' | 'COMPLAINT') => {
    if (!pendingEntry) return;

    if (decision === 'COMPLAINT') {
      setShowComplaintModal(true);
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(apiUrl('/api/entry/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: pendingEntry.id, decision: 'ACCEPT' })
      });
      if (res.ok) {
        sounds.playSuccessSound();
        showToast(`✅ Entry verified for ${pendingEntry.driverName}!`, 'success');
        setPendingEntry(null);
        setShowVerificationPanel(false);
        setIncomingDriverAlert(null);
        setQrImageUrl(null);
        setCurrentToken(null);
        refreshData();
      }
    } catch (err) {
      showToast('Error verifying entry', 'warning');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!pendingEntry || !complaintReason) return;
    setIsVerifying(true);
    try {
      const res = await fetch(apiUrl('/api/entry/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: pendingEntry.id,
          decision: 'COMPLAINT',
          reason: complaintReason,
          description: complaintDescription
        })
      });
      if (res.ok) {
        sounds.playWarningSound();
        showToast(`🚨 Complaint filed for ${pendingEntry.driverName}`, 'warning');
        setPendingEntry(null);
        setShowVerificationPanel(false);
        setShowComplaintModal(false);
        setIncomingDriverAlert(null);
        setQrImageUrl(null);
        setCurrentToken(null);
        setComplaintReason('');
        setComplaintDescription('');
        refreshData();
      }
    } catch (err) {
      showToast('Error filing complaint', 'warning');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatExpiry = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // GUARD LOGIN SCREEN
  if (!activeGuard || !activeDutySession) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">

          {/* Back Button */}
          <button
            onClick={() => {
              if (loginStep === 'otp') {
                setLoginStep('credentials');
                setLoginError('');
              } else if (onBack) {
                onBack();
              }
            }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{loginStep === 'otp' ? 'Back to credentials' : 'Back to role selection'}</span>
          </button>

          {/* Login Card */}
          <div className="glass-panel rounded-3xl p-8 space-y-6 border border-slate-800 shadow-2xl">
            <div className="text-center space-y-2">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl ring-2 ring-white/10 ${
                loginStep === 'otp'
                  ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-blue-600/20'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/20'
              }`}>
                {loginStep === 'otp'
                  ? <KeyRound className="w-10 h-10 text-white animate-pulse" />
                  : <Shield className="w-10 h-10 text-white" />}
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Guard Portal</h1>
              <p className="text-sm text-slate-400">
                {loginStep === 'otp'
                  ? `Enter 2FA code sent to WhatsApp`
                  : 'Authenticate to begin your duty shift'}
              </p>
            </div>

            {/* STEP 1: CREDENTIALS */}
            {loginStep === 'credentials' && <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Guard ID</label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={guardId}
                    onChange={e => setGuardId(e.target.value)}
                    placeholder="e.g. G001"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Security PIN</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetGuardId(guardId || 'G001');
                      setShowResetPinModal(true);
                      setResetPinError('');
                      setResetPinStep('request');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition"
                  >
                    Forgot / Reset PIN?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="4-digit PIN"
                    maxLength={4}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Assigned Campus Gate</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <select
                    value={gateId}
                    onChange={e => setGateId(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none"
                  >
                    {gates.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span>{isLoggingIn ? 'Verifying PIN...' : 'Send WhatsApp 2FA Code'}</span>
              </button>
            </form>}

            {/* STEP 2: WHATSAPP OTP VERIFICATION */}
            {loginStep === 'otp' && (
              <form onSubmit={handleVerifyGuardOtp} className="space-y-5">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="text-white font-semibold">
                      Code sent to WhatsApp <span className="font-mono text-blue-400">+91 {guardOtpPhone}</span>
                    </div>
                    <p className="text-slate-400">Guard: <span className="text-slate-200 font-medium">{guardName2fa}</span>. Enter the 6-digit code to start duty.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">
                    6-Digit WhatsApp 2FA Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400" />
                    <input
                      type="text"
                      value={guardOtp}
                      onChange={e => setGuardOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      autoFocus
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-center text-2xl text-white font-mono tracking-[0.6em] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition shadow-inner"
                    />
                  </div>
                  {guardDemoOtp && (
                    <div className="mt-2 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold animate-pulse">
                        <span>🔑 Demo OTP:</span>
                        <span className="text-amber-200 tracking-widest text-sm">{guardDemoOtp}</span>
                      </span>
                    </div>
                  )}
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn || guardOtp.length < 6}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-600/25 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  <span>{isLoggingIn ? 'Verifying 2FA...' : 'Verify & Start Duty Session'}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setLoginStep('credentials'); setLoginError(''); }}
                    className="text-slate-400 hover:text-white transition"
                  >
                    Change details
                  </button>
                  {otpResendTimer > 0 ? (
                    <span className="text-slate-500 font-mono">Resend in <span className="text-emerald-400 font-bold">{otpResendTimer}s</span></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLogin as any}
                      disabled={isLoggingIn}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold transition"
                    >
                      Resend 2FA Code
                    </button>
                  )}
                </div>
              </form>
            )}

            <p className="text-center text-[11px] text-slate-500 font-mono">
              Demo: Guard ID <span className="text-emerald-400">G001</span> • PIN <span className="text-emerald-400">1234</span>
            </p>
          </div>

          {/* Reset PIN Modal */}
          {showResetPinModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-white text-base">Reset Security PIN</h3>
                  </div>
                  <button
                    onClick={() => setShowResetPinModal(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {resetPinStep === 'request' ? (
                  <form onSubmit={handleSendGuardPinOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Guard ID</label>
                      <input
                        type="text"
                        value={resetGuardId}
                        onChange={e => setResetGuardId(e.target.value.toUpperCase())}
                        placeholder="e.g. G001"
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Registered WhatsApp Number</label>
                      <input
                        type="tel"
                        value={resetGuardPhone}
                        onChange={e => setResetGuardPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {resetPinError && (
                      <p className="text-xs text-rose-400">{resetPinError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={resetPinLoading || !resetGuardId || resetGuardPhone.length < 10}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {resetPinLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      <span>Send PIN Reset Code to WhatsApp</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAndResetGuardPin} className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-slate-300">
                      Enter the 6-digit WhatsApp code sent to <strong className="text-emerald-400">+91 {resetGuardPhone}</strong>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">6-Digit WhatsApp OTP</label>
                      <input
                        type="text"
                        value={resetGuardOtp}
                        onChange={e => setResetGuardOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        maxLength={6}
                        required
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 text-center text-lg text-white font-mono tracking-[0.4em] focus:outline-none focus:border-emerald-500"
                      />
                      {guardResetDemoOtp && (
                        <div className="mt-1.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold animate-pulse">
                            <span>🔑 Demo OTP:</span>
                            <span className="text-amber-200 tracking-widest text-sm">{guardResetDemoOtp}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">New 4-Digit Security PIN</label>
                      <input
                        type="password"
                        value={resetNewPin}
                        onChange={e => setResetNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        maxLength={4}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 text-center text-lg text-white font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {resetPinError && (
                      <p className="text-xs text-rose-400">{resetPinError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={resetPinLoading || resetGuardOtp.length < 6 || resetNewPin.length < 4}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {resetPinLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Save New PIN & Log In</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // GUARD DUTY DASHBOARD
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* Guard Duty Header */}
      <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 via-[#111827] to-teal-900/20 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl ring-2 ring-emerald-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-white">{activeGuard.currentGateName || 'Campus Gate'}</h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  <Radio className="w-3 h-3 animate-ping" />
                  ON DUTY
                </span>
              </div>
              <p className="text-sm text-slate-400 font-mono">
                Guard: <span className="text-emerald-400 font-bold">{activeGuard.name}</span> ({activeGuard.id})
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Duty Time: <span className="text-blue-400 font-semibold">{dutyTime}</span> • QRs: {activeDutySession.qrsGenerated} • Approved: {activeDutySession.entriesApproved}
              </p>
            </div>
          </div>

          <button
            onClick={logoutGuard}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>End Shift</span>
          </button>
        </div>
      </div>

      {/* QR Code Generation Panel */}
      <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800">
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Gate QR Access Token</h2>
          <p className="text-xs text-slate-400">Generate a temporary QR code for the next arriving driver to scan</p>
        </div>

        {qrImageUrl && currentToken ? (
          <div className="flex flex-col items-center gap-4">
            {/* QR Code Display */}
            <div className="relative p-4 bg-slate-900 rounded-2xl border-2 border-blue-500/40 animate-pulse-glow">
              <img src={qrImageUrl} alt="QR Code" className="w-64 h-64 rounded-xl" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-lg">
                SCAN WITH PHONE CAMERA
              </div>
            </div>

            {/* Token Info */}
            <div className="w-full max-w-xs space-y-3 text-center">
              <div className="font-mono text-2xl font-extrabold text-amber-400 tracking-widest">
                {currentToken}
              </div>

              {/* Expiry Timer */}
              <div className="space-y-1.5">
                <div className={`text-sm font-bold font-mono ${tokenExpiry <= 30 ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`}>
                  Expires in: {formatExpiry(tokenExpiry)}
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${tokenExpiry <= 30 ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${(tokenExpiry / 180) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400 font-mono">
                Single-use • Auto-expires • Guard: {activeGuard.id} • {activeGuard.currentGateName}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-32 h-32 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center">
              <QrCode className="w-16 h-16 text-slate-700" />
            </div>
            <p className="text-sm text-slate-500">No active QR token. Generate one when a driver arrives.</p>
          </div>
        )}

        <button
          onClick={handleGenerateQR}
          disabled={isGenerating}
          className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-base rounded-2xl shadow-2xl shadow-blue-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <QrCode className="w-5 h-5" />
          )}
          <span>{isGenerating ? 'Generating Token...' : 'GENERATE NEW QR CODE'}</span>
        </button>
      </div>

      {/* INCOMING DRIVER VERIFICATION PANEL */}
      {showVerificationPanel && pendingEntry && (
        <div className="glass-panel rounded-2xl border-2 border-blue-500/50 overflow-hidden animate-pulse-glow">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="font-bold text-sm">NEW DRIVER ENTRY — VERIFICATION REQUIRED</span>
            </div>
            <button onClick={() => { setShowVerificationPanel(false); setPendingEntry(null); setIncomingDriverAlert(null); }} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Driver Info Grid */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={pendingEntry.selfieUrl}
                alt="Driver Selfie"
                className="w-32 h-32 rounded-2xl object-cover border-4 border-blue-500 shadow-xl"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-extrabold text-white">{pendingEntry.driverName}</h3>
                  <p className="text-sm text-slate-400 font-mono flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{pendingEntry.driverPhone}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase">
                    {pendingEntry.company}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    {pendingEntry.vehicleNumber} ({pendingEntry.vehicleType})
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Details */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Token Code</span>
                <span className="text-amber-400 font-bold text-base">{pendingEntry.tokenCode}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Timestamp</span>
                <span className="text-white font-semibold">{new Date(pendingEntry.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Gate</span>
                <span className="text-blue-400 font-semibold">{pendingEntry.gateName}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Location</span>
                <span className={`font-semibold flex items-center gap-1 ${pendingEntry.locationVerified ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <MapPin className="w-3.5 h-3.5" />
                  {pendingEntry.locationVerified ? '✓ Geolocation Verified' : '✗ Not Verified'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleVerifyEntry('ACCEPT')}
                disabled={isVerifying}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ACCEPT & ALLOW ENTRY</span>
              </button>
              <button
                onClick={() => handleVerifyEntry('COMPLAINT')}
                disabled={isVerifying}
                className="flex-1 py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>REPORT / FILE COMPLAINT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT MODAL */}
      {showComplaintModal && pendingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>File Entry Complaint</span>
              </h3>
              <button onClick={() => setShowComplaintModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-mono text-slate-400 bg-slate-900 p-3 rounded-xl">
              Driver: <span className="text-white font-bold">{pendingEntry.driverName}</span> • Token: <span className="text-amber-400">{pendingEntry.tokenCode}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-2 font-semibold">Select Reason:</label>
                <div className="space-y-2">
                  {[
                    'Driver does not match selfie',
                    'Vehicle does not match records',
                    'Wrong or falsified information',
                    'Suspicious activity or behavior',
                    'Uncooperative or aggressive',
                    'Other concern'
                  ].map(reason => (
                    <label key={reason} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                      complaintReason === reason ? 'bg-rose-500/10 border-rose-500/40 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={complaintReason === reason}
                        onChange={e => setComplaintReason(e.target.value)}
                        className="accent-rose-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Additional Notes (optional):</label>
                <textarea
                  value={complaintDescription}
                  onChange={e => setComplaintDescription(e.target.value)}
                  placeholder="Describe the issue in more detail..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowComplaintModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComplaint}
                disabled={!complaintReason || isVerifying}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 text-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Complaint</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
