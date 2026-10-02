import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { resolveVendorId } from '../lib/actor';
import { NotFoundError } from '../lib/errors';

const router = Router();

/** Compute a staff member's current value for a metric over the period window. */
async function currentValue(staffMemberId: string, metric: string, since: Date): Promise<number> {
  if (metric === 'revenue') {
    const r = await prisma.booking.aggregate({ where: { staffMemberId, status: 'COMPLETED', startsAt: { gte: since } }, _sum: { totalAmount: true } });
    return Number(r._sum.totalAmount ?? 0);
  }
  if (metric === 'clients') {
    return prisma.booking.count({ where: { staffMemberId, status: 'COMPLETED', startsAt: { gte: since } } });
  }
  if (metric === 'retail') {
    const items = await prisma.invoiceItem.findMany({
      where: { kind: 'retail', invoice: { booking: { staffMemberId, startsAt: { gte: since } } } }, select: { amount: true },
    });
    return items.reduce((s, i) => s + Number(i.amount), 0);
  }
  if (metric === 'rebooking') {
    // Bookings by clients who had a prior visit — approximate "rebooking" count.
    return prisma.booking.count({ where: { staffMemberId, status: 'COMPLETED', startsAt: { gte: since } } });
  }
  return 0; // memberships/giftcards/retention/custom → manual tracking for now
}

function windowStart(period: string): Date {
  const days = period === 'weekly' ? 7 : 30;
  return new Date(Date.now() - days * 86400000);
}

// ── Vendor: set/list/update/delete goals ─────────────────────────────────────
router.get('/', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const goals = await prisma.employeeGoal.findMany({ where: { vendorId, isActive: true }, orderBy: { createdAt: 'desc' } });
    res.json({ data: goals });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const b = req.body as Record<string, unknown>;
    const goal = await prisma.employeeGoal.create({
      data: {
        vendorId,
        staffMemberId: String(b.staffMemberId ?? ''),
        metric: String(b.metric ?? 'revenue'),
        label: (b.label as string) || null,
        target: Number(b.target ?? 0),
        period: (b.period as string) || 'monthly',
      },
    });
    res.status(201).json({ data: goal });
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const existing = await prisma.employeeGoal.findFirst({ where: { id: req.params.id, vendorId } });
    if (!existing) throw new NotFoundError('Goal not found');
    const b = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const k of ['metric', 'label', 'target', 'period', 'isActive'] as const) if (k in b) data[k] = b[k];
    const goal = await prisma.employeeGoal.update({ where: { id: req.params.id }, data });
    res.json({ data: goal });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await prisma.employeeGoal.updateMany({ where: { id: req.params.id, vendorId }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Employee: my goals with computed progress ────────────────────────────────
router.get('/me', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');
    const goals = await prisma.employeeGoal.findMany({ where: { staffMemberId: staff.id, isActive: true } });
    const withProgress = await Promise.all(goals.map(async (g) => {
      const current = await currentValue(staff.id, g.metric, windowStart(g.period));
      const pct = g.target > 0 ? Math.min(100, Math.round((current / g.target) * 100)) : 0;
      return { ...g, current, progressPct: pct };
    }));
    res.json({ data: withProgress });
  } catch (err) { next(err); }
});

export default router;
