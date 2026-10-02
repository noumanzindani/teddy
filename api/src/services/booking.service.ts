import { prisma } from '../lib/prisma';
import { redis, setNX } from '../lib/redis';
import { NotFoundError, ForbiddenError, ConflictError } from '../lib/errors';
import { BookingStatus, Prisma } from '@prisma/client';
import { awardPoints } from './rewards.service';
import { createNotification } from './notification.service';
import { logger } from '../lib/logger';
import { differenceInHours } from 'date-fns';

const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.15');
const PAYOUT_DELAY_MS = parseInt(process.env.PAYOUT_DELAY_DAYS ?? '2') * 24 * 60 * 60 * 1000;
// Grace period after completion for the client to confirm the invoice + tip before
// the booking is auto-finalised (balance settled, no tip, payout released).
const AUTO_FINALIZE_DELAY_MS = parseInt(process.env.AUTO_FINALIZE_HOURS ?? '24') * 60 * 60 * 1000;

function slotLockKey(vendorId: string, staffMemberId: string | undefined, startsAt: Date) {
  return `lock:slot:${vendorId}:${staffMemberId ?? 'any'}:${startsAt.toISOString()}`;
}

export async function createBooking(
  clientId: string,
  data: { vendorId: string; serviceId: string; staffMemberId?: string; startsAt: string; notes?: string;
    addOns?: { id: string; name: string; price: number; durationMin: number }[] }
) {
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
    include: { vendor: { select: { id: true, status: true, bookingWindowDays: true, memberBookingWindowDays: true } } },
  });
  if (!service || !service.isActive) throw new NotFoundError('Service not found or inactive');
  if (service.vendor.status !== 'ACTIVE') throw new NotFoundError('Vendor is not active');
  if (service.vendorId !== data.vendorId) throw new ForbiddenError('Service does not belong to vendor');

  // Business rule: a client can be flagged as unable to self-book online.
  const client = await prisma.user.findUnique({ where: { id: clientId }, select: { canBookOnline: true } });
  if (client && client.canBookOnline === false) {
    throw new ForbiddenError('Online booking is disabled for this account — please contact the salon.');
  }

  const startsAt = new Date(data.startsAt);

  // Business rule: how far ahead a client may book (members can get a longer window).
  const isMember = !!(await prisma.subscription.findFirst({ where: { clientId, vendorId: data.vendorId, status: 'active' as never }, select: { id: true } }));
  const windowDays = (isMember && service.vendor.memberBookingWindowDays) || service.vendor.bookingWindowDays || 60;
  const maxDate = new Date(Date.now() + windowDays * 86400000);
  if (startsAt > maxDate) {
    throw new ConflictError(`Bookings can only be made up to ${windowDays} days in advance.`);
  }

  // Add-ons extend duration and price.
  const addOns = data.addOns ?? [];
  const addOnPrice = addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const addOnMinutes = addOns.reduce((s, a) => s + (Number(a.durationMin) || 0), 0);

  const endsAt = new Date(startsAt.getTime() + (service.durationMin + service.bufferMin + addOnMinutes) * 60 * 1000);
  const totalAmount = Number(service.price) + addOnPrice;
  const platformFee = totalAmount * COMMISSION_RATE;
  const vendorPayout = totalAmount - platformFee;

  // Deposit split: client pays `depositAmount` up front to confirm, `balanceAmount`
  // is settled at completion. depositPercentage 100 preserves full-prepay behaviour.
  const depositPct = Math.min(100, Math.max(0, service.depositPercentage ?? 100));
  const depositAmount = Math.round(totalAmount * depositPct) / 100;
  const balanceAmount = Math.round((totalAmount - depositAmount) * 100) / 100;

  const lockKey = slotLockKey(data.vendorId, data.staffMemberId, startsAt);
  const bookingId = crypto.randomUUID();
  const acquired = await setNX(lockKey, bookingId, 300);

  if (!acquired) {
    // Slot taken — add to waitlist
    const booking = await prisma.booking.create({
      data: {
        id: bookingId,
        clientId,
        vendorId: data.vendorId,
        staffMemberId: data.staffMemberId,
        serviceId: data.serviceId,
        startsAt,
        endsAt,
        totalAmount,
        platformFee,
        vendorPayout,
        depositAmount,
        balanceAmount,
        status: BookingStatus.WAITLISTED,
        notes: data.notes,
        addOns: addOns as never,
      },
    });

    const position = await prisma.waitlistEntry.count({
      where: { vendorId: data.vendorId, staffMemberId: data.staffMemberId, requestedStartsAt: startsAt },
    });
    await prisma.waitlistEntry.create({
      data: { bookingId: booking.id, clientId, vendorId: data.vendorId, serviceId: data.serviceId, staffMemberId: data.staffMemberId, requestedStartsAt: startsAt, position: position + 1 },
    });

    return { booking, waitlisted: true, position: position + 1 };
  }

  const booking = await prisma.booking.create({
    data: {
      id: bookingId,
      clientId,
      vendorId: data.vendorId,
      staffMemberId: data.staffMemberId,
      serviceId: data.serviceId,
      startsAt,
      endsAt,
      totalAmount,
      platformFee,
      vendorPayout,
      depositAmount,
      balanceAmount,
      status: BookingStatus.PENDING,
      notes: data.notes,
      addOns: addOns as never,
    },
    include: { service: true, vendor: { select: { businessName: true } } },
  });

  // Enqueue reminder and no-show detection
  try {
    const { bookingReminderQueue, noShowQueue } = await import('../jobs');
    const msUntilReminder = startsAt.getTime() - Date.now() - 24 * 60 * 60 * 1000;
    if (msUntilReminder > 0) {
      await bookingReminderQueue.add('reminder', { bookingId }, { delay: msUntilReminder });
    }
    const msUntilNoShow = startsAt.getTime() - Date.now() + 30 * 60 * 1000;
    if (msUntilNoShow > 0) {
      await noShowQueue.add('noShow', { bookingId }, { delay: msUntilNoShow });
    }
  } catch {
    // Jobs not critical for booking creation
  }

  await createNotification(
    clientId,
    'Booking Requested',
    `Your ${booking.service.name} at ${booking.vendor.businessName} has been requested.`,
    'booking',
    `/bookings/${bookingId}`
  );

  // Auto-send required intake forms assigned to this service (notify + email the client).
  try {
    const { getFormsForService } = await import('./form.service');
    const forms = await getFormsForService(data.serviceId);
    const due = (forms ?? []).filter((f) => f.sendAfterBooking !== false);
    if (due.length) {
      const names = due.map((f) => f.name).join(', ');
      await createNotification(
        clientId,
        'Please complete your forms',
        `Before your ${booking.service.name} appointment, please complete: ${names}.`,
        'form',
        `/my-forms`,
      ).catch(() => {});
      const client = await prisma.user.findUnique({ where: { id: clientId }, select: { email: true, firstName: true } });
      if (client?.email) {
        const { sendMail } = await import('../lib/mailer');
        await sendMail({
          to: client.email,
          subject: `Action needed: complete your forms for ${booking.service.name}`,
          html: `<p>Hi ${client.firstName ?? ''},</p><p>Please complete the following form(s) before your <strong>${booking.service.name}</strong> appointment at ${booking.vendor.businessName}: <strong>${names}</strong>.</p><p>Open the TEDDY app → Profile → My Forms to fill them out.</p><p>Thank you!</p>`,
        }).catch(() => {});
      }
    }
  } catch { /* forms are non-critical to booking creation */ }

  // Vendor-configurable confirmation SMS (log-mode until Twilio creds are set).
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId }, select: { smsConfig: true, businessName: true } });
    const cfg = ((vendor?.smsConfig ?? {}) as Record<string, { active?: boolean; text?: string }>).confirmation;
    if (cfg?.active) {
      const client = await prisma.user.findUnique({ where: { id: clientId }, select: { phone: true, firstName: true } });
      if (client?.phone) {
        const { sendSms, renderTemplate } = await import('../lib/sms');
        await sendSms(client.phone, renderTemplate(cfg.text || '', {
          name: client.firstName ?? '', service: booking.service.name, business: vendor?.businessName ?? '', date: startsAt.toLocaleString(),
        })).catch(() => {});
      }
    }
  } catch { /* SMS non-critical */ }

  try {
    const { emitBookingUpdate } = await import('../socket');
    emitBookingUpdate(bookingId, booking);
  } catch { /* socket not yet ready */ }

  return { booking, waitlisted: false };
}

