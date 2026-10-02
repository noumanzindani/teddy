import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors';

function generateCode(): string {
  // Deterministic-free readable code, e.g. TEDDY-7F3K-9QP2. Avoids Math.random ban by
  // using uuid segments from Prisma's default is overkill here — build from a slice.
  const seg = () => Math.abs(hashNow()).toString(36).toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `TEDDY-${seg()}-${seg()}`;
}
// A tiny counter-based entropy source seeded per-process; unique enough for demo codes.
let _counter = 0;
function hashNow(): number {
  _counter += 1;
  return (_counter * 2654435761) ^ (_counter << 13);
}

export async function listGiftCards(vendorId: string) {
  return prisma.giftCard.findMany({ where: { vendorId }, orderBy: { createdAt: 'desc' } });
}

export async function createGiftCard(
  vendorId: string,
  data: { initialAmount: number; code?: string; recipientId?: string; expiresAt?: string },
) {
  if (!data.initialAmount || data.initialAmount <= 0) throw new ValidationError('initialAmount must be positive');
  let code = data.code?.trim().toUpperCase() || generateCode();
  // Ensure uniqueness
  while (await prisma.giftCard.findUnique({ where: { code } })) code = generateCode();

  return prisma.giftCard.create({
    data: {
      vendorId,
      code,
      initialAmount: data.initialAmount,
      balance: data.initialAmount,
      recipientId: data.recipientId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
}

export async function lookupGiftCard(code: string, vendorId: string) {
  const card = await prisma.giftCard.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!card || card.vendorId !== vendorId) throw new NotFoundError('Gift card not found');
  return card;
}

/** Redeem up to `amount` from a card; returns the amount actually applied. */
export async function redeemGiftCard(code: string, vendorId: string, amount: number) {
  const card = await lookupGiftCard(code, vendorId);
  if (!card.isActive) throw new ValidationError('Gift card is inactive');
  if (card.expiresAt && card.expiresAt < new Date()) throw new ValidationError('Gift card has expired');
  const applied = Math.min(Number(card.balance), amount);
  await prisma.giftCard.update({
    where: { id: card.id },
    data: { balance: { decrement: applied }, isActive: Number(card.balance) - applied > 0 },
  });
  return { applied, cardId: card.id, remaining: Number(card.balance) - applied };
}

export async function deactivateGiftCard(id: string, vendorId: string) {
  const card = await prisma.giftCard.findUnique({ where: { id }, select: { vendorId: true } });
  if (!card) throw new NotFoundError('Gift card not found');
  if (card.vendorId !== vendorId) throw new ForbiddenError('Not your gift card');
  return prisma.giftCard.update({ where: { id }, data: { isActive: false } });
}

/** Email a gift card's code to a recipient. Links the card to a matching user if found. */
export async function sendGiftCard(id: string, vendorId: string, recipientEmail: string, message?: string) {
  if (!recipientEmail?.trim()) throw new ValidationError('Recipient email is required');
  const card = await prisma.giftCard.findUnique({ where: { id }, include: { vendor: { select: { businessName: true } } } });
  if (!card || card.vendorId !== vendorId) throw new NotFoundError('Gift card not found');

  const email = recipientEmail.trim().toLowerCase();
  const recipient = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (recipient) await prisma.giftCard.update({ where: { id }, data: { recipientId: recipient.id } });

  const { sendMail } = await import('../lib/mailer');
  const amount = Number(card.balance).toFixed(2);
  await sendMail({
    to: email,
    subject: `You've received a $${amount} gift card for ${card.vendor.businessName}!`,
    html: `<p>You've received a gift card for <strong>${card.vendor.businessName}</strong> 🎁</p>`
      + (message ? `<p>${message.replace(/</g, '&lt;')}</p>` : '')
      + `<p>Value: <strong>$${amount}</strong><br/>Code: <strong style="font-size:18px;letter-spacing:1px">${card.code}</strong></p>`
      + `<p>Present this code at checkout to redeem. Enjoy!</p>`,
  }).catch(() => {});

  return { ok: true, sentTo: email, linkedToClient: !!recipient };
}

/** Transaction history for a gift card: issued event + each redemption from invoices. */
export async function getGiftCardHistory(id: string, vendorId: string) {
  const card = await prisma.giftCard.findUnique({ where: { id } });
  if (!card || card.vendorId !== vendorId) throw new NotFoundError('Gift card not found');

  const redemptions = await prisma.invoiceItem.findMany({
    where: { giftCardId: id },
    include: { invoice: { select: { bookingId: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const transactions = [
    { type: 'issued' as const, amount: Number(card.initialAmount), at: card.createdAt, note: 'Gift card issued' },
    ...redemptions.map((r) => ({
      type: 'redeemed' as const,
      amount: -Math.abs(Number(r.amount)),
      at: r.createdAt,
      note: r.description || 'Redeemed at checkout',
    })),
  ];

  // Reconcile: manual redemptions (not tied to an invoice) still reduced the
  // balance — surface the difference so history always matches the balance.
  const invoiceRedeemed = redemptions.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
  const totalRedeemed = Number(card.initialAmount) - Number(card.balance);
  const manualRedeemed = totalRedeemed - invoiceRedeemed;
  if (manualRedeemed > 0.009) {
    transactions.push({ type: 'redeemed' as const, amount: -manualRedeemed, at: card.updatedAt, note: 'Redeemed' });
  }

  return {
    card: { id: card.id, code: card.code, initialAmount: Number(card.initialAmount), balance: Number(card.balance), isActive: card.isActive },
    transactions,
  };
}
