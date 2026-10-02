import { Request, Response, NextFunction } from 'express';
import * as assistant from '../services/assistant.service';
import { resolveVendorId } from '../lib/actor';

export async function ask(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    res.json({ data: await assistant.askAssistant(vendorId, String(req.body.question ?? '')) });
  } catch (err) { next(err); }
}

export async function suggestions(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: assistant.getSuggestions() });
  } catch (err) { next(err); }
}