export async function confirmBooking(bookingId: string, actorId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, vendor: { select: { businessName: true, ownerId: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (actorId !== 'system' && booking.vendor.ownerId !== actorId && actorId !== 'admin') {
    throw new ForbiddenError('Only the vendor can confirm this booking');
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CONFIRMED, confirmedAt: new Date() },
  });

  await createNotification(
    booking.clientId,
    'Booking Confirmed!',
    `Your ${booking.service.name} at ${booking.vendor.businessName} is confirmed.`,
    'booking',
    `/bookings/${bookingId}`
  );

  try {
    const { emitBookingUpdate } = await import('../socket');
    emitBookingUpdate(bookingId, updated);
  } catch { /* */ }

  return updated;
}

export async function startBooking(bookingId: string, actorId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vendor: { select: { ownerId: true } }, service: { select: { durationMin: true, name: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.status !== BookingStatus.CONFIRMED) throw new ConflictError('Booking must be CONFIRMED to start');

  // Starting the service starts the on-site countdown. The timer runs from the
  // service's booked duration; every client computes remaining time locally from
  // timerStartedAt + timerDurationMin, so the server never has to poll.
  const now = new Date();
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.IN_PROGRESS,
      startedAt: now,
      timerStartedAt: now,
      timerDurationMin: booking.service.durationMin,
    },
  });

  // Let the client know their service has begun — full transparency.
  await createNotification(
    booking.clientId,
    'Your service has started',
    `Your ${booking.service.name} is now in progress (${booking.service.durationMin} min).`,
    'booking',
    `/bookings/${bookingId}`
  );

  try {
    const { emitBookingUpdate, emitBookingTimer } = await import('../socket');
    emitBookingUpdate(bookingId, updated);
    emitBookingTimer(bookingId, booking.vendorId, {
      bookingId,
      status: 'running',
      startedAt: now.toISOString(),
      durationMin: booking.service.durationMin,
      extraMin: 0,
    });
  } catch { /* */ }

  return updated;
}

