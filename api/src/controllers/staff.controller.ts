import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError, AuthError, ForbiddenError } from '../lib/errors';
import { addDays } from 'date-fns';
import * as publicService from '../services/public.service';

import crypto from 'crypto';

const ICAL_SECRET = process.env.JWT_PRIVATE_KEY_B64 || process.env.ICAL_SECRET || 'teddy-ical-secret';
function icalSig(staffId: string): string {
  return crypto.createHmac('sha256', ICAL_SECRET).update(staffId).digest('hex').slice(0, 32);
}

/** Staff requests time off — creates a blocked slot on their calendar (if permitted). */
export async function requestTimeOff(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({
      where: { userId: req.user!.sub }, select: { id: true, vendorId: true, permissions: true },
    });
    if (!staff) throw new NotFoundError('Staff profile not found');
    const perms = (staff.permissions ?? {}) as Record<string, boolean>;
    if (perms.requestTimeOff === false) throw new ForbiddenError('You do not have permission to request time off.');
    const { startsAt, endsAt, reason } = req.body as { startsAt: string; endsAt: string; reason?: string };
    const slot = await prisma.blockedSlot.create({
      data: { staffMemberId: staff.id, vendorId: staff.vendorId, startsAt: new Date(startsAt), endsAt: new Date(endsAt), reason: reason || 'Time off' },
    });
    res.status(201).json({ data: slot });
  } catch (err) { next(err); }
}

export async function getTimeOff(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');
    const slots = await prisma.blockedSlot.findMany({ where: { staffMemberId: staff.id }, orderBy: { startsAt: 'asc' } });
    res.json({ data: slots });
  } catch (err) { next(err); }
}

export async function cancelTimeOff(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');
    await prisma.blockedSlot.deleteMany({ where: { id: req.params.slotId, staffMemberId: staff.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

/** Returns a subscribe URL for the staff member's calendar feed (iCal). */
export async function getCalendarUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');
    const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    res.json({ data: { url: `${base}/calendar/${staff.id}/${icalSig(staff.id)}.ics` } });
  } catch (err) { next(err); }
}

/** Public iCal feed (subscribe in Google/Apple Calendar). Auth via HMAC sig in the URL. */
export async function calendarFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const { staffId, sig } = req.params as { staffId: string; sig: string };
    const cleanSig = sig.replace(/\.ics$/, '');
    if (cleanSig !== icalSig(staffId)) { res.status(403).send('Invalid calendar link'); return; }
    const bookings = await prisma.booking.findMany({
      where: { staffMemberId: staffId, status: { notIn: ['CANCELLED_CLIENT', 'CANCELLED_VENDOR'] }, startsAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      include: { service: { select: { name: true } }, client: { select: { firstName: true, lastName: true } }, vendor: { select: { businessName: true } } },
      orderBy: { startsAt: 'asc' }, take: 500,
    });
    const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s: string) => (s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TEDDY//Staff Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:TEDDY Appointments',
    ];
    for (const b of bookings) {
      lines.push('BEGIN:VEVENT', `UID:${b.id}@teddy`, `DTSTAMP:${dt(new Date(b.createdAt))}`, `DTSTART:${dt(new Date(b.startsAt))}`, `DTEND:${dt(new Date(b.endsAt))}`,
        `SUMMARY:${esc(b.service.name)} — ${esc(b.client.firstName + ' ' + b.client.lastName)}`, `LOCATION:${esc(b.vendor.businessName)}`, `STATUS:CONFIRMED`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    res.set('Content-Type', 'text/calendar; charset=utf-8').send(lines.join('\r\n'));
  } catch (err) { next(err); }
}

/** Staff schedules a client for themselves (auto-assigns this staff member). */
export async function createStaffBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({
      where: { userId: req.user!.sub },
      select: { id: true, vendorId: true, permissions: true },
    });
    if (!staff) throw new NotFoundError('Staff profile not found');
    const perms = (staff.permissions ?? {}) as Record<string, boolean>;
    if (perms.scheduleClients === false) {
      throw new ForbiddenError('You do not have permission to schedule clients. Ask your manager to enable it.');
    }
    const { serviceId, startsAt, clientName, clientEmail, clientPhone } = req.body as {
      serviceId: string; startsAt: string; clientName: string; clientEmail: string; clientPhone?: string;
    };
    const result = await publicService.createVendorQuickBooking(staff.vendorId, {
      serviceId, startsAt, staffMemberId: staff.id, clientName, clientEmail, clientPhone,
    });
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({
      where: { userId: req.user!.sub },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
        vendor: { select: { businessName: true } },
        availability: true,
      },
    });
    if (!staff) throw new NotFoundError('Staff profile not found');
    res.json({ data: staff });
  } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub } });
    if (!staff) throw new NotFoundError('Staff profile not found');
    const updated = await prisma.staffMember.update({ where: { id: staff.id }, data: req.body as Parameters<typeof prisma.staffMember.update>[0]['data'] });
    res.json({ data: updated });
  } catch (err) { next(err); }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');

    const page = parseInt(req.query.page as string ?? '1');
    const limit = parseInt(req.query.limit as string ?? '30');

    const bookings = await prisma.booking.findMany({
      where: { staffMemberId: staff.id, status: { notIn: ['CANCELLED_CLIENT', 'CANCELLED_VENDOR'] } },
      include: {
        client: { select: { firstName: true, lastName: true, avatarUrl: true } },
        service: { select: { name: true, durationMin: true, category: true } },
      },
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    res.json({ data: bookings });
  } catch (err) { next(err); }
}

