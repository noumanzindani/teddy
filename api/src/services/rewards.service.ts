import { prisma } from '../lib/prisma';
import { Tier } from '@prisma/client';

const POINTS_PER_DOLLAR = parseInt(process.env.POINTS_PER_DOLLAR ?? '10');

function calculateTier(points: number): Tier {
  if (points >= 10000) return Tier.PLATINUM;
  if (points >= 5000) return Tier.GOLD;
  if (points >= 1000) return Tier.SILVER;
  return Tier.BRONZE;
}

export async function awardPoints(userId: string, bookingAmountDollars: number, bookingId?: string) {
  const delta = Math.floor(bookingAmountDollars * POINTS_PER_DOLLAR);
  if (delta <= 0) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pointsBalance: true, tier: true } });
  if (!user) return;

  const balanceBefore = user.pointsBalance;
  const balanceAfter = balanceBefore + delta;
  const newTier = calculateTier(balanceAfter);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { pointsBalance: balanceAfter, tier: newTier },
    }),
    prisma.pointsTransaction.create({
      data: {
        userId,
        bookingId,
        delta,
        reason: 'BOOKING_COMPLETED',
        balanceBefore,
        balanceAfter,
      },
    }),
  ]);

  return { delta, balanceAfter, tier: newTier, tierUpgraded: newTier !== user.tier };
}

export async function redeemPoints(userId: string, points: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pointsBalance: true, tier: true } });
  if (!user || user.pointsBalance < points) {
    throw new Error('Insufficient points balance');
  }

  const balanceBefore = user.pointsBalance;
  const balanceAfter = balanceBefore - points;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { pointsBalance: balanceAfter } }),
    prisma.pointsTransaction.create({
      data: { userId, delta: -points, reason: 'REDEMPTION', balanceBefore, balanceAfter },
    }),
  ]);

  return { balanceAfter };
}
