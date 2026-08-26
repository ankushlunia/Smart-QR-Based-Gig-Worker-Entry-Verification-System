import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'server', 'data.json');

// Helper SVG Data URIs for realistic demo avatars/selfies
const DEMO_SELFIES = [
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%231e293b'/><circle cx='100' cy='80' r='45' fill='%233b82f6'/><path d='M30 180 C30 130 170 130 170 180 Z' fill='%233b82f6'/><text x='100' y='190' font-size='12' fill='white' text-anchor='middle'>VERIFIED SELFIE</text></svg>",
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%230f172a'/><circle cx='100' cy='80' r='45' fill='%2310b981'/><path d='M30 180 C30 130 170 130 170 180 Z' fill='%2310b981'/><text x='100' y='190' font-size='12' fill='white' text-anchor='middle'>VERIFIED SELFIE</text></svg>",
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%2318181b'/><circle cx='100' cy='80' r='45' fill='%238b5cf6'/><path d='M30 180 C30 130 170 130 170 180 Z' fill='%238b5cf6'/><text x='100' y='190' font-size='12' fill='white' text-anchor='middle'>VERIFIED SELFIE</text></svg>"
];

export interface DBState {
  gates: any[];
  guards: any[];
  dutySessions: any[];
  qrTokens: any[];
  drivers: any[];
  entries: any[];
  complaints: any[];
}

