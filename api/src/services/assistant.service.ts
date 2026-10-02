import { prisma } from '../lib/prisma';

// A scripted "AI" assistant: it interprets natural-language questions from the
// vendor and answers them from live business data. No external LLM — intent is
// matched by keywords and the answer is composed from real queries.

interface Answer { answer: string; data?: unknown; suggestions?: string[] }

const SUGGESTIONS = [
  "What's on today?",
  'How much revenue this week?',
  'Any low stock?',
  'When is my next appointment?',
  'How many members do I have?',
  'What is my most popular service?',
];

function startOfToday() { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; }
function daysAgo(n: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; }
const money = (n: number) => `$${n.toFixed(2)}`;

export async function askAssistant(vendorId: string, questionRaw: string): Promise<Answer> {
  const q = (questionRaw || '').toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  // Today's schedule
  if (has('today', "what's on", 'whats on', 'schedule')) {
    const start = startOfToday();
    const end = new Date(start.getTime() + 86400000);
    const bookings = await prisma.booking.findMany({
      where: { vendorId, startsAt: { gte: start, lt: end }, status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] } },
      include: { client: { select: { firstName: true, lastName: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
    });
    if (!bookings.length) return { answer: 'You have no appointments booked for today.', suggestions: SUGGESTIONS };
    const lines = bookings.map((b) => `• ${new Date(b.startsAt).toUTCString().slice(17, 22)} — ${b.client.firstName} ${b.client.lastName}, ${b.service.name}`);
    return { answer: `You have ${bookings.length} appointment${bookings.length !== 1 ? 's' : ''} today:\n${lines.join('\n')}`, data: bookings.length };
  }

  // Revenue
  if (has('revenue', 'earning', 'made', 'income', 'sales')) {
    const week = has('month') ? daysAgo(30) : daysAgo(7);
    const label = has('month') ? 'the last 30 days' : 'the last 7 days';
    const completed = await prisma.booking.findMany({ where: { vendorId, status: 'COMPLETED', completedAt: { gte: week } }, select: { totalAmount: true } });
    const total = completed.reduce((s, b) => s + Number(b.totalAmount), 0);
    return { answer: `Over ${label} you completed ${completed.length} service${completed.length !== 1 ? 's' : ''} for ${money(total)} in revenue.`, data: total };
  }

  // Low stock
  if (has('low stock', 'inventory', 'restock', 'running low', 'stock')) {
    const products = await prisma.product.findMany({ where: { vendorId, isActive: true } });
    const low = products.filter((p) => p.stock <= p.lowStockThreshold);
    if (!low.length) return { answer: 'Everything is well stocked — no products below their alert level.' };
    return { answer: `${low.length} product${low.length !== 1 ? 's are' : ' is'} low on stock:\n${low.map((p) => `• ${p.name} (${p.stock} left)`).join('\n')}`, data: low.length };
  }

  // Next appointment
  if (has('next appointment', 'next booking', 'coming up', 'upcoming')) {
    const next = await prisma.booking.findFirst({
      where: { vendorId, startsAt: { gte: new Date() }, status: { in: ['PENDING', 'CONFIRMED'] } },
      include: { client: { select: { firstName: true, lastName: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
    });
    if (!next) return { answer: 'You have no upcoming appointments scheduled.' };
    return { answer: `Your next appointment is ${next.client.firstName} ${next.client.lastName} for a ${next.service.name} on ${new Date(next.startsAt).toUTCString().slice(0, 22)}.` };
  }

  // Members / subscriptions
  if (has('member', 'subscription', 'subscriber')) {
    const count = await prisma.subscription.count({ where: { vendorId, status: 'active' as never } });
    return { answer: `You currently have ${count} active member${count !== 1 ? 's' : ''}.`, data: count };
  }

  // Most popular service
  if (has('popular', 'most booked', 'top service', 'best service')) {
    const grouped = await prisma.booking.groupBy({ by: ['serviceId'], where: { vendorId }, _count: { serviceId: true }, orderBy: { _count: { serviceId: 'desc' } }, take: 1 });
    if (!grouped.length) return { answer: 'No bookings yet to rank services.' };
    const svc = await prisma.service.findUnique({ where: { id: grouped[0].serviceId }, select: { name: true } });
    return { answer: `Your most-booked service is ${svc?.name} with ${grouped[0]._count.serviceId} bookings.` };
  }

  // Clients / new clients
  if (has('client', 'customer', 'new client')) {
    const clientIds = await prisma.booking.findMany({ where: { vendorId }, select: { clientId: true }, distinct: ['clientId'] });
    const recent = await prisma.booking.findMany({ where: { vendorId, createdAt: { gte: daysAgo(30) } }, select: { clientId: true }, distinct: ['clientId'] });
    return { answer: `You've served ${clientIds.length} unique client${clientIds.length !== 1 ? 's' : ''}, with ${recent.length} active in the last 30 days.` };
  }

  // No-shows
  if (has('no show', 'no-show', 'missed', 'cancel', 'cancol', 'cancel')) {
    const noShows = await prisma.booking.count({ where: { vendorId, status: 'NO_SHOW', startsAt: { gte: daysAgo(30) } } });
    const cancels = await prisma.booking.count({ where: { vendorId, status: { in: ['CANCELLED_CLIENT', 'CANCELLED_VENDOR'] }, startsAt: { gte: daysAgo(30) } } });
    return { answer: `In the last 30 days: ${noShows} no-show${noShows !== 1 ? 's' : ''} and ${cancels} cancellation${cancels !== 1 ? 's' : ''}.` };
  }

  return {
    answer: "I can help with your schedule, revenue, inventory, members, popular services, and clients. Try one of these:",
    suggestions: SUGGESTIONS,
  };
}

export function getSuggestions() { return SUGGESTIONS; }
