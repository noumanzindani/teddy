import { Request, Response, NextFunction } from 'express';
import * as clinical from '../services/clinical.service';
import * as intake from '../services/intake.service';

// Resolve ":userId" — allow "me" to mean the authenticated user.
function resolveUserId(req: Request): string {
  const raw = req.params.userId;
  return raw === 'me' ? req.user!.sub : raw;
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await clinical.getClientProfile(resolveUserId(req));
    res.json({ data });
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await clinical.updateClientProfile(resolveUserId(req), req.body);
    res.json({ data: profile });
  } catch (err) { next(err); }
}

export async function getBookingReview(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await clinical.getBookingProtocolReview(req.params.bookingId);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function saveRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await clinical.saveServiceRecord(
      req.params.bookingId,
      req.user!.staffId ?? null,
      req.body,
    );
    res.json({ data: record });
  } catch (err) { next(err); }
}

export async function getRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await clinical.getServiceRecord(req.params.bookingId);
    res.json({ data: record });
  } catch (err) { next(err); }
}

// Pre-visit questionnaire (client submits at booking; emailed to all parties).
export async function submitIntake(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await intake.submitIntake(req.params.bookingId, req.body);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function getIntake(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await intake.getIntake(req.params.bookingId);
    res.json({ data: result });
  } catch (err) { next(err); }
}
