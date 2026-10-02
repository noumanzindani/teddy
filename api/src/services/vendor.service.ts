import { Prisma, VendorStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCache, setCache, delCache } from '../lib/redis';
import { NotFoundError, ConflictError } from '../lib/errors';
import { addDays } from 'date-fns';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function listVendors(params: {
  q?: string; city?: string; category?: string; minRating?: number;
  lat?: number; lng?: number; radius?: number; sort?: string; page: number; limit: number;
}) {
  const where: Prisma.VendorWhereInput = {
    status: VendorStatus.ACTIVE,
    ...(params.q && { businessName: { contains: params.q, mode: 'insensitive' } }),
    ...(params.city && { city: { contains: params.city, mode: 'insensitive' } }),
    ...(params.minRating && { avgRating: { gte: params.minRating } }),
    ...(params.category && {
      services: { some: { category: { contains: params.category, mode: 'insensitive' }, isActive: true } },
    }),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: { services: { where: { isActive: true }, take: 3 } },
      orderBy:
        params.sort === 'rating'
          ? { avgRating: 'desc' }
          : params.sort === 'newest'
          ? { createdAt: 'desc' }
          : { avgRating: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.vendor.count({ where }),
  ]);

  let results: typeof vendors & { distanceKm?: number }[] = vendors as typeof results;

  if (params.lat !== undefined && params.lng !== undefined) {
    results = vendors
      .map((v) => ({
        ...v,
        distanceKm:
          v.lat != null && v.lng != null
            ? haversineKm(params.lat!, params.lng!, v.lat, v.lng)
            : null,
      }))
      .filter(
        (v) =>
          params.radius == null || v.distanceKm == null || v.distanceKm <= params.radius
      )
      .sort((a, b) =>
        params.sort === 'distance'
          ? (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
          : 0
      ) as typeof results;
  }

  return { vendors: results, meta: { total, page: params.page, limit: params.limit, hasMore: params.page * params.limit < total } };
}

export async function getVendorById(id: string) {
  const cached = await getCache<object>(`vendor:${id}:profile`);
  if (cached) return cached;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      services: { where: { isActive: true } },
      staffMembers: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
  });
  if (!vendor) throw new NotFoundError('Vendor not found');

  await setCache(`vendor:${id}:profile`, vendor, 3600);
  return vendor;
}

export async function getMyVendor(ownerId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { ownerId } });
  if (!vendor) throw new NotFoundError('Vendor profile not found');
  return vendor;
}

export async function updateMyVendor(ownerId: string, data: Record<string, unknown>) {
  const vendor = await prisma.vendor.findUnique({ where: { ownerId } });
  if (!vendor) throw new NotFoundError('Vendor profile not found');
  const updated = await prisma.vendor.update({ where: { id: vendor.id }, data });
  await delCache(`vendor:${vendor.id}:profile`);
  return updated;
}

export async function applyForVendor(userId: string, data: {
  businessName: string; ownerName: string; phone: string; city: string;
  address?: string; category?: string; bio?: string; monthlyRevenue?: number; staffCount?: number;
}) {
  const existing = await prisma.vendorApplication.findUnique({ where: { userId } });
  if (existing) throw new ConflictError('Application already submitted');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const application = await prisma.vendorApplication.create({
    data: { userId, email: user?.email ?? '', ...data },
  });
  return application;
}

export async function inviteStaff(vendorId: string, email: string) {
  const existing = await prisma.vendorInvite.findFirst({
    where: { vendorId, email, accepted: false, expiresAt: { gt: new Date() } },
  });
  if (existing) throw new ConflictError('Invite already pending for this email');

  const invite = await prisma.vendorInvite.create({
    data: { vendorId, email, expiresAt: addDays(new Date(), 7) },
  });
  // MOCK: replace with notificationService.sendEmail(email, 'You have been invited', ...)
  return invite;
}

export async function getVendorDashboard(vendorId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

  // Start of week (Monday)
  const day = todayStart.getDay(); // 0 = Sunday
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const weekStart = new Date(todayStart.getTime() + diffToMonday * 86_400_000);
  const weekEnd   = new Date(weekStart.getTime() + 7 * 86_400_000);

  const bookingInclude = {
    client:      { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
    service:     { select: { name: true, durationMin: true } },
    staffMember: { include: { user: { select: { firstName: true, lastName: true } } } },
  } as const;

  const [todayBookings, weekBookings, pendingPayoutsAgg] = await Promise.all([
    prisma.booking.findMany({
      where:   { vendorId, startsAt: { gte: todayStart, lt: todayEnd } },
      include: bookingInclude,
      orderBy: { startsAt: 'asc' },
    }),
    prisma.booking.findMany({
      where:   { vendorId, startsAt: { gte: weekStart, lt: weekEnd } },
      include: bookingInclude,
      orderBy: { startsAt: 'asc' },
    }),
    prisma.payout.aggregate({
      where: { vendorId, status: 'PENDING' },
      _sum:  { grossAmount: true },
    }),
  ]);

  return {
    todayBookings,
    weekBookings,
    pendingPayouts: Number(pendingPayoutsAgg._sum.grossAmount ?? 0),
  };
}

export async function getVendorBookings(vendorId: string, page = 1, limit = 20) {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { vendorId },
      include: {
        client: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
        service: { select: { name: true, category: true, durationMin: true } },
        staffMember: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where: { vendorId } }),
  ]);
  return { bookings, meta: { total, page, limit, hasMore: page * limit < total } };
}

export async function getVendorClients(vendorId: string) {
  // Any client who has ever booked with this vendor (not just completed visits),
  // so the vendor can manage/flag them before their first appointment too.
  const clientIds = await prisma.booking.findMany({
    where: { vendorId },
    select: { clientId: true },
    distinct: ['clientId'],
  });
  const ids = clientIds.map((c) => c.clientId);
  const clients = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, pointsBalance: true, tier: true, canBookOnline: true, createdAt: true },
  });
  return clients;
}

export async function getVendorStaff(vendorId: string) {
  return prisma.staffMember.findMany({
    where: { vendorId, isActive: true },
    include: { user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } }, availability: true },
  });
}

export async function getVendorPayouts(vendorId: string) {
  return prisma.payout.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });
}
