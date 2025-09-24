import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import profileRoutes from './routes/profiles.js';
import { initSockets } from './sockets/sockets.js';
import { startMqtt } from './services/mqttService.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// middlewares
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

// connect to mongo
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => {
    console.error('Mongo conn err', err);
    process.exit(1);
  });

// mount routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/profiles', profileRoutes);

app.get('/', (req, res) => res.send('IoT Depth backend running'));

// initialize sockets and MQTT after server is created
initSockets(io);
startMqtt(io, {
  user: process.env.ADAFRUIT_IO_USERNAME,
  key: process.env.ADAFRUIT_IO_KEY
}).catch(err => console.error('mqtt start err', err));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
