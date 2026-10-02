import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken, generateJti } from '../lib/jwt';
import { AuthError, ConflictError, RateLimitError } from '../lib/errors';
import { Role } from '@prisma/client';
import { logger } from '../lib/logger';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ACCESS_EXPIRY_SECONDS = 15 * 60;
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const OTP_TTL_SECONDS = 10 * 60;

// Never expose the password hash in API responses.
function sanitizeUser<T extends { passwordHash?: string | null }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

async function buildTokenPair(user: { id: string; role: string; vendorId?: string; staffId?: string }) {
  const jti = generateJti();
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    vendorId: user.vendorId,
    staffId: user.staffId,
  });
  const refreshToken = signRefreshToken(user.id, jti);
  await redis.set(`session:refresh:${jti}`, user.id, 'EX', REFRESH_EXPIRY_SECONDS);
  return { accessToken, refreshToken };
}

async function loadUserContext(userId: string, role: string) {
  let vendorId: string | undefined;
  let staffId: string | undefined;
  if (role === 'vendor_owner') {
    const v = await prisma.vendor.findFirst({ where: { ownerId: userId }, select: { id: true } });
    vendorId = v?.id;
  }
  if (role === 'vendor_staff') {
    const s = await prisma.staffMember.findFirst({ where: { userId }, select: { id: true } });
    staffId = s?.id;
  }
  return { vendorId, staffId };
}

export async function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: 'client' | 'vendor_owner';
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      role: data.role as Role,
      isVerified: false,
    },
  });

  await prisma.notificationPreference.create({ data: { userId: user.id } });

  // Welcome email (real delivery once SMTP is configured; logs otherwise).
  if (data.email) {
    const { sendMail } = await import('../lib/mailer');
    void sendMail({
      to: data.email,
      subject: 'Welcome to TEDDY ✨',
      html: `<p>Hi ${data.firstName || 'there'},</p><p>Welcome to <strong>TEDDY</strong> — your account is ready. You can now browse salons, book treatments, and manage your appointments, forms, and rewards from the app.</p><p>See you soon!</p><p style="color:#6B6B62;font-size:12px">If you didn't create this account, you can ignore this email.</p>`,
    }).catch(() => {});
  }

  if (data.role === 'vendor_owner' && data.phone) {
    await sendOtp(data.phone);
  }

  const { vendorId, staffId } = await loadUserContext(user.id, user.role);
  const tokens = await buildTokenPair({ id: user.id, role: user.role, vendorId, staffId });
  return { user: sanitizeUser(user), ...tokens };
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.deletedAt) throw new AuthError('Invalid credentials');
  if (!user.passwordHash) throw new AuthError('Use social login for this account');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError('Invalid credentials');

  const { vendorId, staffId } = await loadUserContext(user.id, user.role);
  const tokens = await buildTokenPair({ id: user.id, role: user.role, vendorId, staffId });
  return { user: sanitizeUser(user), ...tokens };
}

export async function loginWithGoogle(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new AuthError('Invalid Google token');

  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  let isNewUser = false;

  const user = existing ?? await (async () => {
    isNewUser = true;
    const created = await prisma.user.create({
      data: {
        email: payload.email!,
        firstName: payload.given_name ?? '',
        lastName: payload.family_name ?? '',
        avatarUrl: payload.picture,
        role: Role.client,
        isVerified: true,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: created.id } });
    return created;
  })();

  if (!user.isActive) throw new AuthError('Account suspended');

  const { vendorId, staffId } = await loadUserContext(user.id, user.role);
  const tokens = await buildTokenPair({ id: user.id, role: user.role, vendorId, staffId });
  return { user: sanitizeUser(user), isNewUser, ...tokens };
}

export async function sendOtp(phone: string) {
  const rateLimitKey = `ratelimit:otp:${phone}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) await redis.expire(rateLimitKey, 10 * 60);
  if (count > 3) throw new RateLimitError('Too many OTP requests for this phone number');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${phone}`, code, 'EX', OTP_TTL_SECONDS);

  if (process.env.OTP_MOCK_MODE === 'true') {
    // MOCK: replace with twilio.messages.create({ body: `Your TEDDY code: ${code}`, from: TWILIO_PHONE, to: phone })
    logger.info(`[OTP MOCK] Code for ${phone}: ${code}`);
  }
}

export async function verifyOtp(phone: string, code: string) {
  const stored = await redis.get(`otp:${phone}`);
  if (!stored || stored !== code) throw new AuthError('Invalid or expired OTP');
  await redis.del(`otp:${phone}`);

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone, firstName: '', lastName: '', role: Role.client, isVerified: true },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
  }

  const { vendorId, staffId } = await loadUserContext(user.id, user.role);
  const tokens = await buildTokenPair({ id: user.id, role: user.role, vendorId, staffId });
  return { user: sanitizeUser(user), ...tokens };
}

export async function rotateTokens(refreshToken: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }

  const stored = await redis.get(`session:refresh:${payload.jti}`);
  if (!stored) throw new AuthError('Refresh token already used or revoked');

  await redis.del(`session:refresh:${payload.jti}`);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new AuthError('Account not found or suspended');

  const { vendorId, staffId } = await loadUserContext(user.id, user.role);
  const tokens = await buildTokenPair({ id: user.id, role: user.role, vendorId, staffId });
  return tokens;
}

export async function logout(jti: string) {
  await redis.del(`session:refresh:${jti}`);
}
