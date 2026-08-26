import React, { useState, useEffect } from 'react';
import {
  Smartphone, Phone, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
  Shield, Truck, Car, User, Clock, QrCode, LogOut, Edit3, MessageSquare,
  Sparkles, Plus, Check, RefreshCw, Eye
} from 'lucide-react';
import { Driver, Entry, DeliveryCompany, VehicleType } from '../types';
import { useApp } from '../context/AppContext';
import { apiUrl } from '../utils/api';

const COMPANIES: DeliveryCompany[] = [
  'Swiggy', 'Zomato', 'Amazon', 'Uber', 'Ola', 'Blinkit', 'Zepto', 'Porter', 'Delhivery', 'Other'
];

const COMPANY_LOGOS: Record<string, string> = {
  Swiggy: '🟠', Zomato: '🔴', Amazon: '📦', Uber: '🟢',
  Ola: '🔵', Blinkit: '⚡', Zepto: '💜', Porter: '🚛',
  Delhivery: '📮', Other: '🏢'
};

const COMPANY_COLORS: Record<string, string> = {
  Swiggy: '#f97316', Zomato: '#ef4444', Amazon: '#f59e0b', Uber: '#10b981',
  Ola: '#06b6d4', Blinkit: '#eab308', Zepto: '#8b5cf6', Porter: '#3b82f6',
  Delhivery: '#ec4899', Other: '#64748b'
};

