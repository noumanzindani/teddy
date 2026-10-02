import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export interface FormField { id: string; label: string; type: 'text' | 'textarea' | 'checkbox' | 'select'; required?: boolean; options?: string[]; }
export interface FormInput {
  name: string;
  description?: string;
  fields?: FormField[];
  assignedServiceIds?: string[];
  sendAfterBooking?: boolean;
  requiresSignature?: boolean;
  isActive?: boolean;
}

// ── Form builder (vendor) ─────────────────────────────────────────────────────
export async function listForms(vendorId: string) {
  return prisma.form.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { responses: true } } },
  });
}

export async function createForm(vendorId: string, data: FormInput) {
  return prisma.form.create({
    data: {
      vendorId,
      name: data.name,
      description: data.description,
      fields: (data.fields ?? []) as never,
      assignedServiceIds: (data.assignedServiceIds ?? []) as never,
      sendAfterBooking: data.sendAfterBooking ?? true,
      requiresSignature: data.requiresSignature ?? false,
      isActive: data.isActive ?? true,
    },
  });
}

async function ownForm(id: string, vendorId: string) {
  const form = await prisma.form.findUnique({ where: { id }, select: { vendorId: true } });
  if (!form) throw new NotFoundError('Form not found');
  if (form.vendorId !== vendorId) throw new ForbiddenError('Not your form');
}

export async function updateForm(id: string, vendorId: string, data: FormInput) {
  await ownForm(id, vendorId);
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.fields !== undefined) payload.fields = data.fields;
  if (data.assignedServiceIds !== undefined) payload.assignedServiceIds = data.assignedServiceIds;
  if (data.sendAfterBooking !== undefined) payload.sendAfterBooking = data.sendAfterBooking;
  if (data.requiresSignature !== undefined) payload.requiresSignature = data.requiresSignature;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  return prisma.form.update({ where: { id }, data: payload });
}

export async function deleteForm(id: string, vendorId: string) {
  await ownForm(id, vendorId);
  return prisma.form.update({ where: { id }, data: { isActive: false } });
}

// Forms that apply to a service (assigned to it, or vendor-wide if unassigned).
export async function getFormsForService(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { vendorId: true } });
  if (!service) return [];
  const forms = await prisma.form.findMany({ where: { vendorId: service.vendorId, isActive: true } });
  return forms.filter((f) => {
    const ids = (f.assignedServiceIds as unknown as string[]) ?? [];
    return ids.length === 0 || ids.includes(serviceId);
  });
}

/** Forms assigned to a booking's service + whether the client has signed/submitted them. */
export async function getBookingFormsStatus(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, serviceId: true },
  });
  if (!booking) return { forms: [], allSigned: true };
  const forms = await getFormsForService(booking.serviceId);
  const responses = await prisma.formResponse.findMany({
    where: { clientId: booking.clientId, formId: { in: forms.map((f) => f.id) } },
  });
  const byForm = new Map(responses.map((r) => [r.formId, r]));
  const list = forms.map((f) => {
    const r = byForm.get(f.id);
    const submitted = !!r;
    const signed = f.requiresSignature ? !!r?.signedAt : submitted;
    return { id: f.id, name: f.name, requiresSignature: f.requiresSignature, submitted, signed };
  });
  return { forms: list, allSigned: list.every((f) => f.signed) };
}

// ── Responses ─────────────────────────────────────────────────────────────────
export async function submitResponse(formId: string, clientId: string, data: { bookingId?: string; answers: Record<string, unknown>; signedName?: string }) {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) throw new NotFoundError('Form not found');
  return prisma.formResponse.create({
    data: {
      formId,
      clientId,
      bookingId: data.bookingId,
      answers: (data.answers ?? {}) as never,
      signedName: data.signedName,
      signedAt: form.requiresSignature && data.signedName ? new Date() : null,
    },
  });
}

export async function listResponses(vendorId: string, filter: { formId?: string; clientId?: string; bookingId?: string } = {}) {
  return prisma.formResponse.findMany({
    where: {
      form: { vendorId },
      ...(filter.formId ? { formId: filter.formId } : {}),
      ...(filter.clientId ? { clientId: filter.clientId } : {}),
      ...(filter.bookingId ? { bookingId: filter.bookingId } : {}),
    },
    include: { form: { select: { name: true, fields: true, requiresSignature: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getClientResponses(clientId: string) {
  return prisma.formResponse.findMany({
    where: { clientId },
    include: { form: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Forms the client needs to (or already did) complete, derived from their
 * upcoming/active bookings. Each entry carries the form definition, the booking
 * it belongs to, and whether a response has been submitted.
 */
export async function getClientForms(clientId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      clientId,
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
    },
    include: { service: { select: { id: true, name: true, vendorId: true } } },
    orderBy: { startsAt: 'desc' },
    take: 20,
  });

  const responses = await prisma.formResponse.findMany({ where: { clientId } });
  const submitted = new Set(responses.map((r) => `${r.formId}:${r.bookingId ?? ''}`));

  const out: {
    formId: string; name: string; description: string | null; fields: unknown;
    requiresSignature: boolean; bookingId: string; serviceName: string; date: Date; submitted: boolean;
  }[] = [];
  const seen = new Set<string>();

  for (const b of bookings) {
    const forms = await prisma.form.findMany({ where: { vendorId: b.service.vendorId, isActive: true } });
    for (const f of forms) {
      const ids = (f.assignedServiceIds as unknown as string[]) ?? [];
      if (ids.length && !ids.includes(b.service.id)) continue;
      const key = `${f.id}:${b.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        formId: f.id,
        name: f.name,
        description: f.description,
        fields: f.fields,
        requiresSignature: f.requiresSignature,
        bookingId: b.id,
        serviceName: b.service.name,
        date: b.startsAt,
        submitted: submitted.has(`${f.id}:${b.id}`) || submitted.has(`${f.id}:`),
      });
    }
  }
  return out;
}
