import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger';

// Real delivery turns on automatically once SMTP_* env vars are set (e.g. a Gmail
// app password or a Brevo/SendGrid SMTP key). Until then it runs in "log mode":
// every email is logged in full so the flow is testable without a provider.
let transporter: Transporter | null = null;
function getTransport(): Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null; // log-mode
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

/** Send one email. Returns true if actually dispatched, false if logged (mock). */
export async function sendMail({ to, subject, html }: MailInput): Promise<boolean> {
  if (!to) return false;
  const t = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'TEDDY <no-reply@teddy.app>';
  if (!t) {
    logger.info(`[EMAIL log-mode] → ${to} | ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)}`);
    return false;
  }
  try {
    await t.sendMail({ from, to, subject, html });
    logger.info(`[EMAIL sent] → ${to} | ${subject}`);
    return true;
  } catch (err) {
    logger.error(`[EMAIL failed] → ${to} | ${subject}`, err);
    return false;
  }
}

/** Send the same email to several recipients (skips blanks/dupes). */
export async function sendMailToMany(recipients: (string | null | undefined)[], subject: string, html: string) {
  const unique = [...new Set(recipients.filter((r): r is string => !!r))];
  const results = await Promise.all(unique.map((to) => sendMail({ to, subject, html })));
  return { recipients: unique, delivered: results.filter(Boolean).length, mock: results.some((r) => !r) };
}
