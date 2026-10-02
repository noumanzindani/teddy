import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { resolveVendorId } from '../lib/actor';
import { NotFoundError } from '../lib/errors';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff');

// ── Vendor: manage preference questions ──────────────────────────────────────
router.get('/questions', authenticate, staff, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const questions = await prisma.preferenceQuestion.findMany({ where: { vendorId, isActive: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ data: questions });
  } catch (err) { next(err); }
});

router.post('/questions', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const b = req.body as Record<string, unknown>;
    const q = await prisma.preferenceQuestion.create({
      data: {
        vendorId,
        label: String(b.label ?? '').trim() || 'Untitled',
        description: (b.description as string) || null,
        type: (b.type as string) || 'text',
        options: ((b.options as unknown[]) ?? []) as never,
        required: !!b.required,
        appliesToServiceIds: ((b.appliesToServiceIds as unknown[]) ?? []) as never,
        sortOrder: Number(b.sortOrder ?? 0),
      },
    });
    res.status(201).json({ data: q });
  } catch (err) { next(err); }
});

router.patch('/questions/:id', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const existing = await prisma.preferenceQuestion.findFirst({ where: { id: req.params.id, vendorId } });
    if (!existing) throw new NotFoundError('Question not found');
    const b = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const k of ['label', 'description', 'type', 'options', 'required', 'appliesToServiceIds', 'sortOrder', 'isActive'] as const) {
      if (k in b) data[k] = b[k];
    }
    const q = await prisma.preferenceQuestion.update({ where: { id: req.params.id }, data });
    res.json({ data: q });
  } catch (err) { next(err); }
});

router.delete('/questions/:id', authenticate, authorize('vendor_owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await prisma.preferenceQuestion.updateMany({ where: { id: req.params.id, vendorId }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Provider: view a client's preference answers ─────────────────────────────
router.get('/client/:clientId', authenticate, staff, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = await resolveVendorId(req.user!.sub).catch(async () => {
      const s = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { vendorId: true } });
      return s?.vendorId ?? '';
    });
    const [questions, answers] = await Promise.all([
      prisma.preferenceQuestion.findMany({ where: { vendorId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.preferenceAnswer.findMany({ where: { vendorId, clientId: req.params.clientId } }),
    ]);
    const byQ = new Map(answers.map((a) => [a.questionId, a.value]));
    res.json({ data: questions.map((q) => ({ ...q, answer: byQ.get(q.id) ?? null })) });
  } catch (err) { next(err); }
});

// ── Client: see my questions + answers, and save answers ─────────────────────
router.get('/my', authenticate, authorize('client'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : undefined;
    const questions = await prisma.preferenceQuestion.findMany({
      where: { isActive: true, ...(vendorId ? { vendorId } : {}) }, orderBy: { sortOrder: 'asc' },
    });
    const answers = await prisma.preferenceAnswer.findMany({ where: { clientId: req.user!.sub } });
    const byQ = new Map(answers.map((a) => [a.questionId, a.value]));
    res.json({ data: questions.map((q) => ({ ...q, answer: byQ.get(q.id) ?? null })) });
  } catch (err) { next(err); }
});

router.post('/answers', authenticate, authorize('client'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.sub;
    const { questionId, value } = req.body as { questionId: string; value: unknown };
    const q = await prisma.preferenceQuestion.findUnique({ where: { id: questionId }, select: { vendorId: true } });
    if (!q) throw new NotFoundError('Question not found');
    const answer = await prisma.preferenceAnswer.upsert({
      where: { questionId_clientId: { questionId, clientId } },
      update: { value: value as never },
      create: { questionId, clientId, vendorId: q.vendorId, value: value as never },
    });
    res.json({ data: answer });
  } catch (err) { next(err); }
});

export default router;