// Client requested extra time mid-service; staff adds it and it's billed at the
// vendor-set per-block rate. Guarded so it can't overlap the next booking.
export async function extendTimer(bookingId: string, actorId: string, extraMin: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      vendor: { select: { ownerId: true } },
      service: { select: { extraTimeRate: true, name: true } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.status !== BookingStatus.IN_PROGRESS) throw new ConflictError('Timer is not running');
  if (booking.staffMemberId == null && booking.vendor.ownerId !== actorId) {
    throw new ForbiddenError('Only the assigned staff or vendor can extend the timer');
  }
  if (extraMin <= 0) throw new ConflictError('Extra minutes must be positive');

  // Check the extension doesn't collide with the staff member's next booking.
  const timerStart = booking.timerStartedAt ?? booking.startedAt ?? new Date();
  const newEnd = new Date(
    timerStart.getTime() + ((booking.timerDurationMin ?? 0) + booking.timerExtraMin + extraMin) * 60 * 1000
  );
  if (booking.staffMemberId) {
    const conflict = await prisma.booking.findFirst({
      where: {
        staffMemberId: booking.staffMemberId,
        id: { not: bookingId },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        startsAt: { lt: newEnd, gte: timerStart },
      },
    });
    if (conflict) throw new ConflictError('Not enough free time before the next booking');
  }

  // Charge per 15-min block at the vendor-set rate.
  const ratePerBlock = Number(booking.service.extraTimeRate ?? 0);
  const blocks = Math.ceil(extraMin / 15);
  const addedCost = ratePerBlock * blocks;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      timerExtraMin: { increment: extraMin },
      timerExtraCost: { increment: addedCost },
    },
  });

  await createNotification(
    booking.clientId,
    'Extra time added',
    `${extraMin} more minutes were added to your ${booking.service.name}${addedCost > 0 ? ` — $${addedCost.toFixed(2)} additional charge` : ''}.`,
    'booking',
    `/bookings/${bookingId}`
  );

  try {
    const { emitBookingTimer } = await import('../socket');
    emitBookingTimer(bookingId, booking.vendorId, {
      bookingId,
      status: 'extended',
      startedAt: timerStart.toISOString(),
      durationMin: booking.timerDurationMin ?? 0,
      extraMin: updated.timerExtraMin,
      extraCost: Number(updated.timerExtraCost),
    });
  } catch { /* */ }

  return updated;
}

