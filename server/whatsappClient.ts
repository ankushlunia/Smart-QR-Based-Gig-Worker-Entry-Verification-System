import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(process.cwd(), 'server', 'auth_info_baileys');

export interface WhatsAppState {
  isConnected: boolean;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
}

let socket: any = null;
const state: WhatsAppState = {
  isConnected: false,
  qrCodeDataUrl: null,
  pairingCode: null,
  phoneNumber: '9928388404'
};

export async function initWhatsAppClient() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      version,
      auth: authState,
      logger: pino({ level: 'silent' }),
      browser: ['GatePass Admin', 'Chrome', '120.0.0']
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.isConnected = false;
        try {
          state.qrCodeDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 3,
            scale: 8,
            color: { dark: '#000000', light: '#ffffff' }
          });
          console.log('\n📲 [WHATSAPP QR CODE GENERATED]');
        } catch (err) {
          console.error('Error generating QR Data URL:', err);
        }
      }

      if (connection === 'open') {
        state.isConnected = true;
        state.qrCodeDataUrl = null;
        state.pairingCode = null;
        console.log('\n✅ [WHATSAPP CONNECTED] Account linked successfully!');
      }

      if (connection === 'close') {
        state.isConnected = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('⚠️ WhatsApp connection closed. Reconnecting:', shouldReconnect);
        if (shouldReconnect) {
          setTimeout(initWhatsAppClient, 4000);
        }
      }
    });

  } catch (err) {
    console.error('Failed to initialize WhatsApp client:', err);
  }
}

export const whatsappClient = {
  getState: () => state,

  generateQR: async (): Promise<{ qrCodeDataUrl: string | null; error?: string }> => {
    try {
      state.qrCodeDataUrl = null;
      if (socket) {
        try {
          await socket.logout();
        } catch (e) {}
        try {
          socket.ev.removeAllListeners();
          socket.end(undefined);
        } catch (e) {}
        socket = null;
      }

      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }

      await initWhatsAppClient();

      // Poll for up to 6 seconds for Baileys to generate authentic QR code
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 200));
        if (state.qrCodeDataUrl) {
          return { qrCodeDataUrl: state.qrCodeDataUrl };
        }
      }

      if (state.qrCodeDataUrl) {
        return { qrCodeDataUrl: state.qrCodeDataUrl };
      }

      return { qrCodeDataUrl: null, error: 'WhatsApp QR code is taking longer to generate. Please try again or use Method 1 (Pairing Code).' };
    } catch (err: any) {
      return { qrCodeDataUrl: null, error: err.message || 'Failed to generate QR code' };
    }
  },

  getPairingCode: async (phone: string = '9928388404'): Promise<{ code?: string; error?: string }> => {
    const clean = phone.replace(/\D/g, '');
    const full = clean.startsWith('91') && clean.length > 10 ? clean : (clean.length === 10 ? `91${clean}` : clean);
    
    try {
      // Ensure clean socket state before requesting code
      if (!socket || socket?.ws?.readyState !== 1) {
        if (socket) {
          try { socket.ev.removeAllListeners(); socket.end(undefined); } catch (e) {}
        }
        await initWhatsAppClient();
        await new Promise(r => setTimeout(r, 1000));
      }

      if (socket && socket.requestPairingCode) {
        const code = await socket.requestPairingCode(full);
        state.pairingCode = code;
        console.log(`\n🔑 [WHATSAPP PAIRING CODE for +${full}]: ${code}\n`);
        return { code };
      } else {
        return { error: 'WhatsApp client is initializing. Please try clicking again in 2 seconds.' };
      }
    } catch (e: any) {
      console.error('Error requesting pairing code:', e);
      // Fallback reset & retry
      try {
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        await initWhatsAppClient();
        await new Promise(r => setTimeout(r, 1500));
        if (socket && socket.requestPairingCode) {
          const code = await socket.requestPairingCode(full);
          state.pairingCode = code;
          return { code };
        }
      } catch (retryErr: any) {
        return { error: retryErr.message || 'Failed to generate pairing code' };
      }
      return { error: e.message || 'Failed to generate pairing code' };
    }
  },

  disconnect: async (): Promise<{ success: boolean }> => {
    try {
      if (socket) {
        await socket.logout();
      }
    } catch (e) {}

    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
    } catch (e) {}

    state.isConnected = false;
    state.qrCodeDataUrl = null;
    state.pairingCode = null;

    setTimeout(initWhatsAppClient, 2000);
    return { success: true };
  },

  sendMessage: async (targetPhone: string, text: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const fullNumber = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    const jid = `${fullNumber}@s.whatsapp.net`;

    if (socket && state.isConnected) {
      try {
        await socket.sendMessage(jid, { text });
        console.log(`✅ [REAL WHATSAPP DELIVERED] Sent message to +${fullNumber}`);
        return { success: true };
      } catch (err: any) {
        console.error(`❌ Failed to send WhatsApp message to +${fullNumber}:`, err.message);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`⚠️ WhatsApp client not linked. Please connect device from Admin Settings.`);
      return { success: false, error: 'WhatsApp device not linked.' };
    }
  }
};
