import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET','POST'],
    credentials: true
  }
});

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

// Connect Mongo
mongoose.connect(process.env.MONGODB_URI)
  .then(()=> console.log('Mongo connected'))
  .catch(err => {
    console.error('Mongo conn err', err);
    process.exit(1);
  });

// --- Schemas ---
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Profile = mongoose.model('Profile', ProfileSchema);

const PointSchema = new Schema({
  profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Number, required: true },
  latitude: Number,
  longitude: Number,
  sonarDepth: Number,
  pressure: Number
});
const Point = mongoose.model('Point', PointSchema);

// Devices: mapping token -> user to accept webhooks
const DeviceSchema = new Schema({
  token: { type: String, required: true, unique: true },
  name: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feeds: {
    type: Map,
    of: String,
    default: {}
  },
  lastReading: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});
const Device = mongoose.model('Device', DeviceSchema);

// --- Utils & middleware ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function generateToken(user) {
  return jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Socket.IO auth using handshake auth token ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // allow unauth? we will just limit functionality; recommend require token
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.userId;
    return next();
  } catch (err) {
    return next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  if (socket.userId) {
    const room = `user_${socket.userId}`;
    socket.join(room);
    console.log('socket connection; user room joined:', room);
  } else {
    console.log('socket connection (unauthenticated)');
  }
  socket.on('disconnect', () => {});
});

// --- Auth routes ---
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash: hash });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Email already used or invalid' });
  }
});

app.post('/api/auth/login', async (req,res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = generateToken(user);
  res.json({ token, user: { id: user._id, email: user.email } });
});

// optional: get /me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select('_id email createdAt');
  res.json({ user });
});

// --- Devices (register device for Adafruit token) ---
app.post('/api/devices', authMiddleware, async (req,res) => {
  const { name, feeds } = req.body; // feeds: { pressure, sonardepth, latitude, longitude }
  const token = uuidv4();
  const device = await Device.create({ token, name: name || 'Device', userId: req.userId, feeds: feeds || {} });
  res.json({ device });
});

// list devices
app.get('/api/devices', authMiddleware, async (req,res) => {
  const devices = await Device.find({ userId: req.userId });
  res.json({ devices });
});

// update device feeds mapping
app.patch('/api/devices/:token', authMiddleware, async (req, res) => {
  const token = req.params.token;
  const { feeds } = req.body; // expect object like { pressure: "pressure", sonardepth: "sonardepth", latitude: "latitude", longitude: "longitude" }
  if (!feeds || typeof feeds !== 'object') return res.status(400).json({ error: 'feeds required' });

  const device = await Device.findOne({ token, userId: req.userId });
  if (!device) return res.status(404).json({ error: 'device not found' });

  device.feeds = feeds;
  await device.save();
  res.json({ device });
});

// --- Profiles CRUD ---
app.get('/api/profiles', authMiddleware, async (req,res) => {
  const profiles = await Profile.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ profiles });
});

app.post('/api/profiles', authMiddleware, async (req,res) => {
  const { title, description } = req.body;
  const p = await Profile.create({ userId: req.userId, title, description });
  res.json({ profile: p });
});

app.delete('/api/profiles/:id', authMiddleware, async (req,res) => {
  const id = req.params.id;
  const p = await Profile.findOneAndDelete({ _id: id, userId: req.userId });
  if (!p) return res.status(404).json({ error: 'Not found' });
  // delete points
  await Point.deleteMany({ profileId: p._id });
  res.json({ ok: true });
});

// append a point to profile (frontend will send the reading in body)
app.post('/api/profiles/:id/points', authMiddleware, async (req,res) => {
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

// list recent points for a profile
app.get('/api/profiles/:id/points', authMiddleware, async (req,res) => {
  const profileId = req.params.id;
  const limit = Math.min(1000, Number(req.query.limit || 200));
  const points = await Point.find({ profileId, userId: req.userId }).sort({ timestamp: -1 }).limit(limit);
  res.json({ points });
});

app.post('/api/devices/:token/test-reading', authMiddleware, async (req, res) => {
  const token = req.params.token;
  const { reading } = req.body; // pass full reading object
  if (!reading) return res.status(400).json({ error: 'reading required' });
  const device = await Device.findOne({ token, userId: req.userId });
  if (!device) return res.status(404).json({ error: 'device not found' });

  device.lastReading = reading;
  await device.save();
  const room = `user_${String(device.userId)}`;
  io.to(room).emit('measurement', { deviceToken: device.token, reading });
  res.json({ ok: true, reading });
});

// --- Utility: get current device reading(s) for user ---
app.get('/api/devices/:token/last', authMiddleware, async (req,res) => {
  const token = req.params.token;
  const device = await Device.findOne({ token, userId: req.userId });
  if (!device) return res.status(404).json({ error: 'Not found' });
  res.json({ lastReading: device.lastReading });
});

// start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