const initialSeedData: DBState = {
  gates: [
    { id: 'gate-1', name: 'Main Campus Gate', code: 'GATE-01', status: 'ACTIVE', location: 'North Avenue Road', activeGuardsCount: 1, totalEntriesToday: 18 },
    { id: 'gate-2', name: 'Hostel Block Gate', code: 'GATE-02', status: 'ACTIVE', location: 'South Residential Zone', activeGuardsCount: 1, totalEntriesToday: 24 },
    { id: 'gate-3', name: 'North Sports Gate', code: 'GATE-03', status: 'ACTIVE', location: 'Stadium Complex', activeGuardsCount: 0, totalEntriesToday: 8 },
    { id: 'gate-4', name: 'South Tech Park Gate', code: 'GATE-04', status: 'ACTIVE', location: 'R&D Innovation Hub', activeGuardsCount: 0, totalEntriesToday: 11 }
  ],
  guards: [
    { id: 'G001', name: 'Rajesh Kumar', pin: '1234', phone: '+91 98112 34567', status: 'ACTIVE', currentGateId: 'gate-1', currentGateName: 'Main Campus Gate', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', createdAt: '2026-01-10T08:00:00Z' },
    { id: 'G002', name: 'Amit Singh', pin: '5678', phone: '+91 98223 45678', status: 'ACTIVE', currentGateId: 'gate-2', currentGateName: 'Hostel Block Gate', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', createdAt: '2026-01-12T08:00:00Z' },
    { id: 'G003', name: 'Sunil Sharma', pin: '2468', phone: '+91 98334 56789', status: 'OFFLINE', currentGateId: null, currentGateName: null, photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', createdAt: '2026-02-01T08:00:00Z' },
    { id: 'G004', name: 'Manoj Verma', pin: '1357', phone: '+91 98445 67890', status: 'OFFLINE', currentGateId: null, currentGateName: null, photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', createdAt: '2026-02-15T08:00:00Z' }
  ],
  dutySessions: [
    {
      id: 'ds-101',
      guardId: 'G001',
      guardName: 'Rajesh Kumar',
      gateId: 'gate-1',
      gateName: 'Main Campus Gate',
      loginTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      logoutTime: null,
      lastActivity: new Date().toISOString(),
      qrsGenerated: 19,
      entriesApproved: 18,
      complaintsCount: 1,
      status: 'ACTIVE'
    },
    {
      id: 'ds-102',
      guardId: 'G002',
      guardName: 'Amit Singh',
      gateId: 'gate-2',
      gateName: 'Hostel Block Gate',
      loginTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      logoutTime: null,
      lastActivity: new Date().toISOString(),
      qrsGenerated: 25,
      entriesApproved: 24,
      complaintsCount: 1,
      status: 'ACTIVE'
    }
  ],
  qrTokens: [],
  drivers: [
    {
      id: 'drv-1',
      name: 'Rahul Sharma',
      phone: '9876543210',
      vehicleNumber: 'RJ20XX1234',
      vehicleType: 'Motorcycle',
      companies: ['Swiggy', 'Zomato', 'Amazon'],
      registeredAt: '2026-08-01T10:00:00Z',
      totalEntries: 37,
      complaintCount: 1,
      status: 'ACTIVE'
    },
    {
      id: 'drv-2',
      name: 'Amit Kumar',
      phone: '9812345678',
      vehicleNumber: 'DL04AB5678',
      vehicleType: 'Scooter',
      companies: ['Zomato', 'Blinkit'],
      registeredAt: '2026-08-05T11:30:00Z',
      totalEntries: 24,
      complaintCount: 0,
      status: 'ACTIVE'
    },
    {
      id: 'drv-3',
      name: 'Ravi Singh',
      phone: '9898989898',
      vehicleNumber: 'KA01CD9012',
      vehicleType: 'Motorcycle',
      companies: ['Amazon', 'Zepto', 'Porter'],
      registeredAt: '2026-08-10T14:15:00Z',
      totalEntries: 19,
      complaintCount: 0,
      status: 'ACTIVE'
    },
    {
      id: 'drv-4',
      name: 'Vikram Patel',
      phone: '9765432109',
      vehicleNumber: 'MH12EF3456',
      vehicleType: 'Scooter',
      companies: ['Swiggy', 'Uber'],
      registeredAt: '2026-08-12T09:00:00Z',
      totalEntries: 15,
      complaintCount: 1,
      status: 'ACTIVE'
    },
    {
      id: 'drv-5',
      name: 'Mohammad Ali',
      phone: '9654321098',
      vehicleNumber: 'UP16GH7890',
      vehicleType: 'Motorcycle',
      companies: ['Blinkit', 'Zepto', 'Delhivery'],
      registeredAt: '2026-08-15T16:20:00Z',
      totalEntries: 42,
      complaintCount: 0,
      status: 'ACTIVE'
    }
  ],
  entries: [
    {
      id: 'ent-1001',
      tokenCode: 'X92K101',
      driverId: 'drv-1',
      driverName: 'Rahul Sharma',
      driverPhone: '9876543210',
      vehicleNumber: 'RJ20XX1234',
      vehicleType: 'Motorcycle',
      company: 'Swiggy',
      gateId: 'gate-1',
      gateName: 'Main Campus Gate',
      guardId: 'G001',
      guardName: 'Rajesh Kumar',
      dutySessionId: 'ds-101',
      selfieUrl: DEMO_SELFIES[0],
      lat: 28.5456,
      lng: 77.2732,
      locationVerified: true,
      status: 'ACCEPTED',
      createdAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 3.4 * 3600 * 1000).toISOString()
    },
    {
      id: 'ent-1002',
      tokenCode: 'P72LM102',
      driverId: 'drv-2',
      driverName: 'Amit Kumar',
      driverPhone: '9812345678',
      vehicleNumber: 'DL04AB5678',
      vehicleType: 'Scooter',
      company: 'Zomato',
      gateId: 'gate-1',
      gateName: 'Main Campus Gate',
      guardId: 'G001',
      guardName: 'Rajesh Kumar',
      dutySessionId: 'ds-101',
      selfieUrl: DEMO_SELFIES[1],
      lat: 28.5457,
      lng: 77.2731,
      locationVerified: true,
      status: 'ACCEPTED',
      createdAt: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 2.7 * 3600 * 1000).toISOString()
    },
    {
      id: 'ent-1003',
      tokenCode: 'K91QP103',
      driverId: 'drv-3',
      driverName: 'Ravi Singh',
      driverPhone: '9898989898',
      vehicleNumber: 'KA01CD9012',
      vehicleType: 'Motorcycle',
      company: 'Amazon',
      gateId: 'gate-2',
      gateName: 'Hostel Block Gate',
      guardId: 'G002',
      guardName: 'Amit Singh',
      dutySessionId: 'ds-102',
      selfieUrl: DEMO_SELFIES[2],
      lat: 28.5421,
      lng: 77.2789,
      locationVerified: true,
      status: 'ACCEPTED',
      createdAt: new Date(Date.now() - 2.1 * 3600 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 2.0 * 3600 * 1000).toISOString()
    },
    {
      id: 'ent-1004',
      tokenCode: 'R44TZ104',
      driverId: 'drv-4',
      driverName: 'Vikram Patel',
      driverPhone: '9765432109',
      vehicleNumber: 'MH12EF3456',
      vehicleType: 'Scooter',
      company: 'Uber',
      gateId: 'gate-2',
      gateName: 'Hostel Block Gate',
      guardId: 'G002',
      guardName: 'Amit Singh',
      dutySessionId: 'ds-102',
      selfieUrl: DEMO_SELFIES[0],
      lat: 28.5422,
      lng: 77.2788,
      locationVerified: true,
      status: 'COMPLAINED',
      createdAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 1.1 * 3600 * 1000).toISOString()
    }
  ],
  complaints: [
    {
      id: 'C101',
      entryId: 'ent-1004',
      tokenCode: 'R44TZ104',
      driverId: 'drv-4',
      driverName: 'Vikram Patel',
      guardId: 'G002',
      guardName: 'Amit Singh',
      gateId: 'gate-2',
      gateName: 'Hostel Block Gate',
      reason: 'Driver did not match selfie photo',
      description: 'The person driving the vehicle appeared different from the captured profile selfie snapshot.',
      status: 'OPEN',
      createdAt: new Date(Date.now() - 1.1 * 3600 * 1000).toISOString(),
      selfieUrl: DEMO_SELFIES[0],
      company: 'Uber',
      vehicleNumber: 'MH12EF3456'
    }
  ]
};

function readDB(): DBState {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialSeedData, null, 2));
      return initialSeedData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB data.json:', err);
    return initialSeedData;
  }
}

