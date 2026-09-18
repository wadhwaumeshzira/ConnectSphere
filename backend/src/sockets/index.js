import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import roomHandler from './roomHandler.js';

export const initSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.VITE_SOCKET_URL || 'http://localhost:5173',
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    const { token, guestName } = socket.handshake.auth;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        return next();
      } catch (err) {
        return next(new Error(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })));
      }
    }

    if (guestName) {
      socket.isGuest = true;
      return next();
    }

    return next(new Error(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })));
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    roomHandler(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
