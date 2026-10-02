import { Request, Response, NextFunction } from 'express';
import * as formService from '../services/form.service';
import { resolveVendorId } from '../lib/actor';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    res.json({ data: await formService.listForms(vendorId) });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.status(201).json({ data: await formService.createForm(vendorId, req.body) });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await formService.updateForm(req.params.id, vendorId, req.body) });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await formService.deleteForm(req.params.id, vendorId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}

export async function forService(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await formService.getFormsForService(String(req.params.serviceId)) });
  } catch (err) { next(err); }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json({ data: await formService.submitResponse(req.params.id, req.user!.sub, req.body) });
  } catch (err) { next(err); }
}

export async function responses(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await formService.listResponses(vendorId, {
      formId: req.query.formId ? String(req.query.formId) : undefined,
      clientId: req.query.clientId ? String(req.query.clientId) : undefined,
      bookingId: req.query.bookingId ? String(req.query.bookingId) : undefined,
    }) });
  } catch (err) { next(err); }
}

export async function myResponses(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await formService.getClientResponses(req.user!.sub) });
  } catch (err) { next(err); }
}

export async function myForms(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await formService.getClientForms(req.user!.sub) });
  } catch (err) { next(err); }
}

export async function bookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await formService.getBookingFormsStatus(String(req.params.bookingId)) });
  } catch (err) { next(err); }
}
