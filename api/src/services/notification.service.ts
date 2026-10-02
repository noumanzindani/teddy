import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type = 'general',
  deepLink?: string,
  metadata: Record<string, unknown> = {}
) {
  const notification = await prisma.notification.create({
    data: { userId, title, body, type, deepLink, metadata: metadata as Prisma.InputJsonValue },
  });

  // Emit via Socket.IO (imported lazily to avoid circular dependency)
  try {
    const { emitNotification } = await import('../socket');
    emitNotification(userId, notification);
  } catch {
    // Socket.IO not yet initialized (startup) — ok
  }

  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (pref?.pushBookingUpdates && (type === 'booking' || type === 'general')) {
    // deepLink rides along so the app can open the right screen when the push is tapped.
    await sendPushNotification(userId, title, body, { ...metadata, deepLink });
  }

  return notification;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushTokens: true } });
  const tokens = (user?.pushTokens as string[]) ?? [];
  if (!tokens.length) return;

  if (process.env.PUSH_MOCK_MODE === 'true') {
    // MOCK: replace with fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', body: JSON.stringify({ to: tokens, title, body, data }) })
    logger.info(`[PUSH MOCK] → ${tokens.join(',')} | ${title}: ${body}`);
    return;
  }

  // Real Expo push API
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, data }))),
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  templateId: string,
  templateData: Record<string, unknown> = {}
) {
  if (process.env.EMAIL_MOCK_MODE === 'true') {
    // MOCK: replace with sgMail.send({ to, from: process.env.SENDGRID_FROM_EMAIL, templateId, dynamicTemplateData: templateData })
    logger.info(`[EMAIL MOCK] → ${to} | ${subject} | template: ${templateId}`, templateData);
    return;
  }
  // Real SendGrid call would go here
}
