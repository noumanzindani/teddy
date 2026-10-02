import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { processBookingReminder } from './bookingReminder.job';
import { processNoShowDetection } from './noShowDetection.job';
import { processAutoFinalize } from './autoFinalize.job';
import { processPayoutRelease } from './payoutRelease.job';

/**
 * Lightweight in-process scheduler — a low-cost alternative to always-on BullMQ
 * workers (which would hammer Redis with blocking polls). Every TICK_MS it does a
 * few cheap Postgres queries for work that's become due and runs the same job
 * processors. Safe for a single always-on instance (Cloud Run min=max=1).
 *
 * Enabled with ENABLE_SCHEDULER=true. All processors are idempotent by row state,
 * except reminders, which we de-dupe in-memory (fine for one instance).
 */

const TICK_MS = Number(process.env.SCHEDULER_TICK_MS ?? 2 * 60 * 1000); // default 2 min
const AUTO_FINALIZE_MS = Number(process.env.AUTO_FINALIZE_HOURS ?? 24) * 60 * 60 * 1000;
const NO_SHOW_GRACE_MS = 30 * 60 * 1000;
const BATCH = 50;

const remindedBookingIds = new Set<string>();

async function runEach<T extends { id: string }>(rows: T[], fn: (id: string) => Promise<void>, label: string) {
  for (const row of rows) {
    try {
      await fn(row.id);
    } catch (err) {
      logger.error(`[scheduler] ${label} failed for ${row.id}`, err);
    }
  }
}

async function tick() {
  const now = new Date();

  // 1) 24h reminders — bookings confirmed and starting within the next 24h.
  try {
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dueReminders = await prisma.booking.findMany({
      where: { status: 'CONFIRMED', startsAt: { gt: now, lte: soon } },
      select: { id: true },
      take: BATCH,
    });
    const fresh = dueReminders.filter((b) => !remindedBookingIds.has(b.id));
    for (const b of fresh) remindedBookingIds.add(b.id);
    await runEach(fresh, processBookingReminder, 'reminder');
  } catch (err) { logger.error('[scheduler] reminder query failed', err); }

  // 2) No-show — confirmed/in-progress bookings whose start + grace has passed.
  try {
    const cutoff = new Date(now.getTime() - NO_SHOW_GRACE_MS);
    const dueNoShow = await prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] }, startsAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH,
    });
    await runEach(dueNoShow, processNoShowDetection, 'noShow');
  } catch (err) { logger.error('[scheduler] no-show query failed', err); }

  // 3) Auto-finalize — completed bookings past the grace window, balance unpaid.
  try {
    const cutoff = new Date(now.getTime() - AUTO_FINALIZE_MS);
    const dueFinalize = await prisma.booking.findMany({
      where: { status: 'COMPLETED', balancePaidAt: null, completedAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH,
    });
    await runEach(dueFinalize, processAutoFinalize, 'autoFinalize');
  } catch (err) { logger.error('[scheduler] auto-finalize query failed', err); }

  // 4) Payout release — pending payouts whose scheduled time has arrived.
  try {
    const duePayouts = await prisma.payout.findMany({
      where: { status: 'PENDING', scheduledAt: { lte: now } },
      select: { id: true },
      take: BATCH,
    });
    await runEach(duePayouts, processPayoutRelease, 'payoutRelease');
  } catch (err) { logger.error('[scheduler] payout query failed', err); }
}

let timer: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (timer) return;
  logger.info(`[scheduler] started — tick every ${Math.round(TICK_MS / 1000)}s (reminders, no-show, auto-finalize, payouts)`);
  // Kick once shortly after boot, then on the interval.
  setTimeout(() => { void tick(); }, 15 * 1000);
  timer = setInterval(() => { void tick(); }, TICK_MS);
  timer.unref?.();
}