export async function completeBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, vendor: { select: { id: true, businessName: true, ownerId: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.status !== BookingStatus.IN_PROGRESS) throw new ConflictError('Booking must be IN_PROGRESS to complete');

  const completedAt = new Date();
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.COMPLETED, completedAt },
  });

  // Award loyalty points
  await awardPoints(booking.clientId, Number(booking.totalAmount), bookingId);

  // Delete slot lock
  await redis.del(slotLockKey(booking.vendorId, booking.staffMemberId ?? undefined, booking.startsAt));

  try {
    const { emitBookingUpdate, emitBookingTimer } = await import('../socket');
    emitBookingUpdate(bookingId, updated);
    emitBookingTimer(bookingId, booking.vendorId, { bookingId, status: 'complete' });
  } catch { /* */ }

  // Uniform flow: the client reviews the invoice, optionally tips, and confirms.
  // Payout + invoice are issued when they settle (payBalance), even if the balance
  // is $0 (fully prepaid) — the confirmation + optional tip still happen there.
  const balance = Number(booking.balanceAmount);
  const extra = Number(booking.timerExtraCost);
  const dueMsg = balance + extra > 0
    ? ` Please pay the remaining $${(balance + extra).toFixed(2)} and add a tip if you'd like.`
    : ' Review your invoice and add a tip if you\'d like.';
  await createNotification(
    booking.clientId,
    'Service complete — review & confirm',
    `Your ${booking.service.name} is done.${dueMsg}`,
    'booking',
    `/bookings/${bookingId}`
  );
  await createNotification(booking.vendor.ownerId, 'Service complete', `${booking.service.name} finished. Awaiting client confirmation & payment.`, 'booking');

  // Safety net: auto-finalise if the client doesn't confirm within the grace window.
  try {
    const { autoFinalizeQueue } = await import('../jobs');
    await autoFinalizeQueue.add('autoFinalize', { bookingId }, { delay: AUTO_FINALIZE_DELAY_MS });
  } catch { /* jobs not critical to completion */ }

  return updated;
}

/** Create the vendor payout record and enqueue its delayed release. */
async function schedulePayout(
  bookingId: string,
  vendorId: string,
  grossAmount: Prisma.Decimal | number,
  commissionAmount: Prisma.Decimal | number,
  netAmount: Prisma.Decimal | number,
  completedAt: Date
) {
  const payout = await prisma.payout.create({
    data: {
      vendorId,
      grossAmount,
      commissionAmount,
      netAmount,
      bookingIds: [bookingId],
      scheduledAt: new Date(completedAt.getTime() + PAYOUT_DELAY_MS),
      status: 'PENDING',
    },
  });
  try {
    const { payoutQueue } = await import('../jobs');
    await payoutQueue.add('payout', { bookingId, payoutId: payout.id }, { delay: PAYOUT_DELAY_MS });
  } catch { /* */ }
  return payout;
}

/**
 * Client settles the remaining balance and optionally adds a tip. This finalises
 * the booking: records the tip, releases the vendor payout, generates + shares the
 * invoice, and pushes a realtime status update.
 */
