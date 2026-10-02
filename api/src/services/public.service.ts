import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';
import { createBooking } from './booking.service';

/** Public service details for a booking link — by direct slug or id. */
export async function getPublicService(slugOrId: string) {
  const service = await prisma.service.findFirst({
    where: { OR: [{ directBookingSlug: slugOrId }, { id: slugOrId }], isActive: true },
    include: {
      vendor: { select: { id: true, businessName: true, city: true, status: true } },
      addOns: { where: { isActive: true } },
    },
  });
  if (!service || service.vendor.status !== 'ACTIVE') throw new NotFoundError('Service not available');
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price),
    durationMin: service.durationMin,
    vendorId: service.vendor.id,
    vendorName: service.vendor.businessName,
    city: service.vendor.city,
    addOns: service.addOns.map((a) => ({ id: a.id, name: a.name, price: Number(a.price), durationMin: a.durationMin })),
  };
}

/** Find-or-create a lightweight guest client by email, then book — no login needed. */
export async function createGuestBooking(data: {
  serviceId: string; vendorId: string; startsAt: string;
  guestName: string; guestEmail: string; guestPhone?: string;
  addOns?: { id: string; name: string; price: number; durationMin: number }[];
}) {
  if (!data.guestName?.trim() || !data.guestEmail?.trim()) throw new ValidationError('Name and email are required');
  const [firstName, ...rest] = data.guestName.trim().split(' ');

  let user = await prisma.user.findUnique({ where: { email: data.guestEmail.trim().toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: data.guestEmail.trim().toLowerCase(),
        phone: data.guestPhone?.trim() || null,
        firstName: firstName || 'Guest',
        lastName: rest.join(' ') || '',
        role: 'client',
        isVerified: false,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } }).catch(() => {});
  }

  const result = await createBooking(user.id, {
    vendorId: data.vendorId,
    serviceId: data.serviceId,
    startsAt: data.startsAt,
    addOns: data.addOns,
  });
  return { booking: result, guest: { id: user.id, email: user.email } };
}

/**
 * Vendor/staff quick-add: create a booking for an existing-or-new client from the
 * calendar. Finds the client by email (or creates a lightweight record), books
 * against the vendor's own service, and auto-confirms it (staff is booking in person).
 */
export async function createVendorQuickBooking(vendorId: string, data: {
  serviceId: string; startsAt: string; staffMemberId?: string;
  clientName: string; clientEmail: string; clientPhone?: string;
}) {
  if (!data.clientName?.trim() || !data.clientEmail?.trim()) throw new ValidationError('Client name and email are required');

  // Ensure the service belongs to this vendor
  const service = await prisma.service.findFirst({ where: { id: data.serviceId, vendorId }, select: { id: true } });
  if (!service) throw new NotFoundError('Service not found for this vendor');

  const [firstName, ...rest] = data.clientName.trim().split(' ');
  const email = data.clientEmail.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        phone: data.clientPhone?.trim() || null,
        firstName: firstName || 'Client',
        lastName: rest.join(' ') || '',
        role: 'client',
        isVerified: false,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } }).catch(() => {});
  }

  const result = await createBooking(user.id, {
    vendorId,
    serviceId: data.serviceId,
    startsAt: data.startsAt,
    staffMemberId: data.staffMemberId,
  });

  // Staff-created bookings are confirmed on the spot (unless slot was full → waitlisted).
  const bookingId = (result as any).booking?.id;
  if (bookingId && !(result as any).waitlisted) {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } }).catch(() => {});
  }

  return { ...result, client: { id: user.id, email: user.email, name: data.clientName.trim() } };
}
