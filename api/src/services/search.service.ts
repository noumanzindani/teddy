// SEARCH_LAYER: This service intentionally uses Prisma for full-text search.
// Replace the findMany calls with Elasticsearch client queries using the index mapping
// in SYSTEM_ARCHITECTURE.md §11 when adding ES.

import { Prisma, VendorStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCache, setCache } from '../lib/redis';

export async function searchVendors(params: {
  q?: string; city?: string; category?: string; minRating?: number;
  lat?: number; lng?: number; radius?: number; sort?: string; page: number; limit: number;
}) {
  const where: Prisma.VendorWhereInput = {
    status: VendorStatus.ACTIVE,
    ...(params.q && { businessName: { contains: params.q, mode: 'insensitive' } }),
    ...(params.city && { city: { contains: params.city, mode: 'insensitive' } }),
    ...(params.minRating && { avgRating: { gte: params.minRating } }),
  };

  const vendors = await prisma.vendor.findMany({
    where,
    include: { services: { where: { isActive: true }, take: 3, select: { name: true, category: true, price: true } } },
    orderBy: { avgRating: 'desc' },
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  });

  const total = await prisma.vendor.count({ where });
  return { vendors, meta: { total, page: params.page, limit: params.limit } };
}

export async function searchServices(params: {
  q?: string; category?: string; priceMax?: number; durationMax?: number; page: number; limit: number;
}) {
  const where: Prisma.ServiceWhereInput = {
    isActive: true,
    vendor: { status: VendorStatus.ACTIVE },
    ...(params.q && { name: { contains: params.q, mode: 'insensitive' } }),
    ...(params.category && { category: { contains: params.category, mode: 'insensitive' } }),
    ...(params.priceMax !== undefined && { price: { lte: params.priceMax } }),
    ...(params.durationMax !== undefined && { durationMin: { lte: params.durationMax } }),
  };

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { vendor: { select: { businessName: true, city: true, avgRating: true, coverUrl: true } } },
      orderBy: { vendor: { avgRating: 'desc' } },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.service.count({ where }),
  ]);

  return { services, meta: { total, page: params.page, limit: params.limit } };
}

export async function suggest(prefix: string) {
  const cacheKey = `suggest:${prefix.toLowerCase()}`;
  const cached = await getCache<string[]>(cacheKey);
  if (cached) return cached;

  const [vendorNames, serviceNames] = await Promise.all([
    prisma.vendor.findMany({
      where: { status: VendorStatus.ACTIVE, businessName: { startsWith: prefix, mode: 'insensitive' } },
      select: { businessName: true },
      take: 5,
    }),
    prisma.service.findMany({
      where: { isActive: true, name: { startsWith: prefix, mode: 'insensitive' } },
      select: { name: true },
      take: 5,
    }),
  ]);

  const suggestions = [
    ...new Set([
      ...vendorNames.map((v) => v.businessName),
      ...serviceNames.map((s) => s.name),
    ]),
  ].slice(0, 10);

  await setCache(cacheKey, suggestions, 600);
  return suggestions;
}
