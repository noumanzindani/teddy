import { Request, Response, NextFunction } from 'express';
import * as vendorService from '../services/vendor.service';
import * as publicService from '../services/public.service';
import { NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await vendorService.listVendors(req.query as unknown as Parameters<typeof vendorService.listVendors>[0]);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.json({ data: vendor });
  } catch (err) { next(err); }
}

export async function applyForVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await vendorService.applyForVendor(req.user!.sub, req.body);
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
}

export async function getMyVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getMyVendor(req.user!.sub);
    res.json({ data: vendor });
  } catch (err) { next(err); }
}

export async function updateMyVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.updateMyVendor(req.user!.sub, req.body);
    res.json({ data: vendor });
  } catch (err) { next(err); }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const data = await vendorService.getVendorDashboard(v.id);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function getVendorBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const page = parseInt(req.query.page as string ?? '1');
    const limit = parseInt(req.query.limit as string ?? '20');
    const result = await vendorService.getVendorBookings(v.id, page, limit);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getVendorClients(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const clients = await vendorService.getVendorClients(v.id);
    res.json({ data: clients });
  } catch (err) { next(err); }
}

export async function getVendorStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const staff = await vendorService.getVendorStaff(v.id);
    res.json({ data: staff });
  } catch (err) { next(err); }
}

export async function inviteStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const invite = await vendorService.inviteStaff(v.id, (req.body as { email: string }).email);
    res.status(201).json({ data: invite });
  } catch (err) { next(err); }
}

export async function getVendorPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const payouts = await vendorService.getVendorPayouts(v.id);
    res.json({ data: payouts });
  } catch (err) { next(err); }
}

export async function getBlockedSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to   = req.query.to   ? new Date(req.query.to as string)   : undefined;
    const slots = await prisma.blockedSlot.findMany({
      where: {
        vendorId: v.id,
        ...(from && { startsAt: { gte: from } }),
        ...(to   && { endsAt:   { lte: to  } }),
      },
      orderBy: { startsAt: 'asc' },
    });
    res.json({ data: slots });
  } catch (err) { next(err); }
}

export async function createBlockedSlot(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const { startsAt, endsAt, reason } = req.body as { startsAt: string; endsAt: string; reason?: string };
    const slot = await prisma.blockedSlot.create({
      data: { vendorId: v.id, startsAt: new Date(startsAt), endsAt: new Date(endsAt), reason },
    });
    res.status(201).json({ data: slot });
  } catch (err) { next(err); }
}

export async function deleteBlockedSlot(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    await prisma.blockedSlot.deleteMany({ where: { id: req.params.slotId, vendorId: v.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getSmsConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { smsConfig: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const { DEFAULT_SMS_TEMPLATES } = await import('../lib/sms');
    const stored = (v.smsConfig ?? {}) as Record<string, { active?: boolean; text?: string }>;
    const merged = Object.fromEntries(Object.entries(DEFAULT_SMS_TEMPLATES).map(([k, d]) => [k, { label: d.label, active: stored[k]?.active ?? d.active, text: stored[k]?.text ?? d.text }]));
    res.json({ data: merged });
  } catch (err) { next(err); }
}

export async function updateSmsConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true, smsConfig: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const current = (v.smsConfig ?? {}) as Record<string, unknown>;
    const incoming = (req.body?.smsConfig ?? req.body ?? {}) as Record<string, { active?: boolean; text?: string }>;
    const next: Record<string, { active: boolean; text: string }> = { ...(current as Record<string, { active: boolean; text: string }>) };
    for (const [k, val] of Object.entries(incoming)) {
      next[k] = { active: !!val.active, text: String(val.text ?? (current[k] as { text?: string })?.text ?? '') };
    }
    await prisma.vendor.update({ where: { id: v.id }, data: { smsConfig: next } });
    res.json({ data: next });
  } catch (err) { next(err); }
}

const PERMISSION_KEYS = [
  'scheduleClients', 'rescheduleClients', 'moveAppointments', 'manageGiftCards',
  'manageWorkingHours', 'requestTimeOff', 'createForms', 'sendForms',
  'manageMemberships', 'manageProducts', 'manageWaitlist',
] as const;

export async function updateStaffPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.staffId, vendorId: v.id },
      select: { id: true, permissions: true },
    });
    if (!staff) throw new NotFoundError('Employee not found');

    // Merge only known boolean keys onto the existing permissions.
    const current = (staff.permissions ?? {}) as Record<string, boolean>;
    const incoming = (req.body?.permissions ?? req.body ?? {}) as Record<string, unknown>;
    const next: Record<string, boolean> = { ...current };
    for (const k of PERMISSION_KEYS) {
      if (k in incoming) next[k] = !!incoming[k];
    }
    const updated = await prisma.staffMember.update({
      where: { id: staff.id },
      data: { permissions: next },
      select: { id: true, permissions: true },
    });
    res.json({ data: updated });
  } catch (err) { next(err); }
}

export async function getVendorWaitlist(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const entries = await prisma.waitlistEntry.findMany({
      where: { vendorId: v.id },
      include: {
        booking: {
          select: {
            id: true, status: true,
            client: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: [{ requestedStartsAt: 'asc' }, { position: 'asc' }],
    });
    res.json({ data: entries });
  } catch (err) { next(err); }
}

export async function createVendorBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const v = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!v) throw new NotFoundError('Vendor not found');
    const { serviceId, startsAt, staffMemberId, clientName, clientEmail, clientPhone } = req.body as {
      serviceId: string; startsAt: string; staffMemberId?: string;
      clientName: string; clientEmail: string; clientPhone?: string;
    };
    const result = await publicService.createVendorQuickBooking(v.id, {
      serviceId, startsAt, staffMemberId, clientName, clientEmail, clientPhone,
    });
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
}
