import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { sendMailToMany } from '../lib/mailer';
import { createNotification } from './notification.service';
import { Allergy } from '../lib/allergyCheck';
import { logger } from '../lib/logger';

export interface IntakeInput {
  skinType?: string;
  allergens?: string[];        // free-text allergy names
  products?: string[];         // products the client currently uses
  goals?: string;
  notes?: string;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

function buildEmail(clientName: string, serviceName: string, when: Date, intake: IntakeInput): string {
  const row = (label: string, val: string) => val
    ? `<tr><td style="padding:6px 12px;color:#6B6B62;font-size:13px;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#1B1B16;font-size:14px">${val}</td></tr>` : '';
  const list = (arr?: string[]) => (arr && arr.length ? arr.map(esc).join(', ') : '—');
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
    <div style="background:#1B1B16;padding:18px 20px;border-radius:12px 12px 0 0">
      <span style="color:#E4C654;font-weight:bold;font-size:18px">TEDDY</span>
      <span style="color:#fff;font-size:13px;margin-left:8px">Pre-Visit Questionnaire</span>
    </div>
    <div style="border:1px solid #E8E8E4;border-top:none;border-radius:0 0 12px 12px;padding:20px">
      <p style="color:#1B1B16;font-size:15px;margin:0 0 4px"><b>${esc(clientName)}</b> — ${esc(serviceName)}</p>
      <p style="color:#6B6B62;font-size:13px;margin:0 0 16px">${when.toUTCString()}</p>
      <table style="border-collapse:collapse;width:100%;background:#FAFAF8;border-radius:8px">
        ${row('Skin type', esc(intake.skinType))}
        ${row('⚠ Allergies', list(intake.allergens))}
        ${row('Products used', list(intake.products))}
        ${row('Goals', esc(intake.goals))}
        ${row('Notes', esc(intake.notes))}
      </table>
      <p style="color:#A8A89F;font-size:12px;margin:16px 0 0">Sent to the client, the salon and the assigned staff member so everyone is prepared for the visit.</p>
    </div>
  </div>`;
}

/**
 * Save a booking's pre-visit questionnaire, merge declared allergies into the
 * client's profile (so the staff safety check picks them up), and email the form
 * to the client, the salon owner and the assigned staff member at their account emails.
 */
export async function submitIntake(bookingId: string, data: IntakeInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, email: true, firstName: true, lastName: true } },
      service: { select: { name: true } },
      vendor: { select: { businessName: true, owner: { select: { email: true } } } },
      staffMember: { select: { user: { select: { email: true } } } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const submittedAt = new Date();
  const intakeForm = {
    skinType: data.skinType ?? '',
    allergens: data.allergens ?? [],
    products: data.products ?? [],
    goals: data.goals ?? '',
    notes: data.notes ?? '',
    submittedAt: submittedAt.toISOString(),
  };

  await prisma.booking.update({ where: { id: bookingId }, data: { intakeForm: intakeForm as never } });

  // Merge declared allergies into the client profile (dedupe by name), so the
  // pre-service safety check compares them against the product ingredients.
  if (data.allergens?.length) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId: booking.clientId } });
    const existing = ((profile?.allergies as unknown) as Allergy[]) ?? [];
    const names = new Set(existing.map((a) => a.name.toLowerCase()));
    const merged = [...existing];
    for (const name of data.allergens) {
      if (name && !names.has(name.toLowerCase())) merged.push({ name, note: 'From pre-visit questionnaire' });
    }
    const currentProducts = ((profile?.currentProducts as unknown) as { name: string }[]) ?? [];
    const prodNames = new Set(currentProducts.map((p) => p.name.toLowerCase()));
    const mergedProducts = [...currentProducts];
    for (const p of data.products ?? []) if (p && !prodNames.has(p.toLowerCase())) mergedProducts.push({ name: p });
    await prisma.clientProfile.upsert({
      where: { userId: booking.clientId },
      update: { allergies: merged as never, currentProducts: mergedProducts as never },
      create: { userId: booking.clientId, allergies: merged as never, currentProducts: mergedProducts as never },
    });
  }

  // Email the form to all three parties at their account (signup) emails.
  const clientName = `${booking.client.firstName} ${booking.client.lastName}`;
  const html = buildEmail(clientName, booking.service.name, booking.startsAt, intakeForm);
  const subject = `Pre-visit questionnaire — ${clientName} · ${booking.service.name}`;
  const mail = await sendMailToMany(
    [booking.client.email, booking.vendor.owner.email, booking.staffMember?.user.email],
    subject,
    html,
  );
  logger.info(`[INTAKE] booking=${bookingId} emailed=${mail.recipients.length} delivered=${mail.delivered} mock=${mail.mock}`);

  // Also drop an in-app notification for the salon owner + staff.
  const vendorOwnerId = (await prisma.vendor.findFirst({ where: { id: booking.vendorId }, select: { ownerId: true } }))?.ownerId;
  if (vendorOwnerId) await createNotification(vendorOwnerId, 'Pre-visit questionnaire received', `${clientName} completed the form for ${booking.service.name}.`, 'intake', `/bookings`);

  return { intakeForm, email: mail };
}

export async function getIntake(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { intakeForm: true, client: { select: { firstName: true, lastName: true } }, service: { select: { name: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  return { intakeForm: booking.intakeForm ?? null, client: booking.client, serviceName: booking.service.name };
}
