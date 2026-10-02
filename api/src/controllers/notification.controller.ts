import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string ?? '1');
    const limit = parseInt(req.query.limit as string ?? '20');
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.sub },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.sub } }),
    ]);
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } });
    res.json({ data: notifications, meta: { total, page, limit, hasMore: page * limit < total, unreadCount } });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { isRead: true },
    });
    res.json({ data: { read: true } });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, isRead: false },
      data: { isRead: true },
    });
    res.json({ data: { read: true } });
  } catch (err) { next(err); }
}

export async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: req.user!.sub } });
    res.json({ data: pref });
  } catch (err) { next(err); }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const pref = await prisma.notificationPreference.update({
      where: { userId: req.user!.sub },
      data: req.body as Parameters<typeof prisma.notificationPreference.update>[0]['data'],
    });
    res.json({ data: pref });
  } catch (err) { next(err); }
}
