import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Device from '../models/Device.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// create device (returns token)
router.post('/', authMiddleware, async (req, res) => {
  const { name, feeds } = req.body;
  const token = uuidv4();
  const device = await Device.create({ token, name: name || 'Device', userId: req.userId, feeds: feeds || {} });
  res.json({ device });
});

// list devices for user
router.get('/', authMiddleware, async (req, res) => {
  const devices = await Device.find({ userId: req.userId });
  res.json({ devices });
});

// update device feed mapping
router.patch('/:token', authMiddleware, async (req, res) => {
  const token = req.params.token;
  const { feeds } = req.body;
  if (!feeds || typeof feeds !== 'object') return res.status(400).json({ error: 'feeds required' });

  const device = await Device.findOne({ token, userId: req.userId });
  if (!device) return res.status(404).json({ error: 'device not found' });

  device.feeds = feeds;
  await device.save();
  res.json({ device });
});

// get last reading
router.get('/:token/last', authMiddleware, async (req,res) => {
  const token = req.params.token;
  const device = await Device.findOne({ token, userId: req.userId });
  if (!device) return res.status(404).json({ error: 'Not found' });
  res.json({ lastReading: device.lastReading });
});

// test endpoint to push a reading (handy for testing)
router.post('/:token/test-reading', authMiddleware, async (req, res) => {
  const token = req.params.token;
  const { reading } = req.body;
  if (!reading) return res.status(400).json({ error: 'reading required' });
  const device = await Device.findOne({ token, userId: req.userId });
  if (!device) return res.status(404).json({ error: 'device not found' });

  device.lastReading = reading;
  await device.save();

  // emit via socket.io (we need access to io - simple approach: require consumer to call emit)
  // We'll attach the global io to process for simplicity (not ideal, but fine for MVP)
  const io = global._io;
  if (io) io.to(`user_${String(device.userId)}`).emit('measurement', { deviceToken: device.token, reading });

  res.json({ ok: true, reading });
});

export default router;