interface DriverPortalProps {
  onBack: () => void;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({ onBack }) => {
  const { showToast } = useApp();

  // Auth flow states (restores from localStorage on reload)
  const [authenticatedDriver, setAuthenticatedDriver] = useState<Driver | null>(() => {
    try {
      const saved = localStorage.getItem('gatepass_driver');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [step, setStep] = useState<'phone' | 'otp' | 'dashboard'>(() => {
    try {
      if (localStorage.getItem('gatepass_driver')) {
        return 'dashboard';
      }
    } catch {}
    return 'phone';
  });

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isExistingDriver, setIsExistingDriver] = useState(false);

  // New registration fields
  const [name, setName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Motorcycle');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['Swiggy']);

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // Dashboard states
  const [entriesHistory, setEntriesHistory] = useState<Entry[]>([]);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [editVehicleNum, setEditVehicleNum] = useState('');
  const [editVehicleType, setEditVehicleType] = useState<VehicleType>('Motorcycle');

  // Fetch history on mount if already authenticated
  useEffect(() => {
    if (authenticatedDriver) {
      setEditVehicleNum(authenticatedDriver.vehicleNumber);
      setEditVehicleType(authenticatedDriver.vehicleType);
      fetchDriverHistory(authenticatedDriver.phone);
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Fetch driver history when authenticated
  const fetchDriverHistory = async (phoneNum: string) => {
    try {
      const res = await fetch(apiUrl(`/api/driver/history/${phoneNum}`));
      if (res.ok) {
        const data = await res.json();
        setEntriesHistory(data);
      }
    } catch (e) {
      console.error('Error fetching driver history:', e);
    }
  };

  // 1. Send WhatsApp OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(apiUrl('/api/driver/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const data = await res.json();

      if (res.ok) {
        setIsExistingDriver(data.exists);
        setOtp('');
        if (data.driver) {
          setName(data.driver.name);
          setVehicleNumber(data.driver.vehicleNumber);
          setVehicleType(data.driver.vehicleType);
          setSelectedCompanies(data.driver.companies);
        }
        setStep('otp');
        setResendTimer(30);
        showToast('Verification code sent to your WhatsApp', 'info');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error sending OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify WhatsApp OTP & Login / Signup
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP code sent to your WhatsApp');
      return;
    }

    if (!isExistingDriver) {
      if (!name || !vehicleNumber || selectedCompanies.length === 0) {
        setError('Please complete all registration fields');
        return;
      }
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(apiUrl('/api/driver/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim().replace(/\D/g, ''),
          otp: otp.trim(),
          name,
          vehicleNumber: vehicleNumber.toUpperCase(),
          vehicleType,
          companies: selectedCompanies
        })
      });
      const data = await res.json();

      if (res.ok && data.driver) {
        setAuthenticatedDriver(data.driver);
        localStorage.setItem('gatepass_driver', JSON.stringify(data.driver));
        setEditVehicleNum(data.driver.vehicleNumber);
        setEditVehicleType(data.driver.vehicleType);
        fetchDriverHistory(data.driver.phone);
        setStep('dashboard');
        showToast(`Welcome ${data.driver.name}!`, 'success');
      } else {
        setError(data.error || 'Invalid OTP code. Please check your WhatsApp message.');
      }
    } catch (err) {
      setError('Network error verifying OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Update vehicle info in dashboard
  const handleUpdateVehicle = async () => {
    if (!authenticatedDriver) return;
    try {
      const res = await fetch(apiUrl(`/api/driver/profile/${authenticatedDriver.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: editVehicleNum.toUpperCase(),
          vehicleType: editVehicleType
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setAuthenticatedDriver(updated);
        localStorage.setItem('gatepass_driver', JSON.stringify(updated));
        setIsEditingVehicle(false);
        showToast('Vehicle details updated successfully!', 'success');
      }
    } catch (e) {
      showToast('Error updating vehicle', 'warning');
    }
  };

  // Toggle company affiliation in dashboard
  const handleToggleCompany = async (company: string) => {
    if (!authenticatedDriver) return;
    const currentCompanies = authenticatedDriver.companies || [];
    const newCompanies = currentCompanies.includes(company)
      ? currentCompanies.filter(c => c !== company)
      : [...currentCompanies, company];

    if (newCompanies.length === 0) {
      showToast('You must keep at least one associated company', 'warning');
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/driver/profile/${authenticatedDriver.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: newCompanies })
      });
      if (res.ok) {
        const updated = await res.json();
        setAuthenticatedDriver(updated);
        localStorage.setItem('gatepass_driver', JSON.stringify(updated));
        showToast('Company affiliations updated!', 'success');
      }
    } catch (e) {
      showToast('Error updating companies', 'warning');
    }
  };

  // ═════════════════════════════════════════════════════════
  // VIEW 1: PHONE NUMBER INPUT (CLEAN GIG WORKER FORM)
  // ═════════════════════════════════════════════════════════
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md space-y-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to role selection</span>
          </button>

          <div className="glass-panel rounded-3xl p-8 space-y-6 border border-slate-800 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center mx-auto shadow-xl shadow-purple-600/20 ring-2 ring-white/10">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Gig Worker Portal</h1>
              <p className="text-sm text-slate-400">Sign in or register your delivery profile</p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Your WhatsApp Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400 font-mono">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    required
                    autoFocus
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-base text-white font-mono tracking-wider focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition placeholder:text-slate-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                  Existing drivers will sign in • New drivers will sign up
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || phone.length < 10}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-purple-600/25 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{isLoading ? 'Sending WhatsApp Code...' : 'Get Verification Code'}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/60 text-center">
              <p className="text-[11px] text-slate-500 font-mono">
                Swiggy • Zomato • Amazon • Blinkit • Zepto • Uber • Porter
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // VIEW 2: OTP INPUT & REGISTRATION IF NEW
  // ═════════════════════════════════════════════════════════
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md space-y-6">
          <button
            onClick={() => setStep('phone')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Change Phone Number</span>
          </button>

          <div className="glass-panel rounded-3xl p-8 space-y-6 border border-slate-800 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
                💬
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {isExistingDriver ? `Welcome Back, ${name || 'Driver'}!` : 'Complete Your Profile'}
              </h2>
              <p className="text-xs text-slate-400">
                We sent a 6-digit WhatsApp code to <strong className="text-white font-mono">+91 {phone}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* If New Driver -> Registration inputs */}
              {!isExistingDriver && (
                <div className="space-y-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                    Driver Profile Information
                  </span>

                  <div>
                    <label className="block text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Vehicle Number Plate</label>
                      <input
                        type="text"
                        required
                        value={vehicleNumber}
                        onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="RJ20XX1234"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Vehicle Type</label>
                      <select
                        value={vehicleType}
                        onChange={e => setVehicleType(e.target.value as VehicleType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Scooter">Scooter</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Car">Car</option>
                        <option value="Auto">Auto Rickshaw</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5">Delivery Companies you work with:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {COMPANIES.map(comp => {
                        const selected = selectedCompanies.includes(comp);
                        return (
                          <button
                            key={comp}
                            type="button"
                            onClick={() => {
                              setSelectedCompanies(prev =>
                                selected ? prev.filter(c => c !== comp) : [...prev, comp]
                              );
                            }}
                            className={`flex items-center gap-1 p-2 rounded-lg border text-left text-[11px] font-semibold transition ${
                              selected
                                ? 'bg-purple-500/20 border-purple-500/40 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{COMPANY_LOGOS[comp]}</span>
                            <span className="truncate">{comp}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter code"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 text-2xl text-center text-white font-mono font-bold tracking-[0.4em] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-600"
                />
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
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-purple-600/25 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isExistingDriver ? 'Verify & Sign In' : 'Verify & Complete Sign Up'}</span>
              </button>

              <div className="text-center pt-1">
                {resendTimer > 0 ? (
                  <span className="text-xs text-slate-500 font-mono">
                    Resend code in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
                  >
                    Resend WhatsApp Code
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // VIEW 3: DRIVER PROFILE & DASHBOARD (AUTHENTICATED)
  // ═════════════════════════════════════════════════════════
  if (step === 'dashboard' && authenticatedDriver) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-slate-900 to-pink-950/30 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/20 ring-2 ring-white/10 font-bold text-2xl">
              {authenticatedDriver.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{authenticatedDriver.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  ✓ VERIFIED DRIVER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>+91 {authenticatedDriver.phone}</span>
                <span>•</span>
                <span>ID: {authenticatedDriver.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/entry"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Gate QR Scanner</span>
            </a>
            <button
              onClick={() => { localStorage.removeItem('gatepass_driver'); setStep('phone'); setAuthenticatedDriver(null); onBack(); }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Digital Campus GatePass Card + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Digital Smart Pass Card */}
          <div className="md:col-span-1 rounded-2xl p-5 bg-gradient-to-br from-purple-900/60 via-slate-900 to-indigo-950/80 border border-purple-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                Digital GatePass ID
              </span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">{authenticatedDriver.name}</h2>
              <p className="text-xs text-purple-300 font-mono">{authenticatedDriver.vehicleNumber}</p>
              <p className="text-[10px] text-slate-400">{authenticatedDriver.vehicleType}</p>
            </div>

            <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Status: <strong className="text-emerald-400">{authenticatedDriver.status}</strong></span>
              <span className="text-purple-300">Auth: WhatsApp</span>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Entries</span>
              <div className="text-2xl font-black text-white mt-2">{authenticatedDriver.totalEntries}</div>
              <span className="text-[10px] text-emerald-400 font-mono">Gate access count</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400">Complaints</span>
              <div className="text-2xl font-black text-white mt-2">{authenticatedDriver.complaintCount}</div>
              <span className="text-[10px] text-rose-400 font-mono">Incident flags</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400">Platforms</span>
              <div className="text-2xl font-black text-white mt-2">{authenticatedDriver.companies.length}</div>
              <span className="text-[10px] text-blue-400 font-mono">Delivery partners</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400">Registered</span>
              <div className="text-sm font-bold text-white mt-2">
                {new Date(authenticatedDriver.registeredAt).toLocaleDateString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Verified date</span>
            </div>
          </div>

        </div>

        {/* Profile Settings & Company Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Associated Delivery Companies */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Associated Delivery Companies</h3>
                <p className="text-xs text-slate-400">Toggle companies you deliver for</p>
              </div>
              <Truck className="w-5 h-5 text-purple-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {COMPANIES.map(comp => {
                const isAffiliated = authenticatedDriver.companies.includes(comp);
                return (
                  <button
                    key={comp}
                    onClick={() => handleToggleCompany(comp)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition ${
                      isAffiliated
                        ? 'bg-purple-500/15 border-purple-500/40 text-white ring-1 ring-purple-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{COMPANY_LOGOS[comp]}</span>
                      <span>{comp}</span>
                    </div>
                    {isAffiliated && <Check className="w-4 h-4 text-purple-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Registered Vehicle</h3>
                <p className="text-xs text-slate-400">Plate number used during gate scans</p>
              </div>
              <Car className="w-5 h-5 text-blue-400" />
            </div>

            {!isEditingVehicle ? (
              <div className="p-4 bg-slate-900/80 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Number Plate:</span>
                  <span className="text-base font-extrabold text-white">{authenticatedDriver.vehicleNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Vehicle Type:</span>
                  <span className="font-bold text-blue-400">{authenticatedDriver.vehicleType}</span>
                </div>
                <button
                  onClick={() => setIsEditingVehicle(true)}
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Vehicle Details</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-slate-900/90 rounded-xl border border-blue-500/30 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Vehicle Plate Number</label>
                  <input
                    type="text"
                    value={editVehicleNum}
                    onChange={e => setEditVehicleNum(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Vehicle Type</label>
                  <select
                    value={editVehicleType}
                    onChange={e => setEditVehicleType(e.target.value as VehicleType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car</option>
                    <option value="Auto">Auto Rickshaw</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setIsEditingVehicle(false)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateVehicle}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                  >
                    Save Vehicle
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* My Gate Entry History */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Campus Gate Entry History</h3>
              <p className="text-xs text-slate-400">All verified access passes and timestamps</p>
            </div>
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>

          {entriesHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No campus entries recorded for this phone number yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Gate</th>
                    <th className="p-3">Guard</th>
                    <th className="p-3">Token</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entriesHistory.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-slate-300">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: COMPANY_COLORS[entry.company] || '#3b82f6' }}>
                          {entry.company}
                        </span>
                      </td>
                      <td className="p-3 text-blue-400 font-semibold">{entry.gateName}</td>
                      <td className="p-3 text-slate-400">{entry.guardName}</td>
                      <td className="p-3 font-bold text-amber-400">{entry.tokenCode}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    );
  }

  return null;
};
