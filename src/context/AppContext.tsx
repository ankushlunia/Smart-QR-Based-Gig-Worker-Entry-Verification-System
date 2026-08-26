import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DashboardStats, Guard, Gate, DutySession, Entry } from '../types';
import { sounds } from '../utils/audio';

interface AppContextType {
  socket: Socket | null;
  connected: boolean;
  stats: DashboardStats | null;
  guards: Guard[];
  gates: Gate[];
  activeGuard: Guard | null;
  activeDutySession: DutySession | null;
  incomingDriverAlert: Entry | null;
  setIncomingDriverAlert: (alert: Entry | null) => void;
  toastMessage: { text: string; type: 'info' | 'success' | 'warning' } | null;
  showToast: (text: string, type?: 'info' | 'success' | 'warning') => void;
  loginGuard: (guardId: string, pin: string, gateId: string) => Promise<boolean>;
  logoutGuard: () => void;
  refreshData: () => Promise<void>;
  setActiveGuard: (guard: Guard | null) => void;
  setActiveDutySession: (session: DutySession | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);

  // Persistent Guard session
  const [activeGuard, setActiveGuard] = useState<Guard | null>(() => {
    try {
      const saved = localStorage.getItem('gatepass_guard');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeDutySession, setActiveDutySession] = useState<DutySession | null>(() => {
    try {
      const saved = localStorage.getItem('gatepass_duty_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [incomingDriverAlert, setIncomingDriverAlert] = useState<Entry | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshData = async () => {
    try {
      const [statsRes, guardsRes, gatesRes] = await Promise.all([
        fetch('/api/admin/dashboard').then(r => r.json()),
        fetch('/api/guards').then(r => r.json()),
        fetch('/api/gates').then(r => r.json())
      ]);
      setStats(statsRes);
      setGuards(guardsRes);
      setGates(gatesRes);
    } catch (err) {
      console.error('Error refreshing app data:', err);
    }
  };

  useEffect(() => {
    // Connect Socket.IO
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      reconnectionAttempts: 10,
      timeout: 10000
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('⚡ Socket connected to backend');
      if (activeGuard) {
        newSocket.emit('join_guard_room', activeGuard.id);
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('dashboard_update', (newStats: DashboardStats) => {
      setStats(newStats);
    });

    newSocket.on('new_driver_submission', (entry: Entry) => {
      console.log('🔔 Driver submitted entry:', entry);
      setIncomingDriverAlert(entry);
      sounds.playAlertChime();
      showToast(`⚡ Driver ${entry.driverName} (${entry.company}) submitted entry!`, 'info');
    });

    setSocket(newSocket);
    refreshData();

    return () => {
      newSocket.disconnect();
    };
  }, [activeGuard]);

  const loginGuard = async (guardId: string, pin: string, gateId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/guard-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardId, pin, gateId })
      });
      const data = await res.json();
      if (res.ok && data.guard) {
        setActiveGuard(data.guard);
        setActiveDutySession(data.dutySession);
        
        // Save to localStorage for persistent session
        localStorage.setItem('gatepass_guard', JSON.stringify(data.guard));
        localStorage.setItem('gatepass_duty_session', JSON.stringify(data.dutySession));

        if (socket) {
          socket.emit('join_guard_room', data.guard.id);
        }
        showToast(`Welcome Guard ${data.guard.name}! Duty started at ${data.gate.name}`, 'success');
        refreshData();
        return true;
      } else {
        showToast(data.error || 'Guard login failed', 'warning');
        return false;
      }
    } catch (err) {
      showToast('Network error logging in guard', 'warning');
      return false;
    }
  };

  const logoutGuard = () => {
    setActiveGuard(null);
    setActiveDutySession(null);
    localStorage.removeItem('gatepass_guard');
    localStorage.removeItem('gatepass_duty_session');
    showToast('Guard logged out of duty session.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        socket,
        connected,
        stats,
        guards,
        gates,
        activeGuard,
        activeDutySession,
        incomingDriverAlert,
        setIncomingDriverAlert,
        toastMessage,
        showToast,
        loginGuard,
        logoutGuard,
        refreshData,
        setActiveGuard,
        setActiveDutySession
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
