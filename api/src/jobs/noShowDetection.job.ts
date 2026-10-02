import { prisma } from '../lib/prisma';
import { markNoShow } from '../services/booking.service';
import { logger } from '../lib/logger';

export async function processNoShowDetection(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, startsAt: true },
  });

  if (!booking) return;

  const thirtyMinAfterStart = new Date(booking.startsAt.getTime() + 30 * 60 * 1000);
  if (new Date() < thirtyMinAfterStart) return; // Too early

  if (booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS') return;

  await markNoShow(bookingId);
  logger.info(`[noShowDetection] Marked no-show for bookingId=${bookingId}`);
}
