import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import { initSockets } from './sockets/index.js';

// Load env vars
dotenv.config({ path: '../.env' }); // Path is relative to the execution root (which is backend/) usually

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSockets(httpServer);

// Connect to Database
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || process.env.VITE_SOCKET_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
