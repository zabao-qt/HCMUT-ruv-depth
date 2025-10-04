import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Otp from '../models/Otp.js';
import User from '../models/User.js'; // adjust path if your User model is elsewhere
import { sendOtpEmail } from '../services/brevoService.js';

const router = express.Router();

const OTP_TTL = Number(process.env.OTP_TTL_SECONDS || 600);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_RATE_LIMIT = Number(process.env.OTP_RATE_LIMIT_SECONDS || 60);

// helper to generate 6-digit code
function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/send-otp  { email, purpose? }
router.post('/send-otp', async (req, res) => {
  const { email, purpose = 'email_verification', name } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  // Rate limit: check last send
  const recent = await Otp.findOne({ email, purpose }).sort({ lastSentAt: -1 }).limit(1);
  if (recent && recent.lastSentAt && (Date.now() - new Date(recent.lastSentAt).getTime())/1000 < OTP_RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests, try again later' });
  }

  const code = genCode();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(code, salt);

  // store otp doc (old ones auto-expire due to TTL index)
  const otp = await Otp.create({ email, codeHash: hash, purpose, lastSentAt: new Date() });

  // Compose email (plain text + basic HTML)
  const subject = 'Your verification code';
  const html = `<p>Your verification code is <strong>${code}</strong>. It expires in ${Math.floor(OTP_TTL/60)} minutes.</p>`;
  const text = `Your verification code is ${code}. It expires in ${Math.floor(OTP_TTL/60)} minutes.`;
  const nameToSend = (name && String(name).trim()) ? String(name).trim() : String(email).split('@')[0];

  try {
    await sendOtpEmail({ toEmail: email, toName: nameToSend, subject, htmlContent: html, textContent: text });
  } catch (err) {
    console.error('Brevo send err', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }

  return res.json({ ok: true, message: 'OTP sent' });
});

// POST /api/auth/verify-otp { email, code, purpose? }
router.post('/verify-otp', async (req, res) => {
  const { email, code, purpose = 'email_verification' } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  // Find the most recent OTP for this email/purpose
  const otp = await Otp.findOne({ email, purpose }).sort({ lastSentAt: -1 });
  if (!otp) return res.status(400).json({ error: 'No OTP found or it expired' });

  // Check attempts
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts' });
  }

  // Compare
  const ok = await bcrypt.compare(String(code), otp.codeHash);
  if (!ok) {
    otp.attempts = (otp.attempts || 0) + 1;
    await otp.save();
    return res.status(400).json({ error: 'Invalid code' });
  }

  // Verified: delete all OTPs for this email/purpose
  await Otp.deleteMany({ email, purpose });

  // Find user and mark verified (if exists)
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.emailVerified = true;
    await user.save();

    // Issue a JWT token for the user so the client can authenticate immediately
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn('JWT_SECRET not set; cannot issue token on verify-otp');
      return res.json({ ok: true, emailVerified: true, user: { email: user.email, id: user._id } });
    }

    const token = jwt.sign({ id: String(user._id) }, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    return res.json({ ok: true, emailVerified: true, token, user: { id: user._id, email: user.email } });
  }

  // If no user record exists, still return success but no token (signup flow might create user differently)
  return res.json({ ok: true, emailVerified: false });
});

// POST /api/auth/resend-otp { email, purpose? } -> simply call send-otp but can reuse logic
router.post('/resend-otp', async (req, res) => {
  // just call send-otp logic; for brevity redirect to /send-otp handler by calling it
  // to keep simple, require body and call same code path:
  return router.handle(req, res, () => {});
});

export default router;
