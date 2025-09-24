import express from 'express';
import Profile from '../models/Profile.js';
import Point from '../models/Point.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const profiles = await Profile.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ profiles });
});

router.post('/', authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  const p = await Profile.create({ userId: req.userId, title, description });
  res.json({ profile: p });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const p = await Profile.findOneAndDelete({ _id: id, userId: req.userId });
  if (!p) return res.status(404).json({ error: 'Not found' });
  await Point.deleteMany({ profileId: p._id });
  res.json({ ok: true });
});

router.post('/:id/points', authMiddleware, async (req, res) => {
  const profileId = req.params.id;
  const profile = await Profile.findOne({ _id: profileId, userId: req.userId });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { timestamp, latitude, longitude, sonarDepth, pressure } = req.body;
  if (!timestamp) return res.status(400).json({ error: 'timestamp required' });

  const point = await Point.create({
    profileId: profile._id,
    userId: req.userId,
    timestamp,
    latitude,
    longitude,
    sonarDepth,
    pressure
  });
  profile.updatedAt = Date.now();
  await profile.save();

  res.json({ point });
});

router.get('/:id/points', authMiddleware, async (req,res) => {
  const profileId = req.params.id;
  const limit = Math.min(1000, Number(req.query.limit || 200));
  const points = await Point.find({ profileId, userId: req.userId }).sort({ timestamp: -1 }).limit(limit);
  res.json({ points });
});

export default router;
