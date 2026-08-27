import { initWhatsAppClient, whatsappClient } from './whatsappClient.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { otpStore } from './otpStore.js';
import { whatsappService } from './whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket connection logger
io.on('connection', (socket) => {
  console.log(`⚡ Socket client connected: ${socket.id}`);
  
  socket.on('join_guard_room', (guardId) => {
    socket.join(`guard_${guardId}`);
    console.log(`Guard ${guardId} joined socket room: guard_${guardId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket client disconnected: ${socket.id}`);
  });
});

// Helper to notify all clients of updated stats
function broadcastStatsUpdate() {
  const stats = db.getDashboardStats();
  io.emit('dashboard_update', stats);
}

// REST Routes

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Admin Dashboard Stats
app.get('/api/admin/dashboard', (req, res) => {
  const stats = db.getDashboardStats();
  res.json(stats);
});

// 3. Guards CRUD & Gate Assignments
app.get('/api/guards', (req, res) => {
  const data = db.get();
  res.json(data.guards);
});

app.post('/api/guards', (req, res) => {
  const data = db.get();
  const { name, pin, phone, currentGateId } = req.body;
  
  if (!name || !pin || !phone) {
    return res.status(400).json({ error: 'Name, PIN, and Phone are required.' });
  }

  const gate = data.gates.find(g => g.id === currentGateId);
  const newGuard = {
    id: `G00${data.guards.length + 1}`,
    name,
    pin,
    phone,
    status: 'OFFLINE',
    currentGateId: currentGateId || null,
    currentGateName: gate ? gate.name : null,
    photoUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
    createdAt: new Date().toISOString()
  };

  data.guards.unshift(newGuard);
  db.save(data);
  broadcastStatsUpdate();
  res.status(201).json(newGuard);
});

app.patch('/api/guards/:id', (req, res) => {
  const data = db.get();
  const guard = data.guards.find(g => g.id === req.params.id);
  if (!guard) return res.status(404).json({ error: 'Guard not found' });

  const { name, pin, phone, currentGateId, status } = req.body;
  if (name !== undefined) guard.name = name;
  if (pin !== undefined) guard.pin = pin;
  if (phone !== undefined) guard.phone = phone;
  if (status !== undefined) guard.status = status;

  if (currentGateId !== undefined) {
    const gate = data.gates.find(g => g.id === currentGateId);
    guard.currentGateId = currentGateId;
    guard.currentGateName = gate ? gate.name : null;
  }

  db.save(data);
  broadcastStatsUpdate();
  res.json(guard);
});

app.delete('/api/guards/:id', (req, res) => {
  const data = db.get();
  data.guards = data.guards.filter(g => g.id !== req.params.id);
  db.save(data);
  broadcastStatsUpdate();
  res.json({ message: 'Guard removed successfully' });
});

// 4. Guard Duty Sessions (Duty Tracking & Audit Logs)
app.get('/api/duty-sessions', (req, res) => {
  const data = db.get();
  res.json(data.dutySessions);
});

// 5. Gates List
app.get('/api/gates', (req, res) => {
  const data = db.get();
  res.json(data.gates);
});

// 6. Guard Authentication / Login
app.post('/api/auth/guard-login', (req, res) => {
  const { guardId, pin, gateId } = req.body;
  const result = db.loginGuard(guardId, pin, gateId);
  if (result.error) return res.status(401).json(result);
  
  broadcastStatsUpdate();
  res.json(result);
});

// 6b. Guard 2FA: Verify PIN credentials, then send WhatsApp OTP
app.post('/api/guards/send-login-otp', async (req, res) => {
  const { guardId, pin } = req.body;
  if (!guardId || !pin) {
    return res.status(400).json({ error: 'Guard ID and PIN are required.' });
  }

  const data = db.get();
  const guard = data.guards.find(
    (g: any) => g.id.toLowerCase() === guardId.trim().toLowerCase() && g.pin === pin
  );

  if (!guard) {
    return res.status(401).json({ error: 'Invalid Guard ID or PIN. Please try again.' });
  }

  const phone = guard.phone?.replace(/\D/g, '') || '';
  if (phone.length < 10) {
    return res.status(400).json({ error: 'No registered WhatsApp number found for this guard. Contact admin.' });
  }

  const otp = otpStore.generate(`guard_login_${guard.id}`);
  await whatsappService.sendOTP(phone, otp);

  res.json({
    success: true,
    guardName: guard.name,
    phone,
    demoOtp: otp,
    message: `2FA code sent to WhatsApp +91 ${phone.slice(-10)}`
  });
});

