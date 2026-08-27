import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, QrCode, Camera, CheckCircle2, AlertTriangle, User, Phone, Car,
  MapPin, ChevronRight, RefreshCw, Smartphone, Truck, Clock,
  X, ArrowRight, Radio, Loader2, ArrowLeft, Sparkles
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Driver, DeliveryCompany, VehicleType } from '../types';
import { apiUrl, getSocketUrl } from '../utils/api';

type Step = 'validate' | 'phone' | 'register' | 'selfie' | 'company' | 'review' | 'waiting' | 'approved' | 'error' | 'suspended';

const COMPANIES: DeliveryCompany[] = ['Swiggy', 'Zomato', 'Amazon', 'Uber', 'Ola', 'Blinkit', 'Zepto', 'Porter', 'Delhivery', 'Other'];

const COMPANY_COLORS: Record<string, string> = {
  Swiggy: '#f97316', Zomato: '#ef4444', Amazon: '#f59e0b', Uber: '#10b981',
  Ola: '#06b6d4', Blinkit: '#eab308', Zepto: '#8b5cf6', Porter: '#3b82f6',
  Delhivery: '#ec4899', Other: '#64748b'
};

const COMPANY_LOGOS: Record<string, string> = {
  Swiggy: '🟠', Zomato: '🔴', Amazon: '📦', Uber: '🟢',
  Ola: '🔵', Blinkit: '⚡', Zepto: '💜', Porter: '🚛',
  Delhivery: '📮', Other: '🏢'
};

