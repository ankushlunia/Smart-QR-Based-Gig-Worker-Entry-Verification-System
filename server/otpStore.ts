// In-memory OTP storage with TTL
interface OTPRecord {
  phone: string;
  otp: string;
  expiresAt: number;
}

const otpMap = new Map<string, OTPRecord>();

export const otpStore = {
  generate: (phone: string): string => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpMap.set(cleanPhone, {
      phone: cleanPhone,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 min validity
    });
    return otp;
  },

  verify: (phone: string, inputOtp: string): boolean => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const record = otpMap.get(cleanPhone);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      otpMap.delete(cleanPhone);
      return false;
    }
    const isValid = record.otp === inputOtp.trim();
    if (isValid) {
      otpMap.delete(cleanPhone);
    }
    return isValid;
  }
};
