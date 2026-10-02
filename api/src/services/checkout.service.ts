import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { lookupGiftCard, redeemGiftCard } from './giftcard.service';

export interface CheckoutInput {
  retailItems?: { productId: string; quantity: number }[];
  giftCardCode?: string;
  giftCardAmount?: number; // optional cap on how much of the card to apply
  creditApplied?: number;  // store credit to apply (staff-selected, capped to available)
  tip?: number;
}

function pad(n: number, w: number) { return n.toString().padStart(w, '0'); }

async function nextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const count = await prisma.invoice.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } });
  return `INV-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1, 2)}${pad(now.getUTCDate(), 2)}-${pad(count + 1, 4)}`;
}

async function loadContext(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { select: { name: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  const profile = await prisma.clientProfile.findUnique({ where: { userId: booking.clientId } });
  return { booking, storeCredit: Number(profile?.storeCredit ?? 0) };
}

async function resolveRetail(vendorId: string, items: { productId: string; quantity: number }[]) {
  if (!items.length) return [] as { productId: string; name: string; quantity: number; unitPrice: number; amount: number }[];
  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, vendorId } });
  const byId = new Map(products.map((p) => [p.id, p]));
  return items
    .filter((i) => byId.has(i.productId) && i.quantity > 0)
    .map((i) => {
      const p = byId.get(i.productId)!;
      const unitPrice = Number(p.price);
      return { productId: p.id, name: p.name, quantity: i.quantity, unitPrice, amount: unitPrice * i.quantity };
    });
}

interface Totals {
  serviceSubtotal: number; extraTimeCost: number; retailSubtotal: number; tip: number;
  grossTotal: number; depositPaid: number; giftCardApplied: number; creditApplied: number; amountDue: number;
  retail: { productId: string; name: string; quantity: number; unitPrice: number; amount: number }[];
  giftCardBalance?: number;
}

async function computeTotals(bookingId: string, input: CheckoutInput): Promise<Totals> {
  const { booking, storeCredit } = await loadContext(bookingId);
  const retail = await resolveRetail(booking.vendorId, input.retailItems ?? []);

  const serviceSubtotal = Number(booking.totalAmount);
  const extraTimeCost = Number(booking.timerExtraCost);
  const retailSubtotal = retail.reduce((s, r) => s + r.amount, 0);
  const tip = Math.max(0, input.tip ?? 0);
  const grossTotal = serviceSubtotal + extraTimeCost + retailSubtotal + tip;
  const depositPaid = Number(booking.depositAmount);

  const afterDeposit = Math.max(0, grossTotal - depositPaid);

  // Gift card
  let giftCardApplied = 0;
  let giftCardBalance: number | undefined;
  if (input.giftCardCode) {
    const card = await lookupGiftCard(input.giftCardCode, booking.vendorId);
    giftCardBalance = Number(card.balance);
    const cap = input.giftCardAmount ?? afterDeposit;
    giftCardApplied = Math.min(giftCardBalance, cap, afterDeposit);
  }
  const afterGift = afterDeposit - giftCardApplied;

  // Store credit
  const creditApplied = Math.min(storeCredit, Math.max(0, input.creditApplied ?? 0), afterGift);
  const amountDue = Math.max(0, afterGift - creditApplied);

  return {
    serviceSubtotal, extraTimeCost, retailSubtotal, tip, grossTotal, depositPaid,
    giftCardApplied, creditApplied, amountDue, retail, giftCardBalance,
  };
}

/** Non-committing calculation for the checkout screen. */
export async function previewCheckout(bookingId: string, input: CheckoutInput) {
  return computeTotals(bookingId, input);
}

/** Commit checkout: invoice + line items, stock, gift-card, credit, booking balance. */
export async function processCheckout(bookingId: string, input: CheckoutInput) {
  const t = await computeTotals(bookingId, input);
  const { booking } = await loadContext(bookingId);

  return prisma.$transaction(async (tx) => {
    // Redeem gift card (outside-safe: recompute inside tx via balance decrement)
    let giftCardId: string | null = null;
    if (input.giftCardCode && t.giftCardApplied > 0) {
      const { cardId } = await redeemGiftCard(input.giftCardCode, booking.vendorId, t.giftCardApplied);
      giftCardId = cardId;
    }
    // Deduct store credit
    if (t.creditApplied > 0) {
      await tx.clientProfile.update({
        where: { userId: booking.clientId },
        data: { storeCredit: { decrement: t.creditApplied } },
      });
    }
    // Decrement retail stock
    for (const r of t.retail) {
      await tx.product.update({ where: { id: r.productId }, data: { stock: { decrement: r.quantity } } });
    }

    // Build/replace invoice
    const existing = await tx.invoice.findUnique({ where: { bookingId } });
    if (existing) await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
    const number = existing?.number ?? (await nextInvoiceNumber());

    const invoiceData = {
      number,
      vendorId: booking.vendorId,
      clientId: booking.clientId,
      staffMemberId: booking.staffMemberId,
      serviceName: booking.service.name,
      subtotal: t.serviceSubtotal,
      extraTimeCost: t.extraTimeCost,
      retailSubtotal: t.retailSubtotal,
      depositPaid: t.depositPaid,
      giftCardApplied: t.giftCardApplied,
      creditApplied: t.creditApplied,
      balancePaid: t.amountDue,
      tip: t.tip,
      total: t.grossTotal,
      amountDue: t.amountDue,
    };
    const invoice = existing
      ? await tx.invoice.update({ where: { bookingId }, data: invoiceData })
      : await tx.invoice.create({ data: { bookingId, ...invoiceData } });

    // Line items
    const items: { kind: string; description: string; productId?: string; giftCardId?: string; quantity: number; unitPrice: number; amount: number }[] = [
      { kind: 'service', description: booking.service.name, quantity: 1, unitPrice: t.serviceSubtotal, amount: t.serviceSubtotal },
    ];
    if (t.extraTimeCost > 0) items.push({ kind: 'extra_time', description: 'Extra service time', quantity: 1, unitPrice: t.extraTimeCost, amount: t.extraTimeCost });
    for (const r of t.retail) items.push({ kind: 'retail', description: r.name, productId: r.productId, quantity: r.quantity, unitPrice: r.unitPrice, amount: r.amount });
    if (t.tip > 0) items.push({ kind: 'tip', description: 'Tip', quantity: 1, unitPrice: t.tip, amount: t.tip });
    if (t.depositPaid > 0) items.push({ kind: 'deposit', description: 'Deposit already paid', quantity: 1, unitPrice: -t.depositPaid, amount: -t.depositPaid });
    if (t.giftCardApplied > 0) items.push({ kind: 'gift_card', description: 'Gift card applied', giftCardId: giftCardId ?? undefined, quantity: 1, unitPrice: -t.giftCardApplied, amount: -t.giftCardApplied });
    if (t.creditApplied > 0) items.push({ kind: 'credit', description: 'Store credit applied', quantity: 1, unitPrice: -t.creditApplied, amount: -t.creditApplied });

    await tx.invoiceItem.createMany({
      data: items.map((it) => ({ invoiceId: invoice.id, kind: it.kind as never, description: it.description, productId: it.productId ?? null, giftCardId: it.giftCardId ?? null, quantity: it.quantity, unitPrice: it.unitPrice, amount: it.amount })),
    });

    // Finalize booking payment fields
    await tx.booking.update({
      where: { id: bookingId },
      data: { tipAmount: t.tip, balanceAmount: t.amountDue, balancePaidAt: new Date() },
    });

    return { invoice, totals: t, items };
  });
}
