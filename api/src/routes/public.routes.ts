import { Router, Request, Response, NextFunction } from 'express';
import * as publicService from '../services/public.service';

// Unauthenticated booking link — clients can schedule without an account.
const router = Router();

router.get('/services/:slugOrId', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await publicService.getPublicService(req.params.slugOrId) }); }
  catch (err) { next(err); }
});

router.post('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ data: await publicService.createGuestBooking(req.body) }); }
  catch (err) { next(err); }
});

export default router;
