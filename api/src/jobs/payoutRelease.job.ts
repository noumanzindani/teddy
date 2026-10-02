import { prisma } from '../lib/prisma';
import { releasePayout } from '../services/payment.service';
import { createNotification } from '../services/notification.service';
import { logger } from '../lib/logger';

export async function processPayoutRelease(payoutId: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { vendor: { select: { ownerId: true, businessName: true } } },
  });

  if (!payout || payout.status !== 'PENDING') {
    logger.info(`[payoutRelease] Skipping payoutId=${payoutId} — status=${payout?.status}`);
    return;
  }

  await releasePayout(payoutId);

  await createNotification(
    payout.vendor.ownerId,
    'Payout Sent',
    `Your payout of $${Number(payout.netAmount).toFixed(2)} is on its way.`,
    'payout'
  );

  logger.info(`[payoutRelease] Released payoutId=${payoutId} amount=${payout.netAmount}`);
}
