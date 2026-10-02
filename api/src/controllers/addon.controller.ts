import { Request, Response, NextFunction } from 'express';
import * as addonService from '../services/addon.service';
import { resolveVendorId } from '../lib/actor';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await addonService.listAddOns(String(req.query.serviceId), req.query.activeOnly === 'true') });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.status(201).json({ data: await addonService.createAddOn(vendorId, req.body.serviceId, req.body) });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await addonService.updateAddOn(req.params.id, vendorId, req.body) });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await addonService.deleteAddOn(req.params.id, vendorId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}

// Vendor/admin flags a client as able/unable to self-book online.
export async function setClientAccess(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await addonService.setClientBookingAccess(req.params.clientId, !!req.body.canBookOnline) });
  } catch (err) { next(err); }
}