function writeDB(data: DBState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB data.json:', err);
  }
}

export const db = {
  get: () => readDB(),
  save: (data: DBState) => writeDB(data),

  // Guard Actions
  loginGuard: (guardId: string, pin: string, gateId: string) => {
    const data = readDB();
    const guard = data.guards.find(g => g.id.toLowerCase() === guardId.toLowerCase());
    if (!guard) return { error: 'Guard ID not found' };
    if (guard.pin !== pin) return { error: 'Invalid PIN credentials' };

    const gate = data.gates.find(gt => gt.id === gateId) || data.gates[0];

    // Update guard status
    guard.status = 'ACTIVE';
    guard.currentGateId = gate.id;
    guard.currentGateName = gate.name;

    // End existing session if any
    let activeSession = data.dutySessions.find(ds => ds.guardId === guard.id && ds.status === 'ACTIVE');
    if (!activeSession) {
      activeSession = {
        id: `ds-${Date.now()}`,
        guardId: guard.id,
        guardName: guard.name,
        gateId: gate.id,
        gateName: gate.name,
        loginTime: new Date().toISOString(),
        logoutTime: null,
        lastActivity: new Date().toISOString(),
        qrsGenerated: 0,
        entriesApproved: 0,
        complaintsCount: 0,
        status: 'ACTIVE'
      };
      data.dutySessions.unshift(activeSession);
    } else {
      activeSession.gateId = gate.id;
      activeSession.gateName = gate.name;
      activeSession.lastActivity = new Date().toISOString();
    }

    // Update gate stats
    const gateObj = data.gates.find(g => g.id === gate.id);
    if (gateObj) {
      gateObj.activeGuardsCount = data.guards.filter(g => g.status === 'ACTIVE' && g.currentGateId === gateObj.id).length;
    }

    writeDB(data);
    return { guard, dutySession: activeSession, gate };
  },

  // QR Token Generation
  generateQRToken: (dutySessionId: string) => {
    const data = readDB();
    let session = data.dutySessions.find(ds => ds.id === dutySessionId && ds.status === 'ACTIVE');
    if (!session) {
      // Fallback to active guard session
      const activeSession = data.dutySessions.find(ds => ds.status === 'ACTIVE');
      if (!activeSession) return { error: 'No active guard duty session found' };
      session = activeSession;
    }

    const tokenCode = `X${Math.floor(100000 + Math.random() * 900000)}`; // e.g. X792814
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 minutes validity

    const tokenObj = {
      tokenCode,
      dutySessionId: session.id,
      guardId: session.guardId,
      guardName: session.guardName,
      gateId: session.gateId,
      gateName: session.gateName,
      createdAt,
      expiresAt,
      status: 'UNUSED'
    };

    session.qrsGenerated += 1;
    session.lastActivity = createdAt;
    data.qrTokens.unshift(tokenObj);

    writeDB(data);
    return { token: tokenObj };
  },

  validateQRToken: (tokenCode: string) => {
    const data = readDB();
    const tokenObj = data.qrTokens.find(t => t.tokenCode.toUpperCase() === tokenCode.toUpperCase());
    if (!tokenObj) {
      // Create ad-hoc token for testing if invalid
      return { valid: false, message: 'Invalid or expired QR Code Token' };
    }

    if (new Date(tokenObj.expiresAt).getTime() < Date.now()) {
      tokenObj.status = 'EXPIRED';
      writeDB(data);
      return { valid: false, message: 'QR Code has expired. Please ask the guard for a new QR.' };
    }

    if (tokenObj.status !== 'UNUSED') {
      return { valid: false, message: `This QR token has already been ${tokenObj.status.toLowerCase()}.` };
    }

    return { valid: true, token: tokenObj };
  },

  // Driver Profile Lookup
  lookupDriverByPhone: (phone: string) => {
    const data = readDB();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const driver = data.drivers.find(d => d.phone.replace(/\D/g, '') === cleanPhone);
    return driver || null;
  },

  registerDriver: (driverData: any) => {
    const data = readDB();
    const cleanPhone = driverData.phone.trim().replace(/\D/g, '');
    let existing = data.drivers.find(d => d.phone.replace(/\D/g, '') === cleanPhone);
    
    if (existing) {
      existing.name = driverData.name || existing.name;
      existing.vehicleNumber = driverData.vehicleNumber || existing.vehicleNumber;
      existing.vehicleType = driverData.vehicleType || existing.vehicleType;
      existing.companies = Array.from(new Set([...existing.companies, ...(driverData.companies || [])]));
      writeDB(data);
      return existing;
    }

    const newDriver = {
      id: `drv-${Date.now()}`,
      name: driverData.name,
      phone: cleanPhone,
      vehicleNumber: driverData.vehicleNumber.toUpperCase(),
      vehicleType: driverData.vehicleType || 'Motorcycle',
      companies: driverData.companies || ['Swiggy'],
      registeredAt: new Date().toISOString(),
      totalEntries: 0,
      complaintCount: 0,
      status: 'ACTIVE'
    };

    data.drivers.unshift(newDriver);
    writeDB(data);
    return newDriver;
  },

  // Entry Submission & Verification
  submitDriverEntry: (payload: {
    tokenCode: string;
    phone: string;
    name: string;
    vehicleNumber: string;
    vehicleType: any;
    company: string;
    selfieUrl: string;
    lat?: number;
    lng?: number;
    locationVerified?: boolean;
  }) => {
    const data = readDB();
    
    // Register / Retrieve driver
    let driver = db.lookupDriverByPhone(payload.phone);
    if (!driver) {
      driver = db.registerDriver({
        name: payload.name,
        phone: payload.phone,
        vehicleNumber: payload.vehicleNumber,
        vehicleType: payload.vehicleType,
        companies: [payload.company]
      });
    } else {
      // Ensure company added if new
      if (!driver.companies.includes(payload.company)) {
        driver.companies.push(payload.company);
      }
    }

    // Find token context
    let tokenObj = data.qrTokens.find(t => t.tokenCode.toUpperCase() === payload.tokenCode.toUpperCase());
    let guardId = 'G001';
    let guardName = 'Rajesh Kumar';
    let gateId = 'gate-1';
    let gateName = 'Main Campus Gate';
    let dutySessionId = 'ds-101';

    if (tokenObj) {
      tokenObj.status = 'SUBMITTED';
      tokenObj.usedAt = new Date().toISOString();
      guardId = tokenObj.guardId;
      guardName = tokenObj.guardName;
      gateId = tokenObj.gateId;
      gateName = tokenObj.gateName;
      dutySessionId = tokenObj.dutySessionId;
    }

    const newEntry = {
      id: `ent-${Date.now()}`,
      tokenCode: payload.tokenCode.toUpperCase(),
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleNumber: payload.vehicleNumber.toUpperCase(),
      vehicleType: payload.vehicleType || driver.vehicleType,
      company: payload.company,
      gateId,
      gateName,
      guardId,
      guardName,
      dutySessionId,
      selfieUrl: payload.selfieUrl || DEMO_SELFIES[0],
      lat: payload.lat || 28.5456,
      lng: payload.lng || 77.2732,
      locationVerified: payload.locationVerified !== undefined ? payload.locationVerified : true,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      verifiedAt: null
    };

    data.entries.unshift(newEntry);
    writeDB(data);
    return { entry: newEntry, driver, guardId, gateId };
  },

  verifyEntry: (entryId: string, decision: 'ACCEPT' | 'COMPLAINT', complaintPayload?: { reason: string; description: string }) => {
    const data = readDB();
    const entry = data.entries.find(e => e.id === entryId);
    if (!entry) return { error: 'Entry not found' };

    const now = new Date().toISOString();
    entry.verifiedAt = now;

    // Update duty session stats
    let session = data.dutySessions.find(ds => ds.id === entry.dutySessionId);
    
    // Update driver total entries
    const driver = data.drivers.find(d => d.id === entry.driverId);

    let complaintObj = null;

    if (decision === 'ACCEPT') {
      entry.status = 'ACCEPTED';
      if (session) session.entriesApproved += 1;
      if (driver) driver.totalEntries += 1;
      
      // Update token status
      const token = data.qrTokens.find(t => t.tokenCode === entry.tokenCode);
      if (token) token.status = 'VERIFIED';

      // Update gate total entries
      const gate = data.gates.find(g => g.id === entry.gateId);
      if (gate) gate.totalEntriesToday += 1;

    } else if (decision === 'COMPLAINT') {
      entry.status = 'COMPLAINED';
      if (session) session.complaintsCount += 1;
      if (driver) driver.complaintCount += 1;

      const token = data.qrTokens.find(t => t.tokenCode === entry.tokenCode);
      if (token) token.status = 'COMPLAINED';

      complaintObj = {
        id: `C${Math.floor(100 + Math.random() * 900)}`,
        entryId: entry.id,
        tokenCode: entry.tokenCode,
        driverId: entry.driverId,
        driverName: entry.driverName,
        guardId: entry.guardId,
        guardName: entry.guardName,
        gateId: entry.gateId,
        gateName: entry.gateName,
        reason: complaintPayload?.reason || 'Suspicious Activity',
        description: complaintPayload?.description || 'Guard raised flag during physical entry check.',
        status: 'OPEN',
        createdAt: now,
        selfieUrl: entry.selfieUrl,
        company: entry.company,
        vehicleNumber: entry.vehicleNumber
      };

      data.complaints.unshift(complaintObj);
    }

    writeDB(data);
    return { entry, complaint: complaintObj };
  },

  // Dashboard Aggregated Analytics
  getDashboardStats: () => {
    const data = readDB();
    const today = new Date().toISOString().split('T')[0];

    const totalEntriesToday = data.entries.filter(e => e.status === 'ACCEPTED').length;
    const activeGuards = data.guards.filter(g => g.status === 'ACTIVE').length;
    const activeGates = data.gates.filter(gt => gt.status === 'ACTIVE').length;
    const registeredDrivers = data.drivers.length;
    const totalComplaints = data.complaints.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW').length;
    const pendingVerifications = data.entries.filter(e => e.status === 'PENDING').length;

    // Entries by Gate
    const entriesByGateMap: { [key: string]: number } = {};
    data.gates.forEach(g => { entriesByGateMap[g.name] = 0; });
    data.entries.forEach(e => {
      if (entriesByGateMap[e.gateName] !== undefined) {
        entriesByGateMap[e.gateName] += 1;
      } else {
        entriesByGateMap[e.gateName] = 1;
      }
    });

    const entriesByGate = Object.keys(entriesByGateMap).map(gateName => ({
      gateName,
      count: entriesByGateMap[gateName]
    }));

    // Entries by Company
    const companyMap: { [key: string]: number } = {};
    data.entries.forEach(e => {
      companyMap[e.company] = (companyMap[e.company] || 0) + 1;
    });

    const entriesByCompany = Object.keys(companyMap).map(company => ({
      company,
      count: companyMap[company]
    }));

    // Hourly Entries chart (e.g. 08:00 to 22:00)
    const hourlyMap: { [key: string]: number } = {};
    for (let h = 8; h <= 22; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourlyMap[label] = 0;
    }

    data.entries.forEach(e => {
      const date = new Date(e.createdAt);
      const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;
      if (hourlyMap[hourStr] !== undefined) {
        hourlyMap[hourStr] += 1;
      }
    });

    const hourlyEntries = Object.keys(hourlyMap).map(hour => ({
      hour,
      count: hourlyMap[hour]
    }));

    return {
      totalEntriesToday,
      activeGuards,
      activeGates,
      registeredDrivers,
      totalComplaints,
      pendingVerifications,
      entriesByGate,
      entriesByCompany,
      hourlyEntries
    };
  }
};
