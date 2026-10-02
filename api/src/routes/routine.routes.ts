import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { NotFoundError } from '../lib/errors';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff');

async function vendorIdFor(userId: string): Promise<string> {
  const v = await prisma.vendor.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (v) return v.id;
  const s = await prisma.staffMember.findUnique({ where: { userId }, select: { vendorId: true } });
  return s?.vendorId ?? '';
}

// ── Provider: view / upsert / send a client's AM-PM routine ──────────────────
router.get('/client/:clientId', authenticate, staff, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await vendorIdFor(req.user!.sub);
    const routine = await prisma.skincareRoutine.findUnique({ where: { clientId_vendorId: { clientId: req.params.clientId, vendorId } } });
    res.json({ data: routine ?? { clientId: req.params.clientId, vendorId, steps: [], sentToClient: false } });
  } catch (err) { next(err); }
});

router.put('/client/:clientId', authenticate, staff, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await vendorIdFor(req.user!.sub);
    const steps = (req.body?.steps as unknown[]) ?? [];
    const routine = await prisma.skincareRoutine.upsert({
      where: { clientId_vendorId: { clientId: req.params.clientId, vendorId } },
      update: { steps: steps as never, createdById: req.user!.sub },
      create: { clientId: req.params.clientId, vendorId, steps: steps as never, createdById: req.user!.sub },
    });
    res.json({ data: routine });
  } catch (err) { next(err); }
});

router.post('/client/:clientId/send', authenticate, staff, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await vendorIdFor(req.user!.sub);
    const routine = await prisma.skincareRoutine.update({
      where: { clientId_vendorId: { clientId: req.params.clientId, vendorId } },
      data: { sentToClient: true },
    }).catch(() => null);
    if (!routine) throw new NotFoundError('Create the routine before sending it');
    // Notify the client in-app.
    const { createNotification } = await import('../services/notification.service');
    await createNotification(req.params.clientId, 'Your skincare routine is ready', 'Your provider shared a personalized AM/PM routine — view it in your profile.', 'routine', '/routine').catch(() => {});
    res.json({ data: routine });
  } catch (err) { next(err); }
});

// ── Client: my current routine ───────────────────────────────────────────────
router.get('/me', authenticate, authorize('client'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const routines = await prisma.skincareRoutine.findMany({ where: { clientId: req.user!.sub, sentToClient: true }, orderBy: { updatedAt: 'desc' } });
    res.json({ data: routines });
  } catch (err) { next(err); }
});

export default router;
