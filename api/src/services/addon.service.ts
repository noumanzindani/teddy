import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export interface AddOnInput {
  name: string;
  description?: string;
  price?: number;
  durationMin?: number;
  isActive?: boolean;
}

export async function listAddOns(serviceId: string, activeOnly = false) {
  return prisma.serviceAddOn.findMany({
    where: { serviceId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { name: 'asc' },
  });
}

async function assertServiceOwner(serviceId: string, vendorId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { vendorId: true } });
  if (!service) throw new NotFoundError('Service not found');
  if (service.vendorId !== vendorId) throw new ForbiddenError('Not your service');
}

export async function createAddOn(vendorId: string, serviceId: string, data: AddOnInput) {
  await assertServiceOwner(serviceId, vendorId);
  return prisma.serviceAddOn.create({
    data: {
      serviceId,
      name: data.name,
      description: data.description,
      price: data.price ?? 0,
      durationMin: data.durationMin ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

async function ownedAddOn(id: string, vendorId: string) {
  const addOn = await prisma.serviceAddOn.findUnique({ where: { id }, include: { service: { select: { vendorId: true } } } });
  if (!addOn) throw new NotFoundError('Add-on not found');
  if (addOn.service.vendorId !== vendorId) throw new ForbiddenError('Not your add-on');
  return addOn;
}

export async function updateAddOn(id: string, vendorId: string, data: AddOnInput) {
  await ownedAddOn(id, vendorId);
  const payload: Record<string, unknown> = {};
  for (const k of ['name', 'description'] as const) if (data[k] !== undefined) payload[k] = data[k];
  if (data.price !== undefined) payload.price = data.price;
  if (data.durationMin !== undefined) payload.durationMin = data.durationMin;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  return prisma.serviceAddOn.update({ where: { id }, data: payload });
}

export async function deleteAddOn(id: string, vendorId: string) {
  await ownedAddOn(id, vendorId);
  return prisma.serviceAddOn.delete({ where: { id } });
}

// ── Client online-booking access (vendor/admin flags a client) ────────────────
export async function setClientBookingAccess(clientId: string, canBookOnline: boolean) {
  const client = await prisma.user.findUnique({ where: { id: clientId }, select: { id: true, role: true } });
  if (!client) throw new NotFoundError('Client not found');
  return prisma.user.update({ where: { id: clientId }, data: { canBookOnline }, select: { id: true, canBookOnline: true } });
}
