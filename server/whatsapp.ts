import { whatsappClient } from './whatsappClient.js';

export const whatsappService = {
  sendOTP: async (targetPhone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const fullNumber = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    const message = `🔐 *Smart Campus GatePass*\n\nYour verification code is: *${otp}*\n\nThis code expires in 5 minutes. Do not share this code with anyone.\n\n_Sent by GatePass Security System (+91 9928388404)_`;

    console.log(`\n========================================`);
    console.log(`📱 [DISPATCHING TO +${fullNumber} from +91 9928388404]`);
    console.log(`💬 Code: ${otp}`);
    console.log(`========================================\n`);

    return await whatsappClient.sendMessage(fullNumber, message);
  }
};
