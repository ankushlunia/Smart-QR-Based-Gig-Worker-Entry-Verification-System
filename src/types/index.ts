export type VehicleType = 'Motorcycle' | 'Scooter' | 'Bicycle' | 'Car' | 'Auto';

export type DeliveryCompany = 
  | 'Swiggy'
  | 'Zomato'
  | 'Amazon'
  | 'Uber'
  | 'Ola'
  | 'Blinkit'
  | 'Zepto'
  | 'Porter'
  | 'Delhivery'
  | 'Other';

export interface Gate {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
  location: string;
  activeGuardsCount: number;
  totalEntriesToday: number;
}

export interface Guard {
  id: string;
  name: string;
  pin: string;
  phone: string;
  status: 'ACTIVE' | 'OFFLINE';
  currentGateId: string | null;
  currentGateName?: string | null;
  photoUrl?: string;
  createdAt: string;
}

export interface DutySession {
  id: string;
  guardId: string;
  guardName: string;
  gateId: string;
  gateName: string;
  loginTime: string;
  logoutTime?: string | null;
  lastActivity: string;
  qrsGenerated: number;
  entriesApproved: number;
  complaintsCount: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface QRToken {
  tokenCode: string;
  dutySessionId: string;
  guardId: string;
  guardName: string;
  gateId: string;
  gateName: string;
  createdAt: string;
  expiresAt: string;
  status: 'UNUSED' | 'SCANNED' | 'SUBMITTED' | 'VERIFIED' | 'EXPIRED' | 'COMPLAINED';
  usedAt?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  companies: string[];
  registeredAt: string;
  totalEntries: number;
  complaintCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Entry {
  id: string;
  tokenCode: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  company: string;
  gateId: string;
  gateName: string;
  guardId: string;
  guardName: string;
  dutySessionId: string;
  selfieUrl: string;
  lat?: number;
  lng?: number;
  locationVerified: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLAINED';
  createdAt: string;
  verifiedAt?: string | null;
}

export interface Complaint {
  id: string;
  entryId: string;
  tokenCode: string;
  driverId: string;
  driverName: string;
  guardId: string;
  guardName: string;
  gateId: string;
  gateName: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string;
  selfieUrl?: string;
  company?: string;
  vehicleNumber?: string;
}

export interface DashboardStats {
  totalEntriesToday: number;
  activeGuards: number;
  activeGates: number;
  registeredDrivers: number;
  totalComplaints: number;
  pendingVerifications: number;
  entriesByGate: Array<{ gateName: string; count: number }>;
  entriesByCompany: Array<{ company: string; count: number }>;
  hourlyEntries: Array<{ hour: string; count: number }>;
}
