import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { createNotification } from './notification.service';
import { sendMail } from '../lib/mailer';

// ── Referrals ─────────────────────────────────────────────────────────────────
/** People this client referred, plus a simple activity summary. */
export async function getReferrals(clientId: string) {
  const referred = await prisma.user.findMany({
    where: { referredById: clientId },
    select: { id: true, firstName: true, lastName: true, createdAt: true, avatarUrl: true },
    orderBy: { createdAt: 'desc' },
  });
  const withActivity = await Promise.all(referred.map(async (u) => ({
    ...u,
    bookings: await prisma.booking.count({ where: { clientId: u.id } }),
  })));
  return { count: referred.length, referred: withActivity };
}

// ── Client's products (used in services + purchased at checkout) ───────────────
export async function getClientProducts(clientId: string) {
  const bookings = await prisma.booking.findMany({
    where: { clientId, status: 'COMPLETED' },
    select: {
      startsAt: true,
      service: { select: { name: true } },
      serviceRecord: { select: { productsUsed: true } },
      invoice: { select: { items: { where: { kind: 'retail' }, select: { description: true, amount: true } } } },
    },
    orderBy: { startsAt: 'desc' },
  });
  const used: { name: string; when: Date; service: string }[] = [];
  const purchased: { name: string; amount: number; when: Date }[] = [];
  for (const b of bookings) {
    const pu = ((b.serviceRecord?.productsUsed as unknown) as { name: string }[]) ?? [];
    pu.forEach((p) => used.push({ name: p.name, when: b.startsAt, service: b.service.name }));
    (b.invoice?.items ?? []).forEach((it) => purchased.push({ name: it.description, amount: Number(it.amount), when: b.startsAt }));
  }
  return { used, purchased };
}

// ── Review requests ───────────────────────────────────────────────────────────
export async function sendReviewRequest(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, email: true, firstName: true } },
      service: { select: { name: true } },
      vendor: { select: { businessName: true } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  await prisma.booking.update({ where: { id: bookingId }, data: { reviewRequestedAt: new Date() } });

  const link = `/bookings/${bookingId}/review`;
  await createNotification(
    booking.client.id,
    'How was your visit?',
    `Tell ${booking.vendor.businessName} how your ${booking.service.name} went — leave a quick review.`,
    'review_request',
    link,
  );
  await sendMail({
    to: booking.client.email ?? '',
    subject: `How was your ${booking.service.name}?`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <p style="font-size:15px;color:#1B1B16">Hi ${booking.client.firstName},</p>
      <p style="font-size:14px;color:#4A4A42">Thanks for visiting <b>${booking.vendor.businessName}</b>. We'd love your feedback on your <b>${booking.service.name}</b>.</p>
      <p style="font-size:14px;color:#4A4A42">Open the TEDDY app to leave a quick review — it only takes a moment.</p>
      <p style="font-size:12px;color:#A8A89F">Sent by ${booking.vendor.businessName} via TEDDY.</p>
    </div>`,
  });
  return { ok: true, reviewRequestedAt: new Date() };
}
