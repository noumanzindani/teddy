import 'dotenv/config';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { winstonStream, logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vendorRoutes from './routes/vendor.routes';
import serviceRoutes from './routes/service.routes';
import staffRoutes from './routes/staff.routes';
import preferenceRoutes from './routes/preference.routes';
import goalRoutes from './routes/goal.routes';
import routineRoutes from './routes/routine.routes';
import workspaceRoutes from './routes/workspace.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import searchRoutes from './routes/search.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import mediaRoutes from './routes/media.routes';
import adminRoutes from './routes/admin.routes';
import clinicalRoutes from './routes/clinical.routes';
import productRoutes from './routes/product.routes';
import giftcardRoutes from './routes/giftcard.routes';
import membershipRoutes from './routes/membership.routes';
import checkoutRoutes from './routes/checkout.routes';
import addonRoutes from './routes/addon.routes';
import formRoutes from './routes/form.routes';
import engagementRoutes from './routes/engagement.routes';
import assistantRoutes from './routes/assistant.routes';
import publicRoutes from './routes/public.routes';
import { bookingPageHandler, bookingScriptHandler } from './bookingPage';

// ── Process-level safety net ──────────────────────────────────────────────────
// Last line of defence: an unhandled rejection or uncaught exception (e.g. a
// stray EventEmitter 'error' or a rejected promise deep in a library) would
// otherwise terminate the process. On a small single-instance host that means a
// full outage until redeploy. Log and keep serving instead — the request that
// triggered it still fails, but the server survives for everyone else.
process.on('unhandledRejection', (reason) => {
  logger.error('[process] Unhandled promise rejection (kept alive)', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('[process] Uncaught exception (kept alive)', err);
});

const app = express();

// Behind Cloud Run's proxy, the client IP arrives in X-Forwarded-For. Trust the
// first proxy hop so express-rate-limit keys on the real client IP (and stops
// throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
app.set('trust proxy', 1);

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  })
);
app.use(morgan('combined', { stream: winstonStream }));
app.use(apiLimiter);

// Stripe webhook needs raw body — mount before json parser
app.use(
  '/v1/payments/webhooks/stripe',
  express.raw({ type: 'application/json' }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/vendors', vendorRoutes);
app.use('/v1/services', serviceRoutes);
app.use('/v1/staff', staffRoutes);
app.use('/v1/preferences', preferenceRoutes);
app.use('/v1/goals', goalRoutes);
app.use('/v1/routines', routineRoutes);
app.use('/v1/workspace', workspaceRoutes);
app.use('/v1/bookings', bookingRoutes);
app.use('/v1/payments', paymentRoutes);
app.use('/v1/reviews', reviewRoutes);
app.use('/v1/search', searchRoutes);
app.use('/v1/chat', chatRoutes);
app.use('/v1/notifications', notificationRoutes);
app.use('/v1/media', mediaRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/clinical', clinicalRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/gift-cards', giftcardRoutes);
app.use('/v1/memberships', membershipRoutes);
app.use('/v1/checkout', checkoutRoutes);
app.use('/v1/addons', addonRoutes);
app.use('/v1/forms', formRoutes);
app.use('/v1/engagement', engagementRoutes);
app.use('/v1/assistant', assistantRoutes);
app.use('/v1/public', publicRoutes);

app.get('/book', bookingPageHandler);
app.get('/book.js', bookingScriptHandler);
// Public iCal feed for staff calendar sync (auth via HMAC sig in the path).
app.get('/calendar/:staffId/:sig', (req, res, next) => import('./controllers/staff.controller').then((m) => m.calendarFeed(req, res, next)).catch(next));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── HTTP server ───────────────────────────────────────────────────────────────
export const httpServer = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
import { initSocketIO } from './socket';
initSocketIO(httpServer);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10);
httpServer.listen(PORT, () => {
  logger.info(`TEDDY API listening on port ${PORT}`);
  // ── BullMQ workers (started after server is up so crashes don't block the API)
  import('./jobs').catch((err) => logger.error('[BullMQ] Failed to start workers', err));
  // ── Lightweight in-process scheduler (reminders / no-show / auto-finalize /
  //    payouts) — low Redis cost alternative to always-on BullMQ workers.
  if (process.env.ENABLE_SCHEDULER === 'true') {
    import('./jobs/scheduler')
      .then((m) => m.startScheduler())
      .catch((err) => logger.error('[scheduler] failed to start', err));
  }
});

export { app };
