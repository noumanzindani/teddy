import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function createIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const { bookingId } = req.body as { bookingId: string };
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { totalAmount: true, depositAmount: true, balanceAmount: true, clientId: true, vendor: { select: { stripeAccountId: true } } } });
    if (!booking) throw new NotFoundError('Booking not found');

    // Charge the deposit up front when the service uses one; otherwise the full total.
    const upfront = Number(booking.balanceAmount) > 0 ? Number(booking.depositAmount) : Number(booking.totalAmount);

    const intent = await paymentService.createPaymentIntent(
      bookingId,
      upfront,
      'usd',
      booking.vendor.stripeAccountId ?? undefined
    );
    res.status(201).json({ data: intent });
  } catch (err) { next(err); }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentIntentId } = req.body as { paymentIntentId: string };
    const result = await paymentService.capturePayment(paymentIntentId);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function refund(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount } = req.body as { amount: number };
    const result = await paymentService.refundPayment(req.params.bookingId, amount);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await paymentService.getPaymentStatus(req.params.bookingId);
    res.json({ data: payment });
  } catch (err) { next(err); }
}

export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string ?? '';
    await paymentService.handleWebhookEvent(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err) { next(err); }
}