export async function getClients(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');

    const clientIds = await prisma.booking.findMany({
      where: { staffMemberId: staff.id, status: 'COMPLETED' },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    const ids = clientIds.map((c) => c.clientId);
    const clients = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, pointsBalance: true, tier: true },
    });
    res.json({ data: clients });
  } catch (err) { next(err); }
}

export async function getEarnings(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true, vendorId: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');

    const bookings = await prisma.booking.findMany({
      where: { staffMemberId: staff.id, status: 'COMPLETED' },
      include: { service: { select: { name: true } }, client: { select: { firstName: true, lastName: true } } },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });
    res.json({ data: bookings });
  } catch (err) { next(err); }
}

export async function getPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');

    const [total, completed, noShow, avgRating] = await Promise.all([
      prisma.booking.count({ where: { staffMemberId: staff.id } }),
      prisma.booking.count({ where: { staffMemberId: staff.id, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { staffMemberId: staff.id, status: 'NO_SHOW' } }),
      prisma.review.aggregate({ where: { staffMemberId: staff.id, isVisible: true }, _avg: { rating: true }, _count: true }),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    res.json({ data: { total, completed, noShow, completionRate, avgRating: avgRating._avg.rating ?? 0, reviewCount: avgRating._count } });
  } catch (err) { next(err); }
}

export async function getReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!staff) throw new NotFoundError('Staff profile not found');

    const reviews = await prisma.review.findMany({
      where: { staffMemberId: staff.id, isVisible: true },
      include: {
        client: { select: { firstName: true, lastName: true, avatarUrl: true } },
        booking: { select: { service: { select: { name: true } }, completedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: reviews });
  } catch (err) { next(err); }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const invite = await prisma.vendorInvite.findUnique({ where: { token: req.params.token } });
    if (!invite || invite.accepted || invite.expiresAt < new Date()) {
      res.status(400).json({ error: { code: 'INVALID_INVITE', message: 'Invite is invalid or expired' } });
      return;
    }

    if (req.method === 'GET') {
      res.json({ data: { vendorId: invite.vendorId, email: invite.email, expiresAt: invite.expiresAt } });
      return;
    }

    // POST — link the authenticated user's account as staff
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AuthError();

    const existing = await prisma.staffMember.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.staffMember.create({ data: { userId: user.id, vendorId: invite.vendorId } });
    }

    await prisma.user.update({ where: { id: user.id }, data: { role: 'vendor_staff' } });
    await prisma.vendorInvite.update({ where: { token: req.params.token }, data: { accepted: true, acceptedAt: new Date() } });

    res.json({ data: { accepted: true } });
  } catch (err) { next(err); }
}
