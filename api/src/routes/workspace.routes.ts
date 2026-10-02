import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { resolveVendorId } from '../lib/actor';
import { NotFoundError } from '../lib/errors';

const router = Router();

async function staffFor(userId: string) {
  return prisma.staffMember.findUnique({ where: { userId }, select: { id: true, vendorId: true } });
}

// ── Vendor: assign tasks / checklists to employees ───────────────────────────
router.get('/tasks', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const tasks = await prisma.staffTask.findMany({ where: { vendorId, isPersonal: false }, orderBy: { createdAt: 'desc' } });
    res.json({ data: tasks });
  } catch (err) { next(err); }
});

router.post('/tasks', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const b = req.body as Record<string, unknown>;
    const task = await prisma.staffTask.create({
      data: {
        vendorId,
        staffMemberId: (b.staffMemberId as string) || null,
        assignedById: req.user!.sub,
        title: String(b.title ?? '').trim() || 'Task',
        notes: (b.notes as string) || null,
        dueAt: b.dueAt ? new Date(b.dueAt as string) : null,
        recurring: (b.recurring as string) || null,
        isPersonal: false,
      },
    });
    res.status(201).json({ data: task });
  } catch (err) { next(err); }
});

router.patch('/tasks/:id', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const existing = await prisma.staffTask.findFirst({ where: { id: req.params.id, vendorId } });
    if (!existing) throw new NotFoundError('Task not found');
    const b = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'notes', 'staffMemberId', 'dueAt', 'recurring'] as const) if (k in b) data[k] = k === 'dueAt' && b[k] ? new Date(b[k] as string) : b[k];
    const task = await prisma.staffTask.update({ where: { id: req.params.id }, data });
    res.json({ data: task });
  } catch (err) { next(err); }
});

router.delete('/tasks/:id', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await prisma.staffTask.deleteMany({ where: { id: req.params.id, vendorId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Employee: my tasks (assigned + personal), toggle complete, create personal ─
router.get('/me/tasks', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    const tasks = await prisma.staffTask.findMany({
      where: { vendorId: s.vendorId, OR: [{ staffMemberId: s.id }, { staffMemberId: null, isPersonal: false }] },
      orderBy: [{ completed: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ data: tasks });
  } catch (err) { next(err); }
});

router.post('/me/tasks', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    const b = req.body as Record<string, unknown>;
    const task = await prisma.staffTask.create({
      data: {
        vendorId: s.vendorId, staffMemberId: s.id, assignedById: null, isPersonal: true,
        title: String(b.title ?? '').trim() || 'Reminder',
        notes: (b.notes as string) || null,
        dueAt: b.dueAt ? new Date(b.dueAt as string) : null,
        recurring: (b.recurring as string) || null,
      },
    });
    res.status(201).json({ data: task });
  } catch (err) { next(err); }
});

router.patch('/me/tasks/:id', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    const existing = await prisma.staffTask.findFirst({ where: { id: req.params.id, OR: [{ staffMemberId: s.id }, { staffMemberId: null }] } });
    if (!existing) throw new NotFoundError('Task not found');
    const completed = !!(req.body as { completed?: boolean }).completed;
    const task = await prisma.staffTask.update({ where: { id: req.params.id }, data: { completed, completedAt: completed ? new Date() : null } });
    res.json({ data: task });
  } catch (err) { next(err); }
});

router.delete('/me/tasks/:id', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    await prisma.staffTask.deleteMany({ where: { id: req.params.id, staffMemberId: s.id, isPersonal: true } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Employee: personal notes ─────────────────────────────────────────────────
router.get('/me/notes', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    res.json({ data: await prisma.staffNote.findMany({ where: { staffMemberId: s.id }, orderBy: { updatedAt: 'desc' } }) });
  } catch (err) { next(err); }
});

router.post('/me/notes', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    const note = await prisma.staffNote.create({ data: { staffMemberId: s.id, content: String((req.body as { content?: string }).content ?? '') } });
    res.status(201).json({ data: note });
  } catch (err) { next(err); }
});

router.delete('/me/notes/:id', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    await prisma.staffNote.deleteMany({ where: { id: req.params.id, staffMemberId: s.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Employee: private daily check-in (mood / how the day is going) ────────────
router.get('/me/checkins', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    res.json({ data: await prisma.staffCheckIn.findMany({ where: { staffMemberId: s.id }, orderBy: { createdAt: 'desc' }, take: 30 }) });
  } catch (err) { next(err); }
});

router.post('/me/checkins', authenticate, authorize('vendor_staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await staffFor(req.user!.sub);
    if (!s) throw new NotFoundError('Staff profile not found');
    const b = req.body as { mood?: string; note?: string };
    const c = await prisma.staffCheckIn.create({ data: { staffMemberId: s.id, mood: b.mood || null, note: b.note || null } });
    res.status(201).json({ data: c });
  } catch (err) { next(err); }
});

export default router;
