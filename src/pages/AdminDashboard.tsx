import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, Building2, Truck, AlertTriangle, Clock, Search, Filter, 
  Plus, Edit, Eye, Shield, CheckCircle2, XCircle, QrCode, FileText, ChevronRight,
  TrendingUp, MapPin, Phone, Car, RefreshCw, Lock, AlertCircle, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { Driver, Guard, Entry, Complaint, DutySession, QRToken, DeliveryCompany } from '../types';
import { apiUrl } from '../utils/api';

export const AdminDashboard: React.FC = () => {
  const { stats, guards, gates, refreshData, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'guards' | 'duty' | 'drivers' | 'entries' | 'tokens' | 'complaints' | 'whatsapp'>('overview');

  // Data states
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [dutySessions, setDutySessions] = useState<DutySession[]>([]);
  const [tokens, setTokens] = useState<QRToken[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters & Search
  const [entrySearch, setEntrySearch] = useState<string>('');
  const [entryCompanyFilter, setEntryCompanyFilter] = useState<string>('ALL');
  const [entryGateFilter, setEntryGateFilter] = useState<string>('ALL');
  const [driverSearch, setDriverSearch] = useState<string>('');

  // Modals & Drawers
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddGuardModal, setShowAddGuardModal] = useState<boolean>(false);
  const [waStatus, setWaStatus] = useState<{ isConnected: boolean; qrCodeDataUrl: string | null; phoneNumber: string | null }>({ isConnected: false, qrCodeDataUrl: null, phoneNumber: '9928388404' });
  const [waPhoneToLink, setWaPhoneToLink] = useState('9928388404');
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [isWaLoading, setIsWaLoading] = useState(false);

  const fetchWaStatus = async () => {
    try {
      const res = await fetch(apiUrl('/api/whatsapp/status'));
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnectWa = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp device +91 9928388404?')) return;
    setIsWaLoading(true);
    try {
      const res = await fetch(apiUrl('/api/whatsapp/disconnect'), { method: 'POST' });
      if (res.ok) {
        showToast('WhatsApp device disconnected', 'info');
        setWaPairingCode(null);
        fetchWaStatus();
      }
    } catch (e) {
      showToast('Error disconnecting WhatsApp', 'warning');
    } finally {
      setIsWaLoading(false);
    }
  };

  const handleGetWaPairingCode = async () => {
    setIsWaLoading(true);
    try {
      const res = await fetch(apiUrl('/api/whatsapp/pairing-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhoneToLink })
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setWaPairingCode(data.code);
        showToast('Pairing code generated!', 'success');
      } else {
        showToast(data.error || 'Failed to generate code', 'warning');
      }
    } catch (e) {
      showToast('Error generating code', 'warning');
    } finally {
      setIsWaLoading(false);
    }
  };
  const handleGenerateWaQr = async () => {
    setIsWaLoading(true);
    try {
      const res = await fetch(apiUrl('/api/whatsapp/generate-qr'), { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.qrCodeDataUrl) {
        setWaStatus(prev => ({ ...prev, qrCodeDataUrl: data.qrCodeDataUrl }));
        showToast('WhatsApp QR Code generated!', 'success');
      } else {
        showToast('Failed to generate QR code.', 'warning');
      }
    } catch (e) {
      showToast('Error generating QR code.', 'warning');
    } finally {
      setIsWaLoading(false);
    }
  };

  const [newGuardData, setNewGuardData] = useState({ name: '', pin: '', phone: '', currentGateId: '' });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [entriesRes, driversRes, complaintsRes, dutyRes, tokensRes] = await Promise.all([
        fetch(apiUrl('/api/entries')).then(r => r.json()),
        fetch(apiUrl('/api/drivers')).then(r => r.json()),
        fetch(apiUrl('/api/complaints')).then(r => r.json()),
        fetch(apiUrl('/api/duty-sessions')).then(r => r.json()),
        fetch(apiUrl('/api/qr/history')).then(r => r.json())
      ]);
      setEntries(entriesRes);
      setDrivers(driversRes);
      setComplaints(complaintsRes);
      setDutySessions(dutyRes);
      setTokens(tokensRes);
      refreshData();
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/guards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuardData)
      });
      if (res.ok) {
        showToast('Guard account created successfully!', 'success');
        setShowAddGuardModal(false);
        setNewGuardData({ name: '', pin: '', phone: '', currentGateId: '' });
        fetchAllData();
      } else {
        showToast('Error creating guard account', 'warning');
      }
    } catch (e) {
      showToast('Network error creating guard', 'warning');
    }
  };

  const handleToggleDriverSuspension = async (driverId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/drivers/${driverId}/status`), { method: 'PATCH' });
      if (res.ok) {
        showToast('Driver status updated!', 'info');
        fetchAllData();
      }
    } catch (e) {
      showToast('Error updating driver status', 'warning');
    }
  };

  const handleUpdateComplaintStatus = async (complaintId: string, newStatus: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED') => {
    try {
      const res = await fetch(apiUrl(`/api/complaints/${complaintId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Complaint status updated to ${newStatus}`, 'success');
        fetchAllData();
      }
    } catch (e) {
      showToast('Error updating complaint', 'warning');
    }
  };

  // Color mappings for Delivery Companies
  const COMPANY_COLORS: { [key: string]: string } = {
    Swiggy: '#f97316',
    Zomato: '#ef4444',
    Amazon: '#f59e0b',
    Uber: '#10b981',
    Ola: '#06b6d4',
    Blinkit: '#eab308',
    Zepto: '#8b5cf6',
    Porter: '#3b82f6',
    Other: '#64748b'
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      e.driverName.toLowerCase().includes(entrySearch.toLowerCase()) ||
      e.vehicleNumber.toLowerCase().includes(entrySearch.toLowerCase()) ||
      e.tokenCode.toLowerCase().includes(entrySearch.toLowerCase()) ||
      e.driverPhone.includes(entrySearch);
    
    const matchesCompany = entryCompanyFilter === 'ALL' || e.company === entryCompanyFilter;
    const matchesGate = entryGateFilter === 'ALL' || e.gateId === entryGateFilter;

    return matchesSearch && matchesCompany && matchesGate;
  });

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.phone.includes(driverSearch) ||
    d.vehicleNumber.toLowerCase().includes(driverSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/30 p-6 rounded-2xl border border-blue-500/20 backdrop-blur-xl shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase tracking-widest border border-blue-500/30">
              God Mode Administration
            </span>
            <span className="text-xs text-slate-400">• Campus Gate Network</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
            Smart Gig Worker Entry Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time campus visitor tracking, automated profile retrieval, guard verification audit trails, and incident monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh System Data</span>
          </button>
          <button
            onClick={() => setShowAddGuardModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Guard Account</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Today's Entries</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">{stats?.totalEntriesToday || 0}</div>
          <span className="text-[10px] text-blue-400 font-mono">Verified gate entries</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Active Guards</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">{stats?.activeGuards || 0}</div>
          <span className="text-[10px] text-emerald-400 font-mono">Guards on duty</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Active Gates</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">{stats?.activeGates || 0}</div>
          <span className="text-[10px] text-purple-400 font-mono">Monitored gates</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Registered Drivers</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">{stats?.registeredDrivers || 0}</div>
          <span className="text-[10px] text-amber-400 font-mono">Saved driver profiles</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Open Complaints</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">{stats?.totalComplaints || 0}</div>
          <span className="text-[10px] text-rose-400 font-mono">Flagged incidents</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white">{stats?.pendingVerifications || 0}</div>
          <span className="text-[10px] text-cyan-400 font-mono">Live scanning queue</span>
        </div>
      </div>

      {/* Main Administrative Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytics & Live Stream</span>
        </button>

        <button
          onClick={() => setActiveTab('guards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'guards'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Guard Accounts ({guards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duty')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'duty'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Guard Duty Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'drivers'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Driver Directory ({drivers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('entries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'entries'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Full Entry History ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'tokens'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Token Tracking</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="text-sm">💬</span>
          <span>WhatsApp Gateway</span>
          <span className={`w-2 h-2 rounded-full ${waStatus.isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'complaints'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Complaints Queue ({complaints.filter(c => c.status !== 'RESOLVED').length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Entries by Delivery Company */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Entries by Delivery Company</h3>
                  <p className="text-xs text-slate-400">Distribution across registered platforms</p>
                </div>
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.entriesByCompany || []}>
                    <XAxis dataKey="company" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {(stats?.entriesByCompany || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COMPANY_COLORS[entry.company] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Entry Hours Line Chart */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Peak Entry Hours</h3>
                  <p className="text-xs text-slate-400">Hourly gate traffic flow pattern</p>
                </div>
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.hourlyEntries || []}>
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                    />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Active Gate Breakdown & Realtime Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gate Breakdown */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span>Live Gate Traffic</span>
              </h3>
              <div className="space-y-3">
                {gates.map(gate => (
                  <div key={gate.id} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">{gate.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{gate.code} • {gate.location}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-blue-400">{gate.totalEntriesToday}</span>
                      <div className="text-[10px] text-slate-500 font-mono">entries today</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Entry Activity Feed */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Real-time Entry Audit Feed</span>
                  </h3>
                  <p className="text-xs text-slate-400">Latest entries processed across campus gates</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Live Feed
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {entries.slice(0, 6).map(entry => (
                  <div key={entry.id} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-blue-500/40 transition flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={entry.selfieUrl} 
                        alt="Driver Selfie" 
                        className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{entry.driverName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase" style={{ backgroundColor: COMPANY_COLORS[entry.company] || '#3b82f6' }}>
                            {entry.company}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{entry.vehicleNumber} ({entry.vehicleType})</span>
                          <span>•</span>
                          <span className="text-blue-400">{entry.gateName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        entry.status === 'ACCEPTED' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : entry.status === 'COMPLAINED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {entry.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Guard: {entry.guardName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: GUARD MANAGEMENT */}
      {activeTab === 'guards' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Campus Security Guard Accounts</span>
            </h2>
            <button
              onClick={() => setShowAddGuardModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {guards.map(guard => (
              <div key={guard.id} className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-800 hover:border-blue-500/40 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={guard.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'} 
                      alt={guard.name} 
                      className="w-12 h-12 rounded-xl object-cover border-2 border-slate-700"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-white">{guard.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">ID: {guard.id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    guard.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {guard.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 font-mono pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Gate:</span>
                    <span className="font-bold text-blue-400">{guard.currentGateName || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span>{guard.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Login PIN:</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded font-mono text-amber-400">•••• ({guard.pin})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GUARD DUTY LOGS */}
      {activeTab === 'duty' && (
        <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Guard Duty Log & Shift Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-400">Who was on duty at what gate, login times, QR generation count, and approved entries</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Guard</th>
                  <th className="p-3">Gate</th>
                  <th className="p-3">Duty Login</th>
                  <th className="p-3">Last Activity</th>
                  <th className="p-3 text-center">QRs Generated</th>
                  <th className="p-3 text-center">Approved Entries</th>
                  <th className="p-3 text-center">Complaints</th>
                  <th className="p-3">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dutySessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span>{session.guardName} ({session.guardId})</span>
                    </td>
                    <td className="p-3 text-blue-400 font-semibold">{session.gateName}</td>
                    <td className="p-3 text-slate-300">{new Date(session.loginTime).toLocaleTimeString()}</td>
                    <td className="p-3 text-slate-400">{new Date(session.lastActivity).toLocaleTimeString()}</td>
                    <td className="p-3 text-center font-bold text-amber-400">{session.qrsGenerated}</td>
                    <td className="p-3 text-center font-bold text-emerald-400">{session.entriesApproved}</td>
                    <td className="p-3 text-center font-bold text-rose-400">{session.complaintsCount}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        session.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DRIVER DIRECTORY */}
      {activeTab === 'drivers' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Registered Gig Workers Directory</span>
            </h2>
            
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search name, phone, vehicle..."
                value={driverSearch}
                onChange={e => setDriverSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map(driver => (
              <div key={driver.id} className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-800 hover:border-amber-500/40 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white">{driver.name}</h3>
                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{driver.phone}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    driver.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {driver.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-blue-400" />
                      Vehicle:
                    </span>
                    <span className="font-bold text-white">{driver.vehicleNumber} ({driver.vehicleType})</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Total Entries:</span>
                    <span className="font-bold text-emerald-400">{driver.totalEntries}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Complaints:</span>
                    <span className="font-bold text-rose-400">{driver.complaintCount}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono">Registered Delivery Companies:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {driver.companies.map((comp, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase" style={{ backgroundColor: COMPANY_COLORS[comp] || '#3b82f6' }}>
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedDriver(driver)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={() => handleToggleDriverSuspension(driver.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      driver.status === 'ACTIVE' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {driver.status === 'ACTIVE' ? 'Suspend Driver' : 'Activate Driver'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FULL ENTRY HISTORY */}
      {activeTab === 'entries' && (
        <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Complete Digital Campus Entry Log</span>
              </h2>
              <p className="text-xs text-slate-400">Searchable audit records of all gig worker access events</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search driver, vehicle, token..."
                  value={entrySearch}
                  onChange={e => setEntrySearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={entryCompanyFilter}
                onChange={e => setEntryCompanyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Companies</option>
                <option value="Swiggy">Swiggy</option>
                <option value="Zomato">Zomato</option>
                <option value="Amazon">Amazon</option>
                <option value="Blinkit">Blinkit</option>
                <option value="Zepto">Zepto</option>
                <option value="Uber">Uber</option>
              </select>

              <select
                value={entryGateFilter}
                onChange={e => setEntryGateFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Campus Gates</option>
                {gates.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Driver</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Gate</th>
                  <th className="p-3">Guard</th>
                  <th className="p-3">Token Code</th>
                  <th className="p-3">Selfie</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-300">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-bold text-white">{entry.driverName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase" style={{ backgroundColor: COMPANY_COLORS[entry.company] || '#3b82f6' }}>
                        {entry.company}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{entry.vehicleNumber} ({entry.vehicleType})</td>
                    <td className="p-3 text-blue-400 font-semibold">{entry.gateName}</td>
                    <td className="p-3 text-slate-400">{entry.guardName}</td>
                    <td className="p-3 font-bold text-amber-400">{entry.tokenCode}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => setSelectedEntry(entry)}
                        className="p-1 hover:bg-slate-800 rounded transition"
                      >
                        <img 
                          src={entry.selfieUrl} 
                          alt="Selfie" 
                          className="w-8 h-8 rounded-full object-cover border border-slate-600"
                        />
                      </button>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TOKEN TRACKING */}
      {activeTab === 'tokens' && (
        <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-400" />
              <span>QR Code Token Lifecycle Audit</span>
            </h2>
            <p className="text-xs text-slate-400">Trace every temporary QR token from generation by guard to driver scan and entry verification</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Token Code</th>
                  <th className="p-3">Generated By Guard</th>
                  <th className="p-3">Gate</th>
                  <th className="p-3">Created Time</th>
                  <th className="p-3">Expires Time</th>
                  <th className="p-3">Token Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {tokens.map(token => (
                  <tr key={token.tokenCode} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-extrabold text-amber-400 text-sm">{token.tokenCode}</td>
                    <td className="p-3 text-white font-semibold">{token.guardName} ({token.guardId})</td>
                    <td className="p-3 text-blue-400">{token.gateName}</td>
                    <td className="p-3 text-slate-300">{new Date(token.createdAt).toLocaleTimeString()}</td>
                    <td className="p-3 text-slate-400">{new Date(token.expiresAt).toLocaleTimeString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        token.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : token.status === 'SUBMITTED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : token.status === 'COMPLAINED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {token.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: WHATSAPP GATEWAY MANAGEMENT */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Card */}
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-teal-950/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl shadow-xl shadow-emerald-600/30 ring-2 ring-white/10">
                💬
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">WhatsApp Messaging Gateway</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    waStatus.isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {waStatus.isConnected ? '● Connected (+91 9928388404)' : '○ Disconnected'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Dispatches one-time verification passwords (OTPs) and entry alerts to gig workers.
                </p>
              </div>
            </div>

            {waStatus.isConnected && (
              <button
                onClick={handleDisconnectWa}
                disabled={isWaLoading}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <span>Disconnect / Unlink Device</span>
              </button>
            )}
          </div>

          {/* Connection Manager */}
          {!waStatus.isConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Option A: 8-digit Pairing Code */}
              <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <span>Method 1: Link with Phone Number</span>
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                      ★ Recommended (Instant)
                    </span>
                  </div>
                  
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs text-slate-300 font-mono">
                    <div className="flex items-start gap-2">
                      <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">1</span>
                      <span>Open WhatsApp on phone <strong>+91 {waPhoneToLink}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">2</span>
                      <span>Go to <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[10px]">3</span>
                      <span>Tap <strong className="text-amber-300">"Link with phone number instead"</strong> at bottom</span>
                    </div>
                  </div>

                  {waPairingCode ? (
                    <div className="p-4 bg-slate-950 rounded-2xl border-2 border-emerald-500/40 text-center space-y-3 shadow-xl">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-bold tracking-widest px-1">
                        <span>WhatsApp 8-Character Code</span>
                        <span className="text-emerald-400 animate-pulse">● Active</span>
                      </div>
                      <div className="text-3xl font-black text-amber-400 font-mono tracking-[0.3em] bg-slate-900 py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-3">
                        <span>{waPairingCode.length === 8 ? `${waPairingCode.slice(0, 4)}-${waPairingCode.slice(4)}` : waPairingCode}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(waPairingCode);
                            showToast('Pairing code copied to clipboard!', 'success');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg transition"
                          title="Copy Code"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        Type this code in your phone prompt to link instantly without camera scanning.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 pt-2">
                  {!waPairingCode && (
                    <div>
                      <label className="block text-slate-400 text-xs font-mono mb-1.5">WhatsApp Registered Mobile Number:</label>
                      <input
                        type="text"
                        value={waPhoneToLink}
                        onChange={e => setWaPhoneToLink(e.target.value)}
                        placeholder="10-digit phone number"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleGetWaPairingCode}
                    disabled={isWaLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                  >
                    {isWaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{waPairingCode ? 'Generate New Pairing Code' : 'Generate 8-Character Pairing Code'}</span>
                  </button>
                </div>
              </div>

              {/* Option B: Scan QR Code */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">Method 2: Scan QR Code</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Open WhatsApp on <strong>9928388404</strong> → Linked Devices → Link a Device:
                  </p>
                </div>

                {waStatus.qrCodeDataUrl ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-2xl border border-slate-700">
                      <img src={waStatus.qrCodeDataUrl} alt="WhatsApp QR" className="w-56 h-56 mx-auto rounded-lg" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-mono">Scan QR code using WhatsApp camera prompt</p>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-900 rounded-2xl text-xs text-slate-400 flex flex-col items-center justify-center gap-3 border border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                      📱
                    </div>
                    <span className="font-mono">No active QR code stream</span>
                  </div>
                )}

                <button
                  onClick={handleGenerateWaQr}
                  disabled={isWaLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isWaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  <span>{waStatus.qrCodeDataUrl ? 'Refresh QR Code' : 'Generate QR Code to Scan & Connect'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>WhatsApp Active & Connected</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Connected Phone: <strong className="text-white">+91 9928388404</strong> • All OTPs and access notifications are dispatched automatically in real time.
              </p>
            </div>
          )}

        </div>
      )}

      {/* TAB 7: COMPLAINTS QUEUE */}
      {activeTab === 'complaints' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Incident & Complaint Investigation Queue</span>
            </h2>
            <p className="text-xs text-slate-400">Manage reported security issues flagged by campus guards</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complaints.map(complaint => (
              <div key={complaint.id} className="glass-panel p-5 rounded-2xl space-y-4 border-l-4 border-l-rose-500">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-rose-400 font-mono">#{complaint.id}</span>
                      <span className="text-xs text-slate-400 font-mono">• Token: {complaint.tokenCode}</span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-1">{complaint.reason}</h3>
                  </div>

                  <select
                    value={complaint.status}
                    onChange={e => handleUpdateComplaintStatus(complaint.id, e.target.value as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${
                      complaint.status === 'OPEN' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : complaint.status === 'UNDER_REVIEW'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 p-3 bg-slate-900/90 rounded-xl">
                  {complaint.selfieUrl && (
                    <img 
                      src={complaint.selfieUrl} 
                      alt="Complaint Selfie" 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-rose-500/40"
                    />
                  )}
                  <div className="text-xs font-mono space-y-1">
                    <div className="text-white font-bold">{complaint.driverName} ({complaint.company})</div>
                    <div className="text-slate-400">Vehicle: {complaint.vehicleNumber}</div>
                    <div className="text-slate-400">Guard: {complaint.guardName} @ {complaint.gateName}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-bold block mb-1">Guard Notes:</span>
                  {complaint.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD GUARD ACCOUNT */}
      {showAddGuardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Create New Guard Account</span>
            </h3>

            <form onSubmit={handleAddGuard} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Guard Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Sharma"
                  value={newGuardData.name}
                  onChange={e => setNewGuardData({ ...newGuardData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">4-Digit Security PIN</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="e.g. 2468"
                  value={newGuardData.pin}
                  onChange={e => setNewGuardData({ ...newGuardData, pin: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98334 56789"
                  value={newGuardData.phone}
                  onChange={e => setNewGuardData({ ...newGuardData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assign Primary Campus Gate</label>
                <select
                  value={newGuardData.currentGateId}
                  onChange={e => setNewGuardData({ ...newGuardData, currentGateId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {gates.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGuardModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Save Guard Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ENTRY SELFIE & AUDIT DETAILS */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Entry #{selectedEntry.id}</span>
              <button onClick={() => setSelectedEntry(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <img 
                src={selectedEntry.selfieUrl} 
                alt="Selfie" 
                className="w-36 h-36 rounded-2xl object-cover border-4 border-blue-500 shadow-xl"
              />
              <div className="text-center">
                <h4 className="text-base font-bold text-white">{selectedEntry.driverName}</h4>
                <p className="text-blue-400">{selectedEntry.company} • {selectedEntry.vehicleNumber}</p>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-slate-900 rounded-xl">
              <div className="flex justify-between"><span className="text-slate-400">Token Code:</span><span className="text-amber-400 font-bold">{selectedEntry.tokenCode}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Gate:</span><span>{selectedEntry.gateName}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Guard:</span><span>{selectedEntry.guardName} ({selectedEntry.guardId})</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Location Verified:</span><span className="text-emerald-400 font-bold">✓ Campus Geolocation Verified</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Timestamp:</span><span>{new Date(selectedEntry.createdAt).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
