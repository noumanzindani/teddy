import { Request, Response, NextFunction } from 'express';
import * as checkout from '../services/checkout.service';

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await checkout.previewCheckout(req.params.bookingId, req.body) });
  } catch (err) { next(err); }
}

export async function process(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await checkout.processCheckout(req.params.bookingId, req.body) });
  } catch (err) { next(err); }
}