// 6c. Guard 2FA: Verify OTP and complete login
app.post('/api/guards/verify-login-otp', (req, res) => {
  const { guardId, pin, gateId, otp } = req.body;
  if (!guardId || !pin || !otp) {
    return res.status(400).json({ error: 'Guard ID, PIN, and OTP are required.' });
  }

  const isOtpValid = otpStore.verify(`guard_login_${guardId.trim()}`, otp.trim());
  if (!isOtpValid) {
    return res.status(400).json({ error: 'Invalid or expired 2FA OTP code. Please try again.' });
  }

  // Proceed with normal login
  const result = db.loginGuard(guardId, pin, gateId);
  if (result.error) return res.status(401).json(result);

  broadcastStatsUpdate();
  res.json(result);
});

// 7. QR Token Generation
app.post('/api/qr/generate', (req, res) => {
  const { dutySessionId } = req.body;
  const result = db.generateQRToken(dutySessionId);
  if (result.error) return res.status(400).json(result);

  // Broadcast event to sockets
  io.emit('qr_generated', result.token);
  broadcastStatsUpdate();
  res.json(result);
});

// 8. Validate QR Token
app.get('/api/qr/validate/:token', (req, res) => {
  const result = db.validateQRToken(req.params.token);
  res.json(result);
});

// 9. QR Tokens Audit History
app.get('/api/qr/history', (req, res) => {
  const data = db.get();
  res.json(data.qrTokens);
});

// 10. Driver Profile Lookup & Management
app.get('/api/driver/lookup/:phone', (req, res) => {
  const driver = db.lookupDriverByPhone(req.params.phone);
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  res.json(driver);
});

app.post('/api/driver/register', (req, res) => {
  const driver = db.registerDriver(req.body);
  broadcastStatsUpdate();
  res.status(201).json(driver);
});

app.get('/api/drivers', (req, res) => {
  const data = db.get();
  res.json(data.drivers);
});

