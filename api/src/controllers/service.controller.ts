import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { delCache } from '../lib/redis';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, category, vendorId, priceMax, durationMax, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: Prisma.ServiceWhereInput = {
      isActive: true,
      ...(q && { name: { contains: q, mode: 'insensitive' } }),
      ...(category && { category: { contains: category, mode: 'insensitive' } }),
      ...(vendorId && { vendorId }),
      ...(priceMax && { price: { lte: parseFloat(priceMax) } }),
      ...(durationMax && { durationMin: { lte: parseInt(durationMax) } }),
    };
    const p = parseInt(page), l = parseInt(limit);
    const [services, total] = await Promise.all([
      prisma.service.findMany({ where, include: { vendor: { select: { businessName: true, avgRating: true, city: true } } }, skip: (p - 1) * l, take: l }),
      prisma.service.count({ where }),
    ]);
    res.json({ data: services, meta: { total, page: p, limit: l, hasMore: p * l < total } });
  } catch (err) { next(err); }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const cats = await prisma.service.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });
    res.json({ data: cats.map((c) => c.category) });
  } catch (err) { next(err); }
}

export async function listByVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const services = await prisma.service.findMany({
      where: { vendorId: req.params.vendorId, isActive: true },
      orderBy: { category: 'asc' },
    });
    res.json({ data: services });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!vendor) throw new NotFoundError('Vendor not found');
    const service = await prisma.service.create({ data: { vendorId: vendor.id, ...req.body } });
    await delCache(`vendor:${vendor.id}:profile`);
    res.status(201).json({ data: service });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id }, include: { vendor: { select: { ownerId: true } } } });
    if (!service) throw new NotFoundError('Service not found');
    if (service.vendor.ownerId !== req.user!.sub && req.user!.role !== 'admin') throw new ForbiddenError();
    const updated = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
    await delCache(`vendor:${service.vendorId}:profile`);
    res.json({ data: updated });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id }, include: { vendor: { select: { ownerId: true } } } });
    if (!service) throw new NotFoundError('Service not found');
    if (service.vendor.ownerId !== req.user!.sub && req.user!.role !== 'admin') throw new ForbiddenError();
    await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
    await delCache(`vendor:${service.vendorId}:profile`);
    res.status(204).send();
  } catch (err) { next(err); }
}
