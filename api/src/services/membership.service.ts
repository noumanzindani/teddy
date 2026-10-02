import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../lib/errors';

// ── Plans ────────────────────────────────────────────────────────────────────

export interface PlanInput {
  name: string;
  description?: string;
  price?: number;
  interval?: 'monthly' | 'yearly';
  benefits?: string[];
  priorityBooking?: boolean;
  eligibleServiceIds?: string[];
  isActive?: boolean;
}

export async function listPlans(vendorId: string, activeOnly = false) {
  return prisma.membershipPlan.findMany({
    where: { vendorId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { price: 'asc' },
    include: { _count: { select: { subscriptions: true } } },
  });
}

export async function createPlan(vendorId: string, data: PlanInput) {
  return prisma.membershipPlan.create({
    data: {
      vendorId,
      name: data.name,
      description: data.description,
      price: data.price ?? 0,
      interval: (data.interval ?? 'monthly') as never,
      benefits: (data.benefits ?? []) as never,
      priorityBooking: data.priorityBooking ?? false,
      eligibleServiceIds: (data.eligibleServiceIds ?? []) as never,
      isActive: data.isActive ?? true,
    },
  });
}

async function assertPlanOwner(id: string, vendorId: string) {
  const plan = await prisma.membershipPlan.findUnique({ where: { id }, select: { vendorId: true } });
  if (!plan) throw new NotFoundError('Plan not found');
  if (plan.vendorId !== vendorId) throw new ForbiddenError('Not your plan');
}

export async function updatePlan(id: string, vendorId: string, data: PlanInput) {
  await assertPlanOwner(id, vendorId);
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.price !== undefined) payload.price = data.price;
  if (data.interval !== undefined) payload.interval = data.interval;
  if (data.benefits !== undefined) payload.benefits = data.benefits;
  if (data.priorityBooking !== undefined) payload.priorityBooking = data.priorityBooking;
  if (data.eligibleServiceIds !== undefined) payload.eligibleServiceIds = data.eligibleServiceIds;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  return prisma.membershipPlan.update({ where: { id }, data: payload });
}

/** Freeze (pause) or resume a subscription. */
export async function setSubscriptionStatus(id: string, vendorId: string, status: 'active' | 'paused') {
  const sub = await prisma.subscription.findUnique({ where: { id }, select: { vendorId: true } });
  if (!sub) throw new NotFoundError('Subscription not found');
  if (sub.vendorId !== vendorId) throw new ForbiddenError('Not your subscription');
  return prisma.subscription.update({ where: { id }, data: { status: status as never } });
}

export async function deletePlan(id: string, vendorId: string) {
  await assertPlanOwner(id, vendorId);
  return prisma.membershipPlan.update({ where: { id }, data: { isActive: false } });
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function listSubscriptions(vendorId: string) {
  return prisma.subscription.findMany({
    where: { vendorId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** The client's active subscription for a vendor (if any) — drives booking priority. */
export async function getActiveSubscription(clientId: string, vendorId: string) {
  return prisma.subscription.findFirst({
    where: { clientId, vendorId, status: 'active' as never },
    include: { plan: true },
  });
}

export async function subscribe(clientId: string, vendorId: string, planId: string) {
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.vendorId !== vendorId) throw new NotFoundError('Plan not found');
  const existing = await getActiveSubscription(clientId, vendorId);
  if (existing) throw new ConflictError('Client already has an active subscription');
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + (plan.interval === 'yearly' ? 12 : 1));
  return prisma.subscription.create({
    data: { clientId, vendorId, planId, currentPeriodEnd: periodEnd },
    include: { plan: true },
  });
}

export async function cancelSubscription(id: string, vendorId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id }, select: { vendorId: true } });
  if (!sub) throw new NotFoundError('Subscription not found');
  if (sub.vendorId !== vendorId) throw new ForbiddenError('Not your subscription');
  return prisma.subscription.update({
    where: { id },
    data: { status: 'cancelled' as never, cancelledAt: new Date() },
  });
}
