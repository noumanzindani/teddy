import { logger } from './logger';

/**
 * Send an SMS. Real delivery turns on automatically once TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN and TWILIO_FROM are set (no npm dep — uses Twilio's REST API
 * via fetch). Until then it runs in log-mode so the flow is fully testable.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!to) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    logger.info(`[SMS log-mode] → ${to} | ${body}`);
    return false;
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    if (!res.ok) { logger.error(`[SMS failed ${res.status}] → ${to}`); return false; }
    logger.info(`[SMS sent] → ${to}`);
    return true;
  } catch (err) {
    logger.error(`[SMS error] → ${to}`, err);
    return false;
  }
}

/** Default automated-message set a vendor can enable/edit. Placeholders: {name} {service} {date} {business}. */
export const DEFAULT_SMS_TEMPLATES: Record<string, { label: string; active: boolean; text: string }> = {
  confirmation: { label: 'Appointment confirmation', active: false, text: 'Hi {name}, your {service} at {business} is booked for {date}. See you then!' },
  reminder:     { label: 'Appointment reminder',     active: false, text: 'Reminder: your {service} at {business} is tomorrow ({date}).' },
  reschedule:   { label: 'Reschedule confirmation',  active: false, text: 'Your {service} at {business} has been moved to {date}.' },
  cancellation: { label: 'Cancellation confirmation',active: false, text: 'Your {service} at {business} on {date} has been cancelled.' },
  formReminder: { label: 'Form reminder',            active: false, text: 'Hi {name}, please complete your intake forms before your {service} appointment.' },
  waitlist:     { label: 'Waitlist opening',         active: false, text: 'Good news {name} — a spot opened for {service} at {business}. Reply to book.' },
  membership:   { label: 'Membership reminder',      active: false, text: 'Hi {name}, your membership at {business} renews soon.' },
  followUp:     { label: 'Post-appointment follow-up',active: false, text: 'Thanks for visiting {business}, {name}! We hope you loved your {service}.' },
  custom:       { label: 'Custom message',            active: false, text: 'Hi {name}, a quick note from {business}.' },
};

export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
