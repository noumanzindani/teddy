import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

// Parse the full REDIS_URL so BullMQ works with authenticated / TLS providers
// (Upstash uses rediss:// with a password; Render/Railway use plain redis://).
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
  password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
  ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
};
const defaultJobOptions = { removeOnComplete: 100, removeOnFail: 50 };

// ── Queues ─────────────────────────────────────────────────────────────────────
export const bookingReminderQueue = new Queue('bookingReminder', { connection, defaultJobOptions });
export const payoutQueue = new Queue('payoutRelease', { connection, defaultJobOptions });
export const noShowQueue = new Queue('noShowDetection', { connection, defaultJobOptions });
export const autoFinalizeQueue = new Queue('autoFinalize', { connection, defaultJobOptions });
export const searchReindexQueue = new Queue('searchReindex', { connection, defaultJobOptions });

// A Queue is an EventEmitter: if its Redis connection drops (e.g. a free-tier
// provider closing idle connections) and NOTHING is listening for 'error', Node
// treats the emitted error as uncaught and kills the whole process. Attach a
// listener to every queue so a transient Redis blip is logged, not fatal.
for (const q of [bookingReminderQueue, payoutQueue, noShowQueue, autoFinalizeQueue, searchReindexQueue]) {
  q.on('error', (err) => logger.error(`[BullMQ] queue ${q.name} connection error (non-fatal)`, err));
}

// ── Workers ────────────────────────────────────────────────────────────────────
// Workers poll Redis continuously (blocking reads), which is the main memory + Redis
// (command) cost. Enabled only when ENABLE_WORKERS=true (real deployments). Disabled
// by default so small/free tiers stay light — queues above still accept jobs, they
// just aren't processed in the background until a worker instance is enabled.
if (process.env.ENABLE_WORKERS === 'true') {
  new Worker('bookingReminder', async (job: Job<{ bookingId: string }>) => {
    const { processBookingReminder } = await import('./bookingReminder.job');
    await processBookingReminder(job.data.bookingId);
  }, { connection });

  new Worker('payoutRelease', async (job: Job<{ bookingId: string; payoutId: string }>) => {
    const { processPayoutRelease } = await import('./payoutRelease.job');
    await processPayoutRelease(job.data.payoutId);
  }, { connection });

  new Worker('noShowDetection', async (job: Job<{ bookingId: string }>) => {
    const { processNoShowDetection } = await import('./noShowDetection.job');
    await processNoShowDetection(job.data.bookingId);
  }, { connection });

  new Worker('autoFinalize', async (job: Job<{ bookingId: string }>) => {
    const { processAutoFinalize } = await import('./autoFinalize.job');
    await processAutoFinalize(job.data.bookingId);
  }, { connection });

  new Worker('searchReindex', async (_job: Job) => {
    // SEARCH_REINDEX: Connect Elasticsearch to activate this worker
    logger.info('[BullMQ] Search reindex triggered — Elasticsearch not yet connected');
  }, { connection });

  logger.info('[BullMQ] workers started: bookingReminder, payoutRelease, noShowDetection, autoFinalize, searchReindex');
} else {
  logger.info('[BullMQ] workers disabled (set ENABLE_WORKERS=true to run background jobs)');
}