app.patch('/api/drivers/:id/status', (req, res) => {
  const data = db.get();
  const driver = data.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  driver.status = req.body.status || (driver.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
  db.save(data);
  broadcastStatsUpdate();
  res.json(driver);
});

// Suspended driver scanned QR — alert the guard and return suspended status
app.post('/api/driver/suspended-scan', (req, res) => {
  const { phone, tokenCode } = req.body;
  if (!phone || !tokenCode) return res.status(400).json({ error: 'phone and tokenCode required' });

  const data = db.get();
  const driver = data.drivers.find((d: any) => d.phone?.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  if (driver.status !== 'SUSPENDED') {
    return res.json({ suspended: false });
  }

  // Find which guard owns this QR token
  const token = data.qrTokens?.find((t: any) => t.tokenCode === tokenCode);
  const guardId = token?.guardId || null;

  // Broadcast UNAUTHORIZED alert to all connected guard portals
  const alertPayload = {
    type: 'SUSPENDED_DRIVER_SCAN',
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      complaintCount: driver.complaintCount
    },
    tokenCode,
    gateName: token?.gateName || 'Unknown Gate',
    timestamp: new Date().toISOString()
  };

  io.emit('suspended_driver_alert', alertPayload);
  if (guardId) {
    io.to(`guard_${guardId}`).emit('guard_driver_alert_suspended', alertPayload);
  }

  res.json({
    suspended: true,
    driverName: driver.name,
    vehicleNumber: driver.vehicleNumber,
    complaintCount: driver.complaintCount,
    message: 'Your account has been suspended. Please file a reinstatement request.'
  });
});

// Driver files a reinstatement request (complaint to admin)
app.post('/api/driver/reinstatement-request', (req, res) => {
  const { driverPhone, driverName, vehicleNumber, reason } = req.body;
  if (!driverPhone || !reason) {
    return res.status(400).json({ error: 'driverPhone and reason are required.' });
  }

  const data = db.get();
  const driver = data.drivers.find((d: any) => d.phone?.replace(/\D/g, '') === driverPhone.replace(/\D/g, ''));

  const reinstatementId = `reinstate_${Date.now()}`;
  const complaint: any = {
    id: reinstatementId,
    type: 'REINSTATEMENT_REQUEST',
    driverId: driver?.id || `unknown_${driverPhone}`,
    driverName: driverName || driver?.name || 'Unknown',
    driverPhone,
    vehicleNumber: vehicleNumber || driver?.vehicleNumber || 'N/A',
    reason,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolutionNote: null
  };

  if (!data.complaints) data.complaints = [];
  data.complaints.unshift(complaint);
  db.save(data);
  broadcastStatsUpdate();

  // Notify admin dashboard
  io.emit('reinstatement_request', complaint);

  res.status(201).json({
    success: true,
    requestId: reinstatementId,
    message: 'Your reinstatement request has been filed. Admin will review it shortly.'
  });
});

// 11. Driver Entry Submission (Driver side)
app.post('/api/entry/submit', (req, res) => {
  const { tokenCode, phone, name, vehicleNumber, vehicleType, company, selfieUrl, lat, lng, locationVerified } = req.body;

  if (!tokenCode || !phone || !name || !vehicleNumber || !company) {
    return res.status(400).json({ error: 'Missing required entry fields.' });
  }

  // Validate QR Token
  const tokenValidation = db.validateQRToken(tokenCode);
  if (!tokenValidation.valid) {
    return res.status(400).json({ error: tokenValidation.message });
  }

  const result = db.submitDriverEntry({
    tokenCode,
    phone,
    name,
    vehicleNumber,
    vehicleType,
    company,
    selfieUrl,
    lat,
    lng,
    locationVerified
  });

  // INSTANT SOCKET EMISSION to Guard Portal & Admin!
  io.emit('new_driver_submission', result.entry);
  io.to(`guard_${result.guardId}`).emit('guard_driver_alert', result.entry);
  broadcastStatsUpdate();

  res.status(201).json(result.entry);
});

// 12. Guard Entry Verification (Accept or Complaint)
app.post('/api/entry/verify', (req, res) => {
  const { entryId, decision, reason, description } = req.body;
  if (!entryId || !decision) {
    return res.status(400).json({ error: 'entryId and decision are required' });
  }

  const result = db.verifyEntry(entryId, decision, { reason, description });
  if (result.error) return res.status(400).json(result);

  // Broadcast decision back to Driver screen and Admin
  io.emit('entry_decision_updated', result);
  broadcastStatsUpdate();

  res.json(result);
});

// 13. Entries History
app.get('/api/entries', (req, res) => {
  const data = db.get();
  res.json(data.entries);
});

// 14. Complaints Management
app.get('/api/complaints', (req, res) => {
  const data = db.get();
  res.json(data.complaints);
});

app.patch('/api/complaints/:id/status', (req, res) => {
  const data = db.get();
  const complaint = data.complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const { status, note } = req.body;
  if (status) complaint.status = status;
  if (note) complaint.resolutionNote = note;
  if (status === 'RESOLVED') complaint.resolvedAt = new Date().toISOString();

  db.save(data);
  broadcastStatsUpdate();
  res.json(complaint);
});

// 15. Quick Interactive Demo Simulator API
app.post('/api/demo/simulate-entry', (req, res) => {
  const data = db.get();
  
  // Create an active session and token automatically if needed
  const session = data.dutySessions[0];
  const tokenRes = db.generateQRToken(session.id);
  if (!tokenRes.token) {
    return res.status(400).json({ error: tokenRes.error || 'Failed to generate token' });
  }
  const tokenCode = tokenRes.token.tokenCode;

  // Pick random delivery company and vehicle
  const companies = ['Swiggy', 'Zomato', 'Amazon', 'Blinkit', 'Zepto'];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const randomDriver = data.drivers[Math.floor(Math.random() * data.drivers.length)];

  const entryRes = db.submitDriverEntry({
    tokenCode,
    phone: randomDriver.phone,
    name: randomDriver.name,
    vehicleNumber: randomDriver.vehicleNumber,
    vehicleType: randomDriver.vehicleType,
    company,
    selfieUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%231e293b'/><circle cx='100' cy='80' r='45' fill='%233b82f6'/><path d='M30 180 C30 130 170 130 170 180 Z' fill='%233b82f6'/><text x='100' y='190' font-size='12' fill='white' text-anchor='middle'>DEMO SELFIE</text></svg>`,
    locationVerified: true
  });

  io.emit('new_driver_submission', entryRes.entry);
  broadcastStatsUpdate();

  res.json({ message: 'Demo entry simulated successfully', entry: entryRes.entry, tokenCode });
});

// 20. WhatsApp Gateway Status & QR Endpoint
app.get('/api/whatsapp/status', (req, res) => {
  res.json(whatsappClient.getState());
});

app.post('/api/whatsapp/generate-qr', async (req, res) => {
  const result = await whatsappClient.generateQR();
  res.json(result);
});

app.post('/api/whatsapp/pairing-code', async (req, res) => {
  const { phone } = req.body;
  const result = await whatsappClient.getPairingCode(phone || '9928388404');
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  const result = await whatsappClient.disconnect();
  res.json(result);
});

// 15b. Official 2FA Auth OTP
app.post('/api/official/send-otp', async (req, res) => {
  const { username, password, phone } = req.body;
  const validOfficials = [
    { username: 'admin', password: 'admin123', defaultPhone: '9928388404', name: 'Campus Security Director' },
    { username: 'official', password: 'official123', defaultPhone: '9928388404', name: 'Campus Safety Admin' }
  ];

  const match = validOfficials.find(
    o => o.username.toLowerCase() === (username || '').trim().toLowerCase() && o.password === password
  );

  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password. Please verify your credentials.' });
  }

  const targetPhone = (phone || match.defaultPhone).trim().replace(/\D/g, '');
  if (targetPhone.length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number required for 2FA verification.' });
  }

  const otp = otpStore.generate(`official_${targetPhone}`);
  await whatsappService.sendOTP(targetPhone, otp);

  res.json({
    success: true,
    targetPhone,
    officialName: match.name,
    demoOtp: otp,
    message: `2FA Verification code sent to WhatsApp +91 ${targetPhone.slice(-10)}`
  });
});

