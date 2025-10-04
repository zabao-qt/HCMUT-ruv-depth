import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, default: 'email_verification' }, // other uses possible
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: { expires: Number(process.env.OTP_TTL_SECONDS || 600) } },
  lastSentAt: { type: Date, default: Date.now }
});

// TTL index is defined by 'expires' option above using OTP_TTL_SECONDS from env
export default mongoose.models.Otp || mongoose.model('Otp', OtpSchema);
