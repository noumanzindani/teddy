import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError } from '../lib/errors';
import { createNotification } from './notification.service';
import { logger } from '../lib/logger';

function pad(n: number, width: number) {
  return n.toString().padStart(width, '0');
}

/** INV-YYYYMMDD-#### — sequential per day. */
async function nextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = pad(now.getUTCMonth() + 1, 2);
  const d = pad(now.getUTCDate(), 2);
  const dayStart = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const countToday = await prisma.invoice.count({
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
  });
  return `INV-${y}${m}${d}-${pad(countToday + 1, 4)}`;
}

/**
 * Build the invoice for a completed booking and share it with the client, the
 * vendor owner and the assigned staff member. Idempotent: returns the existing
 * invoice if one was already generated for the booking.
 */
export async function generateInvoice(bookingId: string) {
  const existing = await prisma.invoice.findUnique({ where: { bookingId } });
  if (existing) return existing;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: { select: { name: true } },
      vendor: { select: { id: true, ownerId: true, businessName: true } },
      staffMember: { select: { userId: true } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const subtotal = Number(booking.totalAmount);
  const extraTimeCost = Number(booking.timerExtraCost);
  const tip = Number(booking.tipAmount);
  const depositPaid = Number(booking.depositAmount);
  const balancePaid = Number(booking.balanceAmount);
  const total = subtotal + extraTimeCost + tip;

  const number = await nextInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      bookingId,
      number,
      vendorId: booking.vendorId,
      clientId: booking.clientId,
      staffMemberId: booking.staffMemberId,
      serviceName: booking.service.name,
      subtotal,
      extraTimeCost,
      depositPaid,
      balancePaid,
      tip,
      total,
    },
  });

  // Share with all three parties. (Email delivery would hook in here — the
  // platform currently shares invoices in-app via the notification system.)
  // TODO(email): send PDF invoice to client/vendor/staff once mail transport is configured.
  const link = `/invoices/${bookingId}`;
  await createNotification(
    booking.clientId,
    'Invoice ready',
    `Your invoice ${number} for ${booking.service.name} — total $${total.toFixed(2)}.`,
    'invoice',
    link,
    { invoiceId: invoice.id, total }
  );
  await createNotification(
    booking.vendor.ownerId,
    'Invoice generated',
    `${number} · ${booking.service.name} · $${total.toFixed(2)}${tip > 0 ? ` (incl. $${tip.toFixed(2)} tip)` : ''}.`,
    'invoice',
    link,
    { invoiceId: invoice.id }
  );
  if (booking.staffMember?.userId) {
    await createNotification(
      booking.staffMember.userId,
      'You received an invoice',
      `${number} · ${booking.service.name}${tip > 0 ? ` · $${tip.toFixed(2)} tip for you` : ''}.`,
      'invoice',
      link,
      { invoiceId: invoice.id, tip }
    );
  }

  logger.info(`[INVOICE] generated ${number} bookingId=${bookingId} total=${total}`);

  // Realtime: notify everyone watching the booking + the vendor dashboard.
  try {
    const { getIO, emitToVendor } = await import('../socket');
    getIO().to(`booking:${bookingId}`).emit('invoice:new', invoice);
    emitToVendor(booking.vendorId, 'invoice:new', invoice);
  } catch { /* IO not ready */ }

  return invoice;
}

export async function getInvoiceByBooking(bookingId: string, userId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { bookingId },
    include: {
      booking: {
        select: {
          clientId: true,
          startsAt: true,
          completedAt: true,
          vendor: { select: { ownerId: true, businessName: true, address: true } },
          staffMember: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');

  const b = invoice.booking;
  const isParty =
    b.clientId === userId ||
    b.vendor.ownerId === userId ||
    b.staffMember?.userId === userId;
  if (!isParty) throw new ConflictError('Not authorized to view this invoice');

  return invoice;
}