export async function payBalance(bookingId: string, clientId: string, tipAmount = 0) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { select: { name: true } }, vendor: { select: { ownerId: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.clientId !== clientId) throw new ForbiddenError('Not your booking');
  if (booking.status !== BookingStatus.COMPLETED) throw new ConflictError('Service must be completed before paying the balance');
  if (booking.balancePaidAt) throw new ConflictError('Balance already paid');

  const tip = Math.max(0, Math.round(Number(tipAmount) * 100) / 100);
  const balance = Number(booking.balanceAmount);
  const extra = Number(booking.timerExtraCost);

  // Charge balance + extra-time + tip. Payment is mock-mode platform-wide; this
  // records settlement. (Real Stripe: capture remainder + create tip charge here.)
  logger.info(`[PAYMENT MOCK] payBalance bookingId=${bookingId} balance=${balance} extra=${extra} tip=${tip}`);

  const now = new Date();
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { tipAmount: tip, balancePaidAt: now },
  });

  // Release the vendor payout that was deferred at completion.
  await schedulePayout(bookingId, booking.vendorId, booking.totalAmount, booking.platformFee, booking.vendorPayout, now);

  // Generate + share the invoice to client, vendor and staff.
  let invoice = null;
  try {
    const { generateInvoice } = await import('./invoice.service');
    invoice = await generateInvoice(bookingId);
  } catch (err) { logger.error(`[INVOICE] generation failed for ${bookingId}: ${String(err)}`); }

  await createNotification(booking.vendor.ownerId, 'Balance paid', `${booking.service.name} fully paid${tip > 0 ? ` — includes $${tip.toFixed(2)} tip` : ''}. Payout scheduled.`, 'booking');

  try {
    const { emitBookingUpdate } = await import('../socket');
    emitBookingUpdate(bookingId, updated);
  } catch { /* */ }

  return { booking: updated, invoice };
}

export async function cancelBooking(bookingId: string, actorId: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      vendor: { select: { ownerId: true, businessName: true, cancellationHours: true } },
      payment: true,
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const isClient = booking.clientId === actorId;

  // Business rule: clients can only cancel online outside the salon's notice window.
  if (isClient) {
    const hoursUntil = differenceInHours(booking.startsAt, new Date());
    if (hoursUntil < (booking.vendor.cancellationHours ?? 24)) {
      throw new ConflictError(`Cancellations require at least ${booking.vendor.cancellationHours ?? 24} hours' notice — please contact the salon.`);
    }
  }
  const isVendor = booking.vendor.ownerId === actorId;
  if (!isClient && !isVendor) throw new ForbiddenError('Not authorized to cancel this booking');

  const status = isClient ? BookingStatus.CANCELLED_CLIENT : BookingStatus.CANCELLED_VENDOR;

  // Refund policy
  let refundAmount = 0;
  if (booking.payment) {
    const hoursUntilBooking = differenceInHours(booking.startsAt, new Date());
    if (isVendor || hoursUntilBooking >= 24) {
      refundAmount = Number(booking.totalAmount);
    } else {
      refundAmount = Number(booking.totalAmount) * 0.5; // 50% for late client cancels
    }
    if (refundAmount > 0) {
      const { refundPayment } = await import('./payment.service');
      await refundPayment(bookingId, refundAmount);
    }
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status, cancelReason: reason, cancelledAt: new Date() },
  });

  await redis.del(slotLockKey(booking.vendorId, booking.staffMemberId ?? undefined, booking.startsAt));
  await promoteWaitlistEntry(booking.vendorId, booking.staffMemberId ?? undefined, booking.startsAt);

  const notifyId = isClient ? booking.vendor.ownerId : booking.clientId;
  await createNotification(notifyId, 'Booking Cancelled', `A booking for ${booking.service.name} was cancelled.`, 'booking');

  try {
    const { emitBookingUpdate } = await import('../socket');
    emitBookingUpdate(bookingId, updated);
  } catch { /* */ }

  return { booking: updated, refundAmount };
}

/**
 * Reschedule a booking to a new start time. Clients must give at least the
 * salon's `rescheduleHours` notice; vendors/staff can move it any time.
 * Recomputes endsAt from the service duration + buffer and releases the old slot.
 */
