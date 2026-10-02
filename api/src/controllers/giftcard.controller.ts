import { Request, Response, NextFunction } from 'express';
import * as giftcardService from '../services/giftcard.service';
import { resolveVendorId } from '../lib/actor';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    res.json({ data: await giftcardService.listGiftCards(vendorId) });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.status(201).json({ data: await giftcardService.createGiftCard(vendorId, req.body) });
  } catch (err) { next(err); }
}

export async function lookup(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    res.json({ data: await giftcardService.lookupGiftCard(String(req.params.code), vendorId) });
  } catch (err) { next(err); }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await giftcardService.deactivateGiftCard(req.params.id, vendorId) });
  } catch (err) { next(err); }
}

export async function send(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const { recipientEmail, message } = req.body as { recipientEmail: string; message?: string };
    res.json({ data: await giftcardService.sendGiftCard(req.params.id, vendorId, recipientEmail, message) });
  } catch (err) { next(err); }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await giftcardService.getGiftCardHistory(req.params.id, vendorId) });
  } catch (err) { next(err); }
}

export async function redeem(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const { code, amount } = req.body as { code: string; amount: number };
    res.json({ data: await giftcardService.redeemGiftCard(code, vendorId, Number(amount)) });
  } catch (err) { next(err); }
}
