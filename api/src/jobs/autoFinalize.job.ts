import { prisma } from '../lib/prisma';
import { payBalance } from '../services/booking.service';
import { logger } from '../lib/logger';

/**
 * Safety net: if a completed booking is still awaiting the client's balance
 * confirmation after the grace window, auto-settle it (balance only, no tip) so
 * the vendor payout and invoice aren't stuck indefinitely.
 */
export async function processAutoFinalize(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, balancePaidAt: true, clientId: true },
  });

  if (!booking) return;
  if (booking.status !== 'COMPLETED') return; // cancelled or never completed
  if (booking.balancePaidAt) return;          // client already confirmed & paid

  // Client didn't act within the grace period — finalise with no tip.
  await payBalance(bookingId, booking.clientId, 0);
  logger.info(`[autoFinalize] Auto-finalized bookingId=${bookingId} after grace period`);
}