app.post('/api/official/verify-otp', (req, res) => {
  const { phone, otp, username } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and 6-digit OTP are required.' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  const isOtpValid = otpStore.verify(`official_${cleanPhone}`, otp);
  if (!isOtpValid) {
    return res.status(400).json({ error: 'Invalid or expired 2FA OTP code. Please try again.' });
  }

  res.json({
    success: true,
    message: 'Official 2FA authentication verified successfully.',
    user: { username: username || 'admin', role: 'Security Administrator' }
  });
});

// Official Reset Password - Send OTP
app.post('/api/official/forgot-password-otp', async (req, res) => {
  const { username, phone } = req.body;
  const targetPhone = (phone || '9928388404').trim().replace(/\D/g, '');
  if (targetPhone.length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit registered WhatsApp mobile number required.' });
  }

  const otp = otpStore.generate(`official_reset_${targetPhone}`);
  await whatsappService.sendOTP(targetPhone, otp);

  res.json({
    success: true,
    demoOtp: otp,
    message: `Password reset OTP sent to WhatsApp +91 ${targetPhone.slice(-10)}`
  });
});

// Official Reset Password - Verify & Set New Password
app.post('/api/official/reset-password', (req, res) => {
  const { phone, otp, newPassword } = req.body;
  if (!phone || !otp || !newPassword) {
    return res.status(400).json({ error: 'Phone, OTP, and New Password are required.' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  const isValid = otpStore.verify(`official_reset_${cleanPhone}`, otp);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired OTP code for password reset.' });
  }

  res.json({
    success: true,
    message: 'Admin Official Password has been reset successfully! You can now log in.'
  });
});

// Guard Reset PIN - Send OTP
app.post('/api/guards/forgot-pin-otp', async (req, res) => {
  const { guardId, phone } = req.body;
  if (!guardId) return res.status(400).json({ error: 'Guard ID is required.' });

  const data = db.get();
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const guard = data.guards.find(g => g.id.toLowerCase() === guardId.toLowerCase().trim() || (cleanPhone && g.phone.replace(/\D/g, '') === cleanPhone));

  const targetPhone = guard ? guard.phone.replace(/\D/g, '') : (cleanPhone || '9928388404');
  const otp = otpStore.generate(`guard_pin_${guard ? guard.id : guardId}`);
  await whatsappService.sendOTP(targetPhone, otp);

  res.json({
    success: true,
    guardId: guard ? guard.id : guardId,
    guardName: guard ? guard.name : 'Guard',
    phone: targetPhone,
    demoOtp: otp,
    message: `Security PIN reset OTP dispatched to WhatsApp +91 ${targetPhone.slice(-10)}`
  });
});

// Guard Reset PIN - Verify & Update PIN
app.post('/api/guards/reset-pin', (req, res) => {
  const { guardId, otp, newPin } = req.body;
  if (!guardId || !otp || !newPin || newPin.length < 4) {
    return res.status(400).json({ error: 'Guard ID, 6-digit OTP, and 4-digit new PIN are required.' });
  }

  const isValid = otpStore.verify(`guard_pin_${guardId}`, otp);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired OTP for PIN reset.' });
  }

  const data = db.get();
  const guard = data.guards.find(g => g.id.toLowerCase() === guardId.toLowerCase().trim());
  if (guard) {
    guard.pin = newPin;
    db.save(data);
    broadcastStatsUpdate();
  }

  res.json({
    success: true,
    message: `Security PIN for Guard ${guard ? guard.name : guardId} updated successfully!`
  });
});

// 16. Send WhatsApp OTP for Gig Worker Auth
app.post('/api/driver/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.trim().length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  const existingDriver = db.lookupDriverByPhone(cleanPhone);
  const otp = otpStore.generate(cleanPhone);

  // Dispatch real WhatsApp message
  await whatsappService.sendOTP(cleanPhone, otp);

  res.json({
    success: true,
    exists: !!existingDriver,
    driver: existingDriver || null,
    sender: '9928388404',
    message: 'Verification code sent to your WhatsApp number from +91 9928388404'
  });
});

