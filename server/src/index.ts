import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import authRoutes from './routes/auth.routes';
import auctionRoutes from './routes/auction.routes';
import bidRoutes from './routes/bid.routes';

// Start Worker (Import alone is enough to initialize it if the file executes)
import './jobs/auctionWorker';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
export const io = new Server(server, {
  cors: {
    origin: '*', // For MVP, allow all
    methods: ['GET', 'POST']
  }
});

// Setup Prisma
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auction_db';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// Setup Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisPublisher = new Redis(REDIS_URL);
export const redisSubscriber = new Redis(REDIS_URL);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/auctions', bidRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Setup Redis Pub/Sub for WebSockets
redisSubscriber.subscribe('auction_updates', (err, count) => {
  if (err) {
    console.error('Failed to subscribe: %s', err.message);
  } else {
    console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
  }
});

redisSubscriber.on('message', (channel, message) => {
  if (channel === 'auction_updates') {
    const data = JSON.parse(message);
    io.to(`auction_${data.auction_id}`).emit('new_bid', data);
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_auction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
    console.log(`Socket ${socket.id} joined auction_${auctionId}`);
  });

  socket.on('leave_auction', (auctionId) => {
    socket.leave(`auction_${auctionId}`);
    console.log(`Socket ${socket.id} left auction_${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
