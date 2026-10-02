import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../lib/errors';
import { delCache } from '../lib/redis';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { bookingId, rating, body } = req.body as { bookingId: string; rating: number; body?: string };
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true, vendorId: true, staffMemberId: true, status: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.clientId !== req.user!.sub) throw new ForbiddenError('Only the client can review this booking');
    if (booking.status !== 'COMPLETED') throw new ConflictError('Can only review completed bookings');

    const existing = await prisma.review.findUnique({ where: { bookingId } });
    if (existing) throw new ConflictError('Review already submitted for this booking');

    const review = await prisma.review.create({
      data: { bookingId, clientId: req.user!.sub, vendorId: booking.vendorId, staffMemberId: booking.staffMemberId, rating, body },
    });

    // Recalculate vendor avg rating
    const agg = await prisma.review.aggregate({ where: { vendorId: booking.vendorId, isVisible: true }, _avg: { rating: true }, _count: true });
    await prisma.vendor.update({
      where: { id: booking.vendorId },
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
    await delCache(`vendor:${booking.vendorId}:profile`);

    // Recalculate the assigned staff member's avg rating too.
    if (booking.staffMemberId) {
      const staffAgg = await prisma.review.aggregate({
        where: { staffMemberId: booking.staffMemberId, isVisible: true },
        _avg: { rating: true },
      });
      await prisma.staffMember.update({
        where: { id: booking.staffMemberId },
        data: { avgRating: staffAgg._avg.rating ?? 0 },
      });
    }

    res.status(201).json({ data: review });
  } catch (err) { next(err); }
}

export async function listByVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string ?? '1');
    const limit = parseInt(req.query.limit as string ?? '20');
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { vendorId: req.params.vendorId, isVisible: true },
        include: {
          client: { select: { firstName: true, lastName: true, avatarUrl: true } },
          booking: { select: { service: { select: { name: true } }, staffMember: { select: { user: { select: { firstName: true, lastName: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { vendorId: req.params.vendorId, isVisible: true } }),
    ]);
    res.json({ data: reviews, meta: { total, page, limit, hasMore: page * limit < total } });
  } catch (err) { next(err); }
}

export async function flag(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) throw new NotFoundError('Review not found');

    await prisma.reviewFlag.create({
      data: { reviewId: req.params.id, flaggedByUserId: req.user!.sub, reason: (req.body as { reason: string }).reason },
    });
    await prisma.review.update({ where: { id: req.params.id }, data: { isFlagged: true } });

    res.json({ data: { flagged: true } });
  } catch (err) { next(err); }
}
