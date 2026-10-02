import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis';

function makeStore(prefix: string) {
  return new RedisStore({
    // @ts-expect-error sendCommand type mismatch between packages
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

// Caps are env-overridable so they can be loosened for a group test window and
// tightened again without a code change: RL_API_MAX / RL_AUTH_MAX / RL_PAYMENT_MAX.
const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: num(process.env.RL_API_MAX, 100),
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('api'),
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.RL_AUTH_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('auth'),
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts' } },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => (req.body as Record<string, string>).phone ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('otp'),
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many OTP requests' } },
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: num(process.env.RL_PAYMENT_MAX, 10),
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('payment'),
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many payment attempts' } },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('search'),
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many search requests' } },
});
