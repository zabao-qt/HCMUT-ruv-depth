import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, email: user.email, emailVerified: user.emailVerified, } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Email already used or invalid' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = generateToken(user);
  res.json({ token, user: { id: user._id, email: user.email } });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select('_id email createdAt');
  res.json({ user });
});

export default router;
