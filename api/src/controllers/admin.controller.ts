import { Request, Response, NextFunction } from 'express';
import { VendorStatus, Role, PayoutStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { createNotification } from '../services/notification.service';
import { delCache } from '../lib/redis';

// ── Vendors ────────────────────────────────────────────────────────────────────

export async function listPendingVendors(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string) ?? 'PENDING';
    const vendors = await prisma.vendorApplication.findMany({
      where: { status: status as VendorStatus },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { appliedAt: 'desc' },
    });
    res.json({ data: vendors });
  } catch (err) { next(err); }
}

export async function approveVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const app = await prisma.vendorApplication.findUnique({ where: { id: req.params.id } });
    if (!app) throw new NotFoundError('Application not found');

    const slug = app.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const vendor = await prisma.vendor.upsert({
      where: { ownerId: app.userId },
      update: { status: 'ACTIVE', approvedAt: new Date() },
      create: { ownerId: app.userId, businessName: app.businessName, slug, city: app.city ?? '', status: 'ACTIVE', approvedAt: new Date() },
    });

    await prisma.vendorApplication.update({ where: { id: req.params.id }, data: { status: 'ACTIVE', reviewedAt: new Date(), reviewedByAdminId: req.user!.sub } });
    await prisma.user.update({ where: { id: app.userId }, data: { role: 'vendor_owner' } });
    await createNotification(app.userId, 'Application Approved!', 'Your salon has been approved. Welcome to TEDDY!', 'vendor');

    res.json({ data: vendor });
  } catch (err) { next(err); }
}

export async function rejectVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string };
    const app = await prisma.vendorApplication.findUnique({ where: { id: req.params.id } });
    if (!app) throw new NotFoundError('Application not found');

    await prisma.vendorApplication.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectionReason: reason, reviewedAt: new Date(), reviewedByAdminId: req.user!.sub },
    });
    await createNotification(app.userId, 'Application Update', reason ?? 'Your application was not approved at this time.', 'vendor');

    res.json({ data: { rejected: true } });
  } catch (err) { next(err); }
}

export async function suspendVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new NotFoundError('Vendor not found');
    await prisma.vendor.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
    await delCache(`vendor:${req.params.id}:profile`);
    await createNotification(vendor.ownerId, 'Account Suspended', 'Your account has been suspended. Contact support for details.', 'admin');
    res.json({ data: { suspended: true } });
  } catch (err) { next(err); }
}

// ── Users ──────────────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string ?? '1');
    const limit = parseInt(req.query.limit as string ?? '20');
    const role = req.query.role as string | undefined;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null, ...(role && { role: role as Role }) },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, tier: true, pointsBalance: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: { deletedAt: null, ...(role && { role: role as Role }) } }),
    ]);
    res.json({ data: users, meta: { total, page, limit, hasMore: page * limit < total } });
  } catch (err) { next(err); }
}

export async function banUser(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await createNotification(req.params.id, 'Account Banned', 'Your account has been suspended for violating our terms.', 'admin');
    res.json({ data: { banned: true } });
  } catch (err) { next(err); }
}

export async function unbanUser(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } });
    res.json({ data: { unbanned: true } });
  } catch (err) { next(err); }
}

// ── Disputes (ReviewFlags) ─────────────────────────────────────────────────────

export async function listDisputes(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await prisma.reviewFlag.findMany({
      where: { resolvedAt: null },
      include: { review: { include: { client: { select: { firstName: true, lastName: true } }, vendor: { select: { businessName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: flags });
  } catch (err) { next(err); }
}

export async function resolveDispute(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.reviewFlag.update({
      where: { id: req.params.id },
      data: { resolvedAt: new Date(), resolvedByAdminId: req.user!.sub },
    });
    res.json({ data: { resolved: true } });
  } catch (err) { next(err); }
}

// ── Payouts ────────────────────────────────────────────────────────────────────

export async function listPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string | undefined;
    const payouts = await prisma.payout.findMany({
      where: { ...(status && { status: status as PayoutStatus }) },
      include: { vendor: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: payouts });
  } catch (err) { next(err); }
}

export async function flagPayout(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.payout.update({ where: { id: req.params.id }, data: { status: 'FLAGGED', flagNote: (req.body as { note?: string }).note } });
    res.json({ data: { flagged: true } });
  } catch (err) { next(err); }
}

export async function releasePayout(req: Request, res: Response, next: NextFunction) {
  try {
    const { releasePayout: release } = await import('../services/payment.service');
    await release(req.params.id);
    res.json({ data: { released: true } });
  } catch (err) { next(err); }
}

// ── Reviews ────────────────────────────────────────────────────────────────────

export async function listFlaggedReviews(_req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await prisma.review.findMany({
      where: { isFlagged: true },
      include: {
        client: { select: { firstName: true, lastName: true } },
        vendor: { select: { businessName: true } },
        reviewFlags: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: reviews });
  } catch (err) { next(err); }
}

export async function hideReview(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await prisma.review.update({ where: { id: req.params.id }, data: { isVisible: false }, select: { vendorId: true } });
    const agg = await prisma.review.aggregate({ where: { vendorId: review.vendorId, isVisible: true }, _avg: { rating: true }, _count: true });
    await prisma.vendor.update({ where: { id: review.vendorId }, data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count } });
    await delCache(`vendor:${review.vendorId}:profile`);
    res.json({ data: { hidden: true } });
  } catch (err) { next(err); }
}

export async function showReview(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await prisma.review.update({ where: { id: req.params.id }, data: { isVisible: true }, select: { vendorId: true } });
    const agg = await prisma.review.aggregate({ where: { vendorId: review.vendorId, isVisible: true }, _avg: { rating: true }, _count: true });
    await prisma.vendor.update({ where: { id: review.vendorId }, data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count } });
    await delCache(`vendor:${review.vendorId}:profile`);
    res.json({ data: { visible: true } });
  } catch (err) { next(err); }
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export async function getPlatformAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalVendors, totalBookings, totalRevenue] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.aggregate({ where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } }, _sum: { totalAmount: true } }),
    ]);

    const topVendors = await prisma.vendor.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, businessName: true, city: true, avgRating: true, bookingCount: true },
      orderBy: { bookingCount: 'desc' },
      take: 5,
    });

    res.json({ data: { totalUsers, totalVendors, totalBookings, totalRevenue: totalRevenue._sum.totalAmount ?? 0, topVendors } });
  } catch (err) { next(err); }
}

export async function updateSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    // Placeholder — extend with a Settings model when needed
    res.json({ data: { updated: true } });
  } catch (err) { next(err); }
}