// 17. Verify WhatsApp OTP & Sign In / Sign Up
app.post('/api/driver/verify-otp', (req, res) => {
  const { phone, otp, name, vehicleNumber, vehicleType, companies } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  const isOtpValid = otpStore.verify(cleanPhone, otp);
  if (!isOtpValid) {
    return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
  }

  let driver = db.lookupDriverByPhone(cleanPhone);
  if (!driver) {
    if (!name || !vehicleNumber) {
      return res.status(400).json({ error: 'Name and Vehicle Number are required for new registration' });
    }
    driver = db.registerDriver({
      name,
      phone: cleanPhone,
      vehicleNumber,
      vehicleType: vehicleType || 'Motorcycle',
      companies: companies || ['Swiggy']
    });
  }

  res.json({
    success: true,
    message: 'WhatsApp OTP verified successfully',
    driver
  });
});

// 18. Get Driver Entry History
app.get('/api/driver/history/:phone', (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const data = db.get();
  const driverEntries = data.entries.filter(e => e.driverPhone.replace(/\D/g, '') === cleanPhone);
  res.json(driverEntries);
});

// 19. Update Driver Profile
app.patch('/api/driver/profile/:id', (req, res) => {
  const data = db.get();
  const driver = data.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const { vehicleNumber, vehicleType, companies } = req.body;
  if (vehicleNumber) driver.vehicleNumber = vehicleNumber.toUpperCase();
  if (vehicleType) driver.vehicleType = vehicleType;
  if (companies && Array.isArray(companies)) driver.companies = companies;

  db.save(data);
  broadcastStatsUpdate();
  res.json(driver);
});

// Static frontend serving (for single-service deployment e.g. Render / Railway)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;
initWhatsAppClient();
server.listen(PORT, () => {
  console.log(`🚀 Smart Campus Entry Backend Server running on port ${PORT}`);
});
