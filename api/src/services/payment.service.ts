import { v4 as uuid } from 'uuid';
import { prisma } from '../lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { logger } from '../lib/logger';

// All Stripe calls are mocked. Each mock point is clearly labelled.
// To activate real Stripe: set PAYMENT_MOCK_MODE=false and provide real keys in .env

const isMock = () => process.env.PAYMENT_MOCK_MODE !== 'false';

export async function createPaymentIntent(
  bookingId: string,
  amount: number,
  currency = 'usd',
  vendorStripeAccountId?: string
) {
  const amountCents = Math.round(amount * 100);
  const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.15');

  if (isMock()) {
    // MOCK: replace with stripe.paymentIntents.create({ amount: amountCents, currency, application_fee_amount: Math.round(amountCents * commissionRate), transfer_data: { destination: vendorStripeAccountId }, metadata: { bookingId } })
    const mockId = `pi_mock_${uuid().replace(/-/g, '').slice(0, 24)}`;
    const intent = { id: mockId, client_secret: `${mockId}_secret_mock`, status: 'requires_payment_method', amount: amountCents };
    logger.info(`[PAYMENT MOCK] createPaymentIntent bookingId=${bookingId} amount=${amount}`);

    await prisma.payment.create({
      data: {
        bookingId,
        stripePaymentIntentId: intent.id,
        amount,
        currency,
        status: PaymentStatus.PENDING,
      },
    });
    return intent;
  }

  // Real Stripe:
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const intent = await stripe.paymentIntents.create({ ... });
  throw new Error('Real Stripe not configured');
}

export async function capturePayment(paymentIntentId: string) {
  if (isMock()) {
    // MOCK: replace with stripe.paymentIntents.capture(paymentIntentId)
    logger.info(`[PAYMENT MOCK] capturePayment ${paymentIntentId}`);
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: PaymentStatus.CAPTURED, capturedAt: new Date() },
    });
    return { status: 'succeeded' };
  }
  throw new Error('Real Stripe not configured');
}

export async function refundPayment(bookingId: string, amountToRefund: number) {
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment) return;

  if (isMock()) {
    // MOCK: replace with stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId, amount: Math.round(amountToRefund * 100) })
    logger.info(`[PAYMENT MOCK] refund bookingId=${bookingId} amount=${amountToRefund}`);
    await prisma.payment.update({
      where: { bookingId },
      data: { status: PaymentStatus.REFUNDED, refundAmount: amountToRefund, refundedAt: new Date() },
    });
    return { status: 'refunded', amount: amountToRefund };
  }
  throw new Error('Real Stripe not configured');
}

export async function getPaymentStatus(bookingId: string) {
  return prisma.payment.findUnique({ where: { bookingId } });
}

export async function releasePayout(payoutId: string) {
  if (isMock()) {
    // MOCK: replace with stripe.transfers.create({ amount: Math.round(payout.netAmount * 100), currency: 'usd', destination: vendor.stripeAccountId })
    const transferId = `tr_mock_${uuid().replace(/-/g, '').slice(0, 24)}`;
    logger.info(`[PAYMENT MOCK] releasePayout payoutId=${payoutId} transferId=${transferId}`);
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'PAID', paidAt: new Date(), stripeTransferId: transferId },
    });
    return { transferId };
  }
  throw new Error('Real Stripe not configured');
}

export async function handleWebhookEvent(rawBody: Buffer | string, _signature: string) {
  let event: { type: string; data: { object: Record<string, unknown> } };

  if (isMock()) {
    // MOCK: replace with stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    event = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString()) as typeof event;
    logger.info(`[WEBHOOK MOCK] event type=${event.type}`);
  } else {
    throw new Error('Real Stripe not configured');
  }

  // Full booking confirmation logic runs regardless of mock/real
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as { id: string; metadata?: { bookingId?: string } };
      const bookingId = pi.metadata?.bookingId;
      if (bookingId) {
        const { confirmBooking } = await import('./booking.service');
        await capturePayment(pi.id);
        await confirmBooking(bookingId, 'system');
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as { metadata?: { bookingId?: string } };
      const bookingId = pi.metadata?.bookingId;
      if (bookingId) {
        await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED_CLIENT', cancelReason: 'Payment failed', cancelledAt: new Date() } });
      }
      break;
    }
  }
}
