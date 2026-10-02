import { Request, Response, NextFunction } from 'express';
import * as engagement from '../services/engagement.service';

export async function myReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await engagement.getReferrals(req.user!.sub) });
  } catch (err) { next(err); }
}

export async function myProducts(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await engagement.getClientProducts(req.user!.sub) });
  } catch (err) { next(err); }
}

export async function requestReview(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await engagement.sendReviewRequest(req.params.bookingId) });
  } catch (err) { next(err); }
}
