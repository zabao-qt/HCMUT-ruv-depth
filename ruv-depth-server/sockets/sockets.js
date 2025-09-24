import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export function initSockets(io) {
  // authenticate sockets with handshake auth token (optional but recommended)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow unauthenticated sockets if you want
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
      console.log('socket connected and joined room', room);
    } else {
      console.log('socket connected (no user)');
    }

    socket.on('disconnect', () => {
      // optional cleanup
    });
  });
}
