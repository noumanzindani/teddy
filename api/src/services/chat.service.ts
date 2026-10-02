import { prisma } from '../lib/prisma';
import { ConflictError, NotFoundError, ForbiddenError } from '../lib/errors';
import { emitToThread } from '../socket';
import { createNotification } from './notification.service';
import { SenderRole } from '@prisma/client';

export async function createThread(vendorId: string, clientId: string) {
  const existing = await prisma.chatThread.findUnique({ where: { vendorId_clientId: { vendorId, clientId } } });
  if (existing) return existing;

  return prisma.chatThread.create({ data: { vendorId, clientId } });
}

export async function listThreads(userId: string, role: string) {
  const where = role === 'vendor_owner' || role === 'admin'
    ? { vendor: { ownerId: userId } }
    : { clientId: userId };

  const threads = await prisma.chatThread.findMany({
    where,
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      vendor: { select: { businessName: true, coverUrl: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  return threads.map((t) => ({
    ...t,
    unreadCount: 0, // Computed from messages.isRead if needed
  }));
}

export async function getThread(threadId: string, userId: string) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: 'asc' }, take: 100 },
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      vendor: { select: { businessName: true, coverUrl: true, ownerId: true } },
    },
  });
  if (!thread) throw new NotFoundError('Thread not found');
  if (thread.clientId !== userId && thread.vendor.ownerId !== userId) throw new ForbiddenError();
  return thread;
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  senderRole: SenderRole,
  body?: string,
  mediaUrl?: string
) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { vendor: { select: { ownerId: true } } },
  });
  if (!thread) throw new NotFoundError('Thread not found');
  if (thread.clientId !== senderId && thread.vendor.ownerId !== senderId) throw new ForbiddenError();

  const message = await prisma.message.create({
    data: { threadId, senderId, senderRole, body, mediaUrl },
  });

  await prisma.chatThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });

  // Real-time delivery
  emitToThread(threadId, 'message:new', message);

  // Notify the other party
  const recipientId = senderId === thread.clientId ? thread.vendor.ownerId : thread.clientId;
  await createNotification(recipientId, 'New Message', body?.slice(0, 80) ?? 'Media message', 'chat', `/chat/${threadId}`);

  return message;
}

export async function markThreadRead(threadId: string, userId: string) {
  await prisma.message.updateMany({
    where: { threadId, senderId: { not: userId }, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  emitToThread(threadId, 'message:read', { threadId, readBy: userId });
}
