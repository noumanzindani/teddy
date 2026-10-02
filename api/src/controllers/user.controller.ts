import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, avatarUrl: true, pointsBalance: true, tier: true, role: true, isVerified: true, createdAt: true },
    });
    if (!user) throw new NotFoundError('User not found');
    res.json({ data: user });
  } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: req.body as { firstName?: string; lastName?: string; avatarUrl?: string; phone?: string },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, avatarUrl: true, pointsBalance: true, tier: true, role: true },
    });
    res.json({ data: user });
  } catch (err) { next(err); }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { deletedAt: new Date(), isActive: false },
    });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string ?? '1');
    const limit = parseInt(req.query.limit as string ?? '20');
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId: req.user!.sub },
        include: { service: true, vendor: { select: { businessName: true, coverUrl: true } }, staffMember: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where: { clientId: req.user!.sub } }),
    ]);
    res.json({ data: bookings, meta: { total, page, limit, hasMore: page * limit < total } });
  } catch (err) { next(err); }
}

export async function getWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.wishlist.findMany({
      where: { clientId: req.user!.sub },
      include: { client: false },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
}

export async function toggleWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const { vendorId } = req.params;
    const clientId = req.user!.sub;
    const existing = await prisma.wishlist.findUnique({ where: { clientId_vendorId: { clientId, vendorId } } });
    if (existing) {
      await prisma.wishlist.delete({ where: { clientId_vendorId: { clientId, vendorId } } });
      res.json({ data: { wishlisted: false } });
    } else {
      await prisma.wishlist.create({ data: { clientId, vendorId } });
      res.json({ data: { wishlisted: true } });
    }
  } catch (err) { next(err); }
}

export async function getRewards(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { pointsBalance: true, tier: true },
    });
    const history = await prisma.pointsTransaction.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ data: { ...user, history } });
  } catch (err) { next(err); }
}

export async function registerPushToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body as { token: string };
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { pushTokens: true } });
    const tokens = (user?.pushTokens as string[]) ?? [];
    if (!tokens.includes(token)) {
      await prisma.user.update({
        where: { id: req.user!.sub },
        data: { pushTokens: [...tokens, token] },
      });
    }
    res.json({ data: { registered: true } });
  } catch (err) { next(err); }
}
