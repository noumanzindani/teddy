import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service';
import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.createBooking(req.user!.sub, req.body);
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user!.sub);
    res.json({ data: booking });
  } catch (err) { next(err); }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.confirmBooking(req.params.id, req.user!.sub);
    res.json({ data: booking });
  } catch (err) { next(err); }
}

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.startBooking(req.params.id, req.user!.sub);
    res.json({ data: booking });
  } catch (err) { next(err); }
}

export async function complete(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.completeBooking(req.params.id);
    res.json({ data: booking });
  } catch (err) { next(err); }
}

export async function extendTimer(req: Request, res: Response, next: NextFunction) {
  try {
    const extraMin = Number((req.body as { extraMin?: number }).extraMin ?? 15);
    const booking = await bookingService.extendTimer(req.params.id, req.user!.sub, extraMin);
    res.json({ data: booking });
  } catch (err) { next(err); }
}

export async function payBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const tip = Number((req.body as { tip?: number }).tip ?? 0);
    const result = await bookingService.payBalance(req.params.id, req.user!.sub, tip);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { getInvoiceByBooking } = await import('../services/invoice.service');
    const invoice = await getInvoiceByBooking(req.params.id, req.user!.sub);
    res.json({ data: invoice });
  } catch (err) { next(err); }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.cancelBooking(req.params.id, req.user!.sub, (req.body as { reason: string }).reason);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function reschedule(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.rescheduleBooking(req.params.id, req.user!.sub, (req.body as { startsAt: string }).startsAt);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function markNoShow(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.markNoShow(req.params.id);
    res.json({ data: booking });
  } catch (err) { next(err); }
}

export async function getWaitlistPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const entry = await prisma.waitlistEntry.findUnique({ where: { bookingId: req.params.id } });
    res.json({ data: { position: entry?.position ?? null } });
  } catch (err) { next(err); }
}