export async function rescheduleBooking(bookingId: string, actorId: string, newStartsAt: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      vendor: { select: { ownerId: true, businessName: true, rescheduleHours: true, bookingWindowDays: true } },
      staffMember: { select: { userId: true, permissions: true } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const isClient = booking.clientId === actorId;
  const isVendor = booking.vendor.ownerId === actorId;
  // The assigned staff member may move/reschedule their own booking if permitted.
  const isAssignedStaff = booking.staffMember?.userId === actorId;
  if (isAssignedStaff) {
    const perms = (booking.staffMember?.permissions ?? {}) as Record<string, boolean>;
    if (perms.rescheduleClients === false && perms.moveAppointments === false) {
      throw new ForbiddenError('You do not have permission to reschedule appointments.');
    }
  }
  if (!isClient && !isVendor && !isAssignedStaff) throw new ForbiddenError('Not authorized to reschedule this booking');

  if (booking.status === BookingStatus.CANCELLED_CLIENT || booking.status === BookingStatus.CANCELLED_VENDOR ||
      booking.status === BookingStatus.COMPLETED) {
    throw new ConflictError('This booking can no longer be rescheduled.');
  }

  const start = new Date(newStartsAt);
  if (isNaN(start.getTime())) throw new ConflictError('Invalid new time.');
  if (start < new Date()) throw new ConflictError('Please pick a future time.');

  // Client notice window on the CURRENT appointment time.
  if (isClient) {
    const hoursUntil = differenceInHours(booking.startsAt, new Date());
    if (hoursUntil < (booking.vendor.rescheduleHours ?? 24)) {
      throw new ConflictError(`Reschedules require at least ${booking.vendor.rescheduleHours ?? 24} hours' notice — please contact the salon.`);
    }
  }

  const endsAt = new Date(start.getTime() + (booking.service.durationMin + booking.service.bufferMin) * 60 * 1000);
  const oldStartsAt = booking.startsAt;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { startsAt: start, endsAt },
  });

  // Release the old slot lock and promote anyone waiting on it.
  await redis.del(slotLockKey(booking.vendorId, booking.staffMemberId ?? undefined, oldStartsAt));
  await promoteWaitlistEntry(booking.vendorId, booking.staffMemberId ?? undefined, oldStartsAt).catch(() => {});

  const notifyId = isClient ? booking.vendor.ownerId : booking.clientId;
  await createNotification(notifyId, 'Booking Rescheduled', `A booking for ${booking.service.name} was moved to ${start.toLocaleString()}.`, 'booking').catch(() => {});

  try {
    const { emitBookingUpdate } = await import('../socket');
    emitBookingUpdate(bookingId, updated);
  } catch { /* */ }

  return { booking: updated };
}

export async function markNoShow(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, vendor: { select: { ownerId: true, businessName: true } } },
  });
  if (!booking) return;
  if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) return;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.NO_SHOW, cancelledAt: new Date() },
  });

  await redis.del(slotLockKey(booking.vendorId, booking.staffMemberId ?? undefined, booking.startsAt));
  await promoteWaitlistEntry(booking.vendorId, booking.staffMemberId ?? undefined, booking.startsAt);

  await createNotification(booking.vendor.ownerId, 'Client No-Show', `Client did not show for ${booking.service.name}.`, 'booking');
  await createNotification(booking.clientId, 'No-Show Recorded', 'Your appointment was marked as no-show. Contact us if this is an error.', 'booking');

  return updated;
}

async function promoteWaitlistEntry(vendorId: string, staffMemberId: string | undefined, startsAt: Date) {
  const entry = await prisma.waitlistEntry.findFirst({
    where: { vendorId, staffMemberId: staffMemberId ?? null, requestedStartsAt: startsAt },
    orderBy: { createdAt: 'asc' },
  });
  if (!entry) return;

  const booking = await prisma.booking.findUnique({ where: { id: entry.bookingId } });
  if (!booking) return;

  const lockKey = slotLockKey(vendorId, staffMemberId, startsAt);
  await redis.set(lockKey, entry.bookingId, 'EX', 300);

  await prisma.booking.update({ where: { id: entry.bookingId }, data: { status: BookingStatus.PENDING } });
  await prisma.waitlistEntry.delete({ where: { bookingId: entry.bookingId } });

  await createNotification(entry.clientId, 'Good news! Slot available', 'A slot opened up for your waitlisted booking. Please confirm within 15 minutes.', 'booking', `/bookings/${entry.bookingId}`);
}

export async function getBookingById(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      vendor: { select: { businessName: true, address: true, coverUrl: true, ownerId: true } },
      staffMember: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      payment: true,
      review: true,
      beforeAfterPhotos: true,
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const isOwner = booking.clientId === userId || booking.vendor.ownerId === userId || booking.staffMemberId != null;
  if (!isOwner) throw new ForbiddenError();

  return booking;
}
