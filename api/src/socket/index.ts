import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPublisher, redisSubscriber } from '../lib/redis';
import { verifyAccessToken } from '../lib/jwt';
import { logger } from '../lib/logger';

let io: SocketServer;

export function initSocketIO(httpServer: HttpServer) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');

  io = new SocketServer(httpServer, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling — only needed when running multiple API
  // instances. Skipped by default so a single instance uses the in-memory adapter
  // (avoids two persistent Redis connections; important on small/free tiers).
  if (process.env.SOCKET_REDIS_ADAPTER === 'true') {
    io.adapter(createAdapter(redisPublisher, redisSubscriber));
  }

  // JWT auth on every connection
  io.use((socket, next) => {
    const token = (socket.handshake.auth as Record<string, string>).token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.data.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as ReturnType<typeof verifyAccessToken>;
    logger.debug(`[Socket] connected userId=${user.sub} role=${user.role}`);

    // Each user auto-joins their personal notification room
    void socket.join(`user:${user.sub}`);

    // Vendor owners auto-join their vendor room
    if (user.vendorId) void socket.join(`vendor:${user.vendorId}`);

    // Booking updates — join room when client subscribes
    socket.on('booking:subscribe', (bookingId: string) => {
      void socket.join(`booking:${bookingId}`);
    });

    // Chat — join a specific thread room
    socket.on('chat:join', (threadId: string) => {
      void socket.join(`thread:${threadId}`);
    });
    socket.on('chat:leave', (threadId: string) => {
      void socket.leave(`thread:${threadId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`[Socket] disconnected userId=${user.sub}`);
    });
  });

  logger.info('[Socket.IO] server attached');
  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitBookingUpdate(bookingId: string, data: unknown) {
  try {
    getIO().to(`booking:${bookingId}`).emit('booking:updated', data);
  } catch { /* IO not ready */ }
}

export function emitToVendor(vendorId: string, event: string, data: unknown) {
  try {
    getIO().to(`vendor:${vendorId}`).emit(event, data);
  } catch { /* */ }
}

export function emitNotification(userId: string, data: unknown) {
  try {
    getIO().to(`user:${userId}`).emit('notification:new', data);
  } catch { /* */ }
}

export function emitToThread(threadId: string, event: string, data: unknown) {
  try {
    getIO().to(`thread:${threadId}`).emit(event, data);
  } catch { /* */ }
}

// Timer updates fan out to everyone watching this booking (client app + staff portal
// both join `booking:${id}`) AND the vendor dashboard room, in a single emit.
export function emitBookingTimer(bookingId: string, vendorId: string, data: unknown) {
  try {
    const server = getIO();
    server.to(`booking:${bookingId}`).emit('booking:timer', data);
    server.to(`vendor:${vendorId}`).emit('booking:timer', data);
  } catch { /* IO not ready */ }
}
