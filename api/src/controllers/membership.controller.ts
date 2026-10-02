import { Request, Response, NextFunction } from 'express';
import * as membershipService from '../services/membership.service';
import { resolveVendorId } from '../lib/actor';

export async function listPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    res.json({ data: await membershipService.listPlans(vendorId, req.query.activeOnly === 'true') });
  } catch (err) { next(err); }
}

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.status(201).json({ data: await membershipService.createPlan(vendorId, req.body) });
  } catch (err) { next(err); }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await membershipService.updatePlan(req.params.id, vendorId, req.body) });
  } catch (err) { next(err); }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await membershipService.deletePlan(req.params.id, vendorId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}

export async function listSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    res.json({ data: await membershipService.listSubscriptions(vendorId) });
  } catch (err) { next(err); }
}

export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const { clientId, planId } = req.body;
    res.status(201).json({ data: await membershipService.subscribe(clientId, vendorId, planId) });
  } catch (err) { next(err); }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await membershipService.cancelSubscription(req.params.id, vendorId) });
  } catch (err) { next(err); }
}

export async function setStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const status = (req.body as { status?: string }).status === 'paused' ? 'paused' : 'active';
    res.json({ data: await membershipService.setSubscriptionStatus(req.params.id, vendorId, status) });
  } catch (err) { next(err); }
}
