import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import {
  checkAllergiesAgainstProducts,
  suggestAlternatives,
  Allergy,
  ProductLike,
} from '../lib/allergyCheck';

// ── Client profile ───────────────────────────────────────────────────────────

export async function getClientProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
  });
  if (!user) throw new NotFoundError('Client not found');

  let profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) {
    // Lazily create an empty profile so the template always has something to show/edit.
    profile = await prisma.clientProfile.create({ data: { userId } });
  }
  return { user, profile };
}

export interface ClientProfileInput {
  medicalHistory?: string;
  medicalConditions?: string[];
  employerName?: string;
  occupation?: string;
  currentProducts?: { name: string; brand?: string }[];
  allergies?: Allergy[];
  notes?: string;
  storeCredit?: number;
}

export async function updateClientProfile(userId: string, data: ClientProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new NotFoundError('Client not found');

  const payload: Record<string, unknown> = {};
  if (data.medicalHistory !== undefined) payload.medicalHistory = data.medicalHistory;
  if (data.medicalConditions !== undefined) payload.medicalConditions = data.medicalConditions;
  if (data.employerName !== undefined) payload.employerName = data.employerName;
  if (data.occupation !== undefined) payload.occupation = data.occupation;
  if (data.currentProducts !== undefined) payload.currentProducts = data.currentProducts;
  if (data.allergies !== undefined) payload.allergies = data.allergies;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.storeCredit !== undefined) payload.storeCredit = data.storeCredit;

  return prisma.clientProfile.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  });
}

// ── Pre-service protocol review + allergy check ──────────────────────────────

/**
 * For a booking, return the client's medical/allergy summary, the service's planned
 * product protocol with any allergy conflicts flagged, and safer alternatives the
 * staff member can swap in before starting.
 */
export async function getBookingProtocolReview(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      service: { select: { id: true, name: true, durationMin: true, vendorId: true } },
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');

  const profile = await prisma.clientProfile.findUnique({ where: { userId: booking.clientId } });
  const allergies = ((profile?.allergies as unknown) as Allergy[]) ?? [];

  // Planned protocol products for the service.
  const protocol = await prisma.serviceProduct.findMany({
    where: { serviceId: booking.serviceId },
    include: { product: true },
    orderBy: { step: 'asc' },
  });
  const protocolProducts: ProductLike[] = protocol.map((sp) => ({
    id: sp.product.id,
    name: sp.product.name,
    brand: sp.product.brand,
    ingredients: ((sp.product.ingredients as unknown) as string[]) ?? [],
  }));

  const flags = checkAllergiesAgainstProducts(allergies, protocolProducts);
  const flaggedIds = new Set(flags.map((f) => f.product.id));

  // Prior visit history for this client at this vendor: past completed bookings
  // with their service record (notes + products used). Gives the provider context.
  const pastBookings = await prisma.booking.findMany({
    where: {
      clientId: booking.clientId,
      vendorId: booking.service.vendorId,
      id: { not: booking.id },
      status: { in: ['COMPLETED', 'IN_PROGRESS'] },
    },
    include: { service: { select: { name: true } } },
    orderBy: { startsAt: 'desc' },
    take: 10,
  });
  const records = await prisma.serviceRecord.findMany({
    where: { bookingId: { in: pastBookings.map((b) => b.id) } },
  });
  const recordByBooking = new Map(records.map((r) => [r.bookingId, r]));
  const history = pastBookings.map((b) => {
    const rec = recordByBooking.get(b.id);
    return {
      bookingId: b.id,
      date: b.startsAt,
      serviceName: b.service.name,
      status: b.status,
      notes: (rec?.notes as string | null) ?? null,
      productsUsed: ((rec?.productsUsed as unknown) as { name: string; qty?: number }[]) ?? [],
    };
  });

  // Candidate alternatives: vendor's professional products not already in protocol.
  const others = await prisma.product.findMany({
    where: {
      vendorId: booking.service.vendorId,
      type: { in: ['professional', 'both'] },
      isActive: true,
      id: { notIn: protocolProducts.map((p) => p.id) },
    },
  });
  const alternatives = suggestAlternatives(
    allergies,
    others.map((p) => ({ id: p.id, name: p.name, brand: p.brand, ingredients: ((p.ingredients as unknown) as string[]) ?? [] })),
    new Set(protocolProducts.map((p) => p.id)),
  );

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      startsAt: booking.startsAt,
      serviceName: booking.service.name,
      durationMin: booking.service.durationMin,
    },
    client: booking.client,
    profile: profile ?? null,
    allergies,
    protocol: protocolProducts.map((p) => ({
      ...p,
      flagged: flaggedIds.has(p.id),
      conflicts: flags.find((f) => f.product.id === p.id)?.conflicts ?? [],
    })),
    hasConflicts: flags.length > 0,
    alternatives,
    history,
  };
}

// ── Post-service record ──────────────────────────────────────────────────────

export interface ServiceRecordInput {
  productsUsed?: { productId?: string; name: string; qty?: number }[];
  notes?: string;
  reactions?: string;
  recommendations?: string;
}

export async function saveServiceRecord(
  bookingId: string,
  staffMemberId: string | null,
  data: ServiceRecordInput,
) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
  if (!booking) throw new NotFoundError('Booking not found');

  return prisma.serviceRecord.upsert({
    where: { bookingId },
    update: {
      productsUsed: (data.productsUsed ?? []) as never,
      notes: data.notes,
      reactions: data.reactions,
      recommendations: data.recommendations,
      staffMemberId,
    },
    create: {
      bookingId,
      staffMemberId,
      productsUsed: (data.productsUsed ?? []) as never,
      notes: data.notes,
      reactions: data.reactions,
      recommendations: data.recommendations,
    },
  });
}

export async function getServiceRecord(bookingId: string) {
  return prisma.serviceRecord.findUnique({ where: { bookingId } });
}