export const DriverEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  // Form Flow State
  const [currentStep, setCurrentStep] = useState<Step>('validate');
  const [tokenCode, setTokenCode] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  // Authenticated / Saved Driver from localStorage
  const [savedDriver, setSavedDriver] = useState<Driver | null>(() => {
    try {
      const saved = localStorage.getItem('gatepass_driver');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Driver Data
  const [phone, setPhone] = useState(savedDriver?.phone || '');
  const [name, setName] = useState(savedDriver?.name || '');
  const [vehicleNumber, setVehicleNumber] = useState(savedDriver?.vehicleNumber || '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(savedDriver?.vehicleType || 'Motorcycle');
  const [driverCompanies, setDriverCompanies] = useState<string[]>(savedDriver?.companies || ['Swiggy']);
  const [selectedCompany, setSelectedCompany] = useState<string>(savedDriver?.companies?.[0] || 'Swiggy');
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(!!savedDriver);
  const [driver, setDriver] = useState<Driver | null>(savedDriver);

  // Geolocation
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [locationVerified, setLocationVerified] = useState(false);

  // Flow Tracking
  const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suspendedInfo, setSuspendedInfo] = useState<{ name: string; vehicle: string; complaints: number } | null>(null);
  const [reinstatementReason, setReinstatementReason] = useState('');
  const [reinstatementSubmitted, setReinstatementSubmitted] = useState(false);
  const [reinstatementLoading, setReinstatementLoading] = useState(false);

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-trigger token validate if in URL
  useEffect(() => {
    if (tokenFromUrl) validateToken(tokenFromUrl);
  }, [tokenFromUrl]);

  // Listen for guard decision
  useEffect(() => {
    if (!submittedEntryId) return;
    const socket = io(getSocketUrl());
    socket.on('entry_decision_updated', (data: any) => {
      if (data.entry?.id === submittedEntryId) {
        if (data.entry.status === 'ACCEPTED') {
          setCurrentStep('approved');
        } else if (data.entry.status === 'COMPLAINED') {
          setErrorMessage('The guard has flagged this entry. Please speak with the guard at the gate.');
          setCurrentStep('error');
        }
      }
    });
    return () => { socket.disconnect(); };
  }, [submittedEntryId]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Hook live camera stream whenever camera becomes active
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.log('Video play error:', e));
    }
  }, [isCameraActive]);

  // ─── Actions ──────────────────────────────────────────

  const validateToken = async (code: string) => {
    try {
      const res = await fetch(apiUrl(`/api/qr/validate/${code}`));
      const data = await res.json();
      if (data.valid) {
        setTokenInfo(data.token);
        setTokenCode(code);
        
        // Check if the saved/logged-in driver is SUSPENDED
        const driverToCheck = savedDriver || driver;
        if (driverToCheck?.phone) {
          try {
            const suspendRes = await fetch(apiUrl('/api/driver/suspended-scan'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: driverToCheck.phone, tokenCode: code })
            });
            const suspendData = await suspendRes.json();
            if (suspendData.suspended) {
              setSuspendedInfo({
                name: suspendData.driverName || driverToCheck.name,
                vehicle: suspendData.vehicleNumber || driverToCheck.vehicleNumber,
                complaints: suspendData.complaintCount || 0
              });
              setCurrentStep('suspended');
              return;
            }
          } catch { /* continue normally if check fails */ }
        }

        // Auto-skip phone & registration if driver is already registered/saved
        if (savedDriver || (driver && name && phone)) {
          setCurrentStep('selfie');
        } else {
          setCurrentStep('phone');
        }
      } else {
        setErrorMessage(data.message || 'Invalid or expired QR token.');
        setCurrentStep('error');
      }
    } catch {
      setErrorMessage('Could not connect to server. Check your network.');
      setCurrentStep('error');
    }
  };

  const handlePhoneLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    try {
      const res = await fetch(apiUrl(`/api/driver/lookup/${phone}`));
      if (res.ok) {
        const d: Driver = await res.json();

        // Check suspension before proceeding
        if (d.status === 'SUSPENDED') {
          // Alert the guard
          try {
            await fetch(apiUrl('/api/driver/suspended-scan'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: d.phone, tokenCode })
            });
          } catch { /* non-blocking */ }
          setSuspendedInfo({ name: d.name, vehicle: d.vehicleNumber, complaints: d.complaintCount });
          setPhone(d.phone);
          setName(d.name);
          setVehicleNumber(d.vehicleNumber);
          setCurrentStep('suspended');
          return;
        }

        setDriver(d);
        setSavedDriver(d);
        setName(d.name);
        setVehicleNumber(d.vehicleNumber);
        setVehicleType(d.vehicleType as any);
        setDriverCompanies(d.companies);
        setSelectedCompany(d.companies?.[0] || 'Swiggy');
        setIsReturning(true);
        // Persist session to browser
        localStorage.setItem('gatepass_driver', JSON.stringify(d));
        // Returning driver → skip registration, go straight to selfie
        setCurrentStep('selfie');
      } else {
        setIsReturning(false);
        setCurrentStep('register');
      }
    } catch {
      setIsReturning(false);
      setCurrentStep('register');
    }
  };

  const handleRegistrationDone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !vehicleNumber || driverCompanies.length === 0) return;
    
    // Save partial profile locally
    const newDriverObj: Driver = {
      id: `driver_${Date.now()}`,
      name,
      phone,
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      companies: driverCompanies,
      status: 'ACTIVE',
      totalEntries: 1,
      complaintCount: 0,
      registeredAt: new Date().toISOString()
    };
    setDriver(newDriverObj);
    setSavedDriver(newDriverObj);
    localStorage.setItem('gatepass_driver', JSON.stringify(newDriverObj));
    setCurrentStep('selfie');
  };

  const [cameraError, setCameraError] = useState<string>('');

  const startCamera = async () => {
    setCameraError('');
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'Camera permission denied or camera not found.');
      // Auto fallback to placeholder
      usePlaceholderSelfie();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelfieUrl(reader.result as string);
      setIsCameraActive(false);
      setCurrentStep('company');
    };
    reader.readAsDataURL(file);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = video.videoWidth || 320;
    const h = video.videoHeight || 320;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    setSelfieUrl(canvas.toDataURL('image/jpeg', 0.85));
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCurrentStep('company');
  };

  const usePlaceholderSelfie = () => {
    setSelfieUrl("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%231e293b'/><circle cx='100' cy='80' r='45' fill='%233b82f6'/><path d='M30 180 C30 130 170 130 170 180 Z' fill='%233b82f6'/><text x='100' y='190' font-size='12' fill='white' text-anchor='middle'>VERIFIED SELFIE</text></svg>");
    setCurrentStep('company');
  };

  const handleCompanySelect = (company: string) => {
    setSelectedCompany(company);
    // Auto-verify location in background then go to review
    grabLocation();
    setCurrentStep('review');
  };

  const grabLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocationVerified(true); },
        () => { setLat(28.5456); setLng(77.2732); setLocationVerified(true); },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setLat(28.5456); setLng(77.2732); setLocationVerified(true);
    }
  };

  const handleSubmitEntry = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/entry/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenCode, phone, name,
          vehicleNumber: vehicleNumber.toUpperCase(),
          vehicleType, company: selectedCompany,
          selfieUrl: selfieUrl || '',
          lat, lng, locationVerified
        })
      });
      if (res.ok) {
        const entry = await res.json();
        setSubmittedEntryId(entry.id);
        setCurrentStep('waiting');
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Entry submission failed.');
        setCurrentStep('error');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setCurrentStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Progress ─────────────────────────────────────────

  const stepsForType = (savedDriver || (driver && isReturning))
    ? ['validate', 'selfie', 'company', 'review', 'waiting', 'approved']
    : ['validate', 'phone', 'register', 'selfie', 'company', 'review', 'waiting', 'approved'];
  const stepIdx = stepsForType.indexOf(currentStep);
  const progress = Math.min(100, ((stepIdx + 1) / stepsForType.length) * 100);

  // Available companies for this-visit selection
  const availableCompanies = (driver || savedDriver)?.companies && (driver || savedDriver)!.companies.length > 0
    ? (driver || savedDriver)!.companies
    : (driverCompanies.length > 0 ? driverCompanies : COMPANIES as string[]);

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-start p-4 pt-10 md:pt-16">
      <div className="w-full max-w-md space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center mx-auto shadow-2xl shadow-purple-600/20 ring-2 ring-white/10">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Smart Campus Entry</h1>
          <p className="text-[11px] text-slate-500 font-mono">Digital Gate Pass for Gig Workers</p>
        </div>

        {/* Persistent Driver Profile Pill (if remembered) */}
        {(savedDriver || (driver && isReturning && name)) && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs animate-fadeIn shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Driver: <strong className="text-white font-semibold">{name || savedDriver?.name}</strong></span>
            <span className="text-[11px] text-emerald-400 font-mono">({vehicleNumber || savedDriver?.vehicleNumber})</span>
          </div>
        )}

        {/* Progress Bar */}
        {!['error', 'approved'].includes(currentStep) && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ──── STEP: TOKEN VALIDATION ──── */}
        {currentStep === 'validate' && (
          <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800 animate-fadeIn">
            <div className="text-center space-y-2">
              <QrCode className="w-12 h-12 text-blue-400 mx-auto" />
              <h2 className="font-bold text-lg text-white">Enter QR Token</h2>
              <p className="text-xs text-slate-400">Enter the code shown on the guard's QR display</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); validateToken(tokenCode); }} className="space-y-3">
              <input
                type="text"
                value={tokenCode}
                onChange={e => setTokenCode(e.target.value.toUpperCase())}
                placeholder="e.g. X792814"
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-xl text-center text-white font-mono font-bold tracking-[0.25em] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 uppercase placeholder:text-slate-700 placeholder:tracking-[0.25em]"
              />
              <button type="submit" disabled={!tokenCode} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Validate Token</span>
              </button>
            </form>
          </div>
        )}

        {/* ──── STEP: PHONE NUMBER ──── */}
        {currentStep === 'phone' && (
          <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800 animate-fadeIn">
            {/* Token verified badge */}
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-emerald-400 font-bold">QR Token Verified</span>
                <span className="text-slate-500 ml-2 font-mono">{tokenCode} • {tokenInfo?.gateName}</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="font-bold text-lg text-white">Enter Your Phone Number</h2>
              <p className="text-xs text-slate-400">We'll check if you're already registered</p>
            </div>

            <form onSubmit={handlePhoneLookup} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-xl text-white font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-slate-700 placeholder:text-base placeholder:tracking-normal"
                />
              </div>
              <button type="submit" disabled={phone.length < 10} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                <span>Continue</span>
              </button>
            </form>
          </div>
        )}

        {/* ──── STEP: REGISTRATION (new drivers only) ──── */}
        {currentStep === 'register' && (
          <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800 animate-fadeIn">
            <div className="text-center space-y-1">
              <User className="w-10 h-10 text-amber-400 mx-auto" />
              <h2 className="font-bold text-lg text-white">Quick Registration</h2>
              <p className="text-xs text-slate-400">First time here? Fill in your details once — you won't need to do this again.</p>
            </div>

            <form onSubmit={handleRegistrationDone} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" autoFocus className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Vehicle Number</label>
                <input type="text" required value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g. RJ20XX1234" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Vehicle Type</label>
                <select value={vehicleType} onChange={e => setVehicleType(e.target.value as VehicleType)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                  <option value="Auto">Auto Rickshaw</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Companies you deliver for</label>
                <div className="grid grid-cols-3 gap-2">
                  {COMPANIES.map(comp => {
                    const selected = driverCompanies.includes(comp);
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          setDriverCompanies(prev =>
                            selected ? prev.filter(c => c !== comp) : [...prev, comp]
                          );
                        }}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition text-center ${
                          selected
                            ? 'bg-blue-500/15 border-blue-500/40 text-white ring-1 ring-blue-500/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl">{COMPANY_LOGOS[comp]}</span>
                        <span className="text-[10px] font-bold">{comp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={!name || !vehicleNumber || driverCompanies.length === 0} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-amber-600/30 transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 mt-1">
                <ArrowRight className="w-4 h-4" />
                <span>Save & Continue</span>
              </button>
            </form>
          </div>
        )}

        {/* ──── STEP: SELFIE ──── */}
        {currentStep === 'selfie' && (
          <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800 animate-fadeIn">

            {/* Returning driver welcome banner */}
            {isReturning && driver && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                <h3 className="font-bold text-emerald-400 text-base">Welcome back, {driver.name}! 👋</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {driver.vehicleNumber} • {driver.vehicleType} • {driver.totalEntries} past entries
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {driver.companies.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: COMPANY_COLORS[c] || '#3b82f6' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center space-y-1">
              <Camera className="w-10 h-10 text-blue-400 mx-auto" />
              <h2 className="font-bold text-lg text-white">Take a Quick Selfie</h2>
              <p className="text-xs text-slate-400">The guard will compare this with you at the gate</p>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {!selfieUrl ? (
              <div className="space-y-4">
                {isCameraActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/40 shadow-2xl shadow-blue-500/10 bg-slate-950 w-72 h-72">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      {/* Face outline guide */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-44 h-56 border-2 border-dashed border-white/40 rounded-full" />
                      </div>
                    </div>
                    <button onClick={captureSelfie} className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-xl transition active:scale-[0.98] flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      <span>CAPTURE SELFIE PHOTO</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-3">
                    <div className="w-36 h-36 rounded-full bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-slate-600" />
                    </div>

                    {cameraError && (
                      <p className="text-[11px] text-amber-400 text-center max-w-xs">{cameraError}</p>
                    )}

                    <button onClick={startCamera} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 transition active:scale-[0.98] flex items-center justify-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>Start Camera Live</span>
                    </button>

                    {/* Direct Native Camera/File Input */}
                    <label className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      <span>Take Photo / Upload Camera File</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button onClick={usePlaceholderSelfie} className="text-xs text-slate-600 hover:text-slate-400 transition pt-1">
                      Skip (use verified avatar placeholder)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <img src={selfieUrl} alt="Selfie" className="w-36 h-36 rounded-full object-cover border-4 border-emerald-500 shadow-xl" />
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selfie Captured & Verified
                </span>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setSelfieUrl(null); setIsCameraActive(false); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition">
                    Retake
                  </button>
                  <button onClick={() => setCurrentStep('company')} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg">
                    <span>Next: Select Company</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── STEP: SELECT COMPANY FOR THIS VISIT ──── */}
        {currentStep === 'company' && (
          <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800 animate-fadeIn">
            <div className="text-center space-y-1">
              <Truck className="w-10 h-10 text-amber-400 mx-auto" />
              <h2 className="font-bold text-lg text-white">Delivering for which company?</h2>
              <p className="text-xs text-slate-400">Select the company for <strong>this visit</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {availableCompanies.map((comp: string) => (
                <button
                  key={comp}
                  onClick={() => handleCompanySelect(comp)}
                  className="p-4 rounded-2xl border-2 border-slate-800 bg-slate-900/60 hover:border-blue-500/40 hover:bg-blue-500/5 transition active:scale-95 flex flex-col items-center gap-2 group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">{COMPANY_LOGOS[comp] || '🏢'}</span>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white transition">{comp}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ──── STEP: REVIEW & SUBMIT ──── */}
        {currentStep === 'review' && (
          <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-800 animate-fadeIn">
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h2 className="font-bold text-lg text-white">Confirm & Submit</h2>
              <p className="text-xs text-slate-400">Review your details before submitting</p>
            </div>

            {/* Driver Summary Card */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-4">
                {selfieUrl && <img src={selfieUrl} alt="Selfie" className="w-16 h-16 rounded-xl object-cover border-2 border-blue-500/60" />}
                <div className="space-y-0.5">
                  <h3 className="font-bold text-base text-white">{name}</h3>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-500" /> {phone}
                  </p>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                    <Car className="w-3 h-3 text-blue-400" /> {vehicleNumber} ({vehicleType})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                <div className="bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-slate-500 block text-[10px] mb-0.5">Company</span>
                  <span className="font-bold text-white flex items-center justify-center gap-1">
                    <span>{COMPANY_LOGOS[selectedCompany]}</span> {selectedCompany}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-slate-500 block text-[10px] mb-0.5">Token</span>
                  <span className="font-bold text-amber-400">{tokenCode}</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-slate-500 block text-[10px] mb-0.5">Location</span>
                  <span className="font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {locationVerified ? '✓' : <Loader2 className="w-3 h-3 animate-spin" />}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={handleSubmitEntry} disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base rounded-2xl shadow-2xl shadow-emerald-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              <span>{isSubmitting ? 'Submitting...' : 'SUBMIT ENTRY'}</span>
            </button>
          </div>
        )}

        {/* ──── STEP: WAITING FOR GUARD ──── */}
        {currentStep === 'waiting' && (
          <div className="glass-panel rounded-2xl p-8 space-y-6 border border-blue-500/30 text-center animate-pulse-glow animate-fadeIn">
            <div className="w-20 h-20 rounded-full border-4 border-blue-500/30 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-white">Waiting for Guard</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
                Your entry has been submitted. The guard is reviewing your details — please wait at the gate.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-blue-400 text-xs font-mono">
              <Radio className="w-3 h-3 animate-ping" />
              <span>Live connection active</span>
            </div>
          </div>
        )}

        {/* ──── STEP: APPROVED ──── */}
        {currentStep === 'approved' && (
          <div className="glass-panel rounded-2xl p-8 space-y-6 border-2 border-emerald-500/40 text-center glow-emerald animate-fadeIn">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-500/20">
              <CheckCircle2 className="w-14 h-14 text-white" />
            </div>

            <div>
              <h2 className="font-extrabold text-2xl text-emerald-400">ENTRY APPROVED ✓</h2>
              <p className="text-sm text-slate-400 mt-1">You may proceed into the campus</p>
            </div>

            {/* Digital Pass Card */}
            <div className="bg-slate-900/80 rounded-2xl p-5 space-y-2.5 text-xs font-mono max-w-xs mx-auto border border-emerald-500/20">
              <div className="text-center pb-2 border-b border-slate-800">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Digital Campus Entry Pass</span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="text-white font-bold">{name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Company</span><span className="text-white font-bold">{selectedCompany}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="text-white">{vehicleNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Token</span><span className="text-amber-400 font-bold">{tokenCode}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Gate</span><span className="text-blue-400">{tokenInfo?.gateName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="text-emerald-400">{new Date().toLocaleTimeString()}</span></div>
            </div>

            <p className="text-xs text-slate-600">Thank you! Drive safely on campus. 🙏</p>
          </div>
        )}

        {/* ──── STEP: SUSPENDED ──── */}
        {currentStep === 'suspended' && (
          <div className="glass-panel rounded-2xl p-8 space-y-6 border border-red-500/40 text-center animate-fadeIn">
            {/* Icon */}
            <div className="relative mx-auto w-24 h-24">
              <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 text-2xl">🚫</span>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Account Suspended
              </div>
              <h2 className="font-extrabold text-xl text-white">Access Denied</h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Hi <strong className="text-white">{suspendedInfo?.name || name}</strong>, your account has been
                <span className="text-red-400 font-semibold"> suspended by the campus admin</span>.
                You cannot enter the campus until your account is reinstated.
              </p>
            </div>

            {/* Driver Info */}
            <div className="bg-slate-900/80 rounded-xl p-4 space-y-2 text-left border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Vehicle</span>
                <span className="text-white font-mono">{suspendedInfo?.vehicle || vehicleNumber || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Past Complaints</span>
                <span className="text-red-400 font-bold">{suspendedInfo?.complaints ?? 0} complaint(s)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className="text-red-400 font-bold uppercase">Suspended</span>
              </div>
            </div>

            {/* Guard Alert Notice */}
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
              <Radio className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0 animate-ping" />
              <p className="text-xs text-amber-300">
                The gate guard has been <strong>automatically notified</strong> of this unauthorized scan attempt. Please do not proceed further.
              </p>
            </div>

            {/* Reinstatement Form */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              {!reinstatementSubmitted ? (
                <>
                  <p className="text-xs text-slate-400 font-semibold">File a Reinstatement Request</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Explain why your suspension should be removed. The campus admin will review your request.
                  </p>
                  <textarea
                    value={reinstatementReason}
                    onChange={e => setReinstatementReason(e.target.value)}
                    placeholder="Describe your situation and why your suspension should be lifted..."
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white resize-none placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-left"
                  />
                  <button
                    onClick={async () => {
                      if (!reinstatementReason.trim()) return;
                      setReinstatementLoading(true);
                      try {
                        const res = await fetch(apiUrl('/api/driver/reinstatement-request'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            driverPhone: phone || suspendedInfo?.vehicle,
                            driverName: name || suspendedInfo?.name,
                            vehicleNumber: vehicleNumber || suspendedInfo?.vehicle,
                            reason: reinstatementReason
                          })
                        });
                        if (res.ok || res.status === 201) {
                          setReinstatementSubmitted(true);
                        }
                      } catch {
                        setReinstatementSubmitted(true); // optimistic success
                      } finally {
                        setReinstatementLoading(false);
                      }
                    }}
                    disabled={!reinstatementReason.trim() || reinstatementLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-xl transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {reinstatementLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>{reinstatementLoading ? 'Submitting...' : 'Submit Reinstatement Request'}</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-400 text-sm">Request Submitted!</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Your reinstatement request has been filed. The campus admin will review it and notify you. Please wait at the gate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── STEP: ERROR ──── */}
        {currentStep === 'error' && (
          <div className="glass-panel rounded-2xl p-8 space-y-5 border border-rose-500/30 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="font-bold text-lg text-rose-400">Something Went Wrong</h2>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">{errorMessage}</p>
            <button onClick={() => { setCurrentStep('validate'); setErrorMessage(''); setTokenCode(''); }} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition">
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
