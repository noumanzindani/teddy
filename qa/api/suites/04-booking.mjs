import {
  test, get, post, patch, expectStatus, expectDenied, ok, eq, nextSlot, hoursFromNow, redisCli, sql,
} from '../lib.mjs';

const A = 'booking';

// Client books a service; returns { status, booking, waitlisted, raw }.
export async function book(ctx, token, { serviceId = ctx.svc.hydra, startsAt = nextSlot(), staffMemberId, addOns, vendorId = ctx.vendorId } = {}) {
  const r = await post('/bookings', { vendorId, serviceId, startsAt, ...(staffMemberId ? { staffMemberId } : {}), ...(addOns ? { addOns } : {}) }, { token });
  return { status: r.status, booking: r.data?.booking, waitlisted: r.data?.waitlisted, position: r.data?.position, raw: r };
}
// Pays the up-front amount the way the API contract expects (intent → confirm with the intent id).
export async function pay(token, bookingId) {
  const intent = expectStatus(await post('/payments/intent', { bookingId }, { token }), 201, 'payment intent');
  const intentId = intent.data.paymentIntentId ?? intent.data.id ?? intent.data.intentId;
  const conf = await post('/payments/confirm', { paymentIntentId: intentId }, { token });
  expectStatus(conf, 200, `confirm (intent keys: ${Object.keys(intent.data)})`);
  return intent.data;
}
export async function bookPaidConfirmed(ctx, token, opts) {
  const b = await book(ctx, token, opts);
  expectStatus(b.raw, 201, 'create booking');
  await pay(token, b.booking.id);
  expectStatus(await post(`/bookings/${b.booking.id}/confirm`, {}, { token: ctx.emily.token }), 200, 'vendor confirm');
  return b.booking;
}

test('BK-01', A, 'Create booking → 201 PENDING with correct total and end time', 'code: createBooking', async (ctx) => {
  const startsAt = nextSlot();
  const b = await book(ctx, ctx.qa2.token, { startsAt, staffMemberId: ctx.staffId });
  expectStatus(b.raw, 201);
  eq(b.booking.status, 'PENDING', 'status');
  eq(Number(b.booking.totalAmount), 120, 'totalAmount (HydraFacial $120)');
  eq(new Date(b.booking.endsAt).getTime() - new Date(startsAt).getTime(), (60 + 15) * 60e3, 'endsAt = start + 60min + 15min buffer');
});

test('BK-02', A, 'Booking in the past is refused', 'common sense / reschedule already enforces this', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token, { startsAt: hoursFromNow(-48) });
  ok(b.status >= 400, `past booking accepted: HTTP ${b.status} status=${b.booking?.status}`);
});

test('BK-03', A, 'Booking beyond the vendor\'s 60-day window is refused', 'code: bookingWindowDays', async (ctx) => {
  expectStatus((await book(ctx, ctx.qa2.token, { startsAt: nextSlot({ daysAhead: 61 }) })).raw, 409);
});

test('BK-04', A, 'Service that does not belong to the vendor is refused', 'code: createBooking', async (ctx) => {
  expectDenied((await book(ctx, ctx.qa2.token, { vendorId: ctx.otherVendorId })).raw);
});

test('BK-05', A, 'Staff member from a different vendor is refused', 'data integrity', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token, { staffMemberId: ctx.otherStaffId ?? '00000000-0000-0000-0000-000000000000' });
  ok(b.status >= 400, `booked with foreign/unknown staff: HTTP ${b.status}`);
});

test('BK-06', A, 'Booking outside the salon\'s opening hours / staff availability is refused', 'docs: SOW 4.4 (slot picker shows available times)', async (ctx) => {
  const d = new Date(nextSlot()); d.setUTCHours(3, 0, 0, 0); // 03:00 UTC = 23:00 Miami
  const b = await book(ctx, ctx.qa2.token, { startsAt: d.toISOString(), staffMemberId: ctx.staffId });
  ok(b.status >= 400, `booking at ${d.toISOString()} accepted: HTTP ${b.status}`);
});

test('BK-07', A, 'Second client on the exact same slot is waitlisted (position 1)', 'docs: APPLICATION_FLOW §5-6', async (ctx) => {
  const startsAt = nextSlot();
  const first = await book(ctx, ctx.sophia.token, { startsAt, staffMemberId: ctx.staffId });
  const second = await book(ctx, ctx.qa2.token, { startsAt, staffMemberId: ctx.staffId });
  eq([first.booking.status, second.booking?.status, second.position], ['PENDING', 'WAITLISTED', 1], '[first, second, position]');
  ctx.shared.waitlist = { first: first.booking.id, second: second.booking.id };
});

test('BK-08', A, 'Overlapping booking (same staff, starts 15 min later) is refused or waitlisted', 'docs: SYSTEM_ARCHITECTURE "Slot Locking"', async (ctx) => {
  const startsAt = nextSlot();
  const a = await book(ctx, ctx.sophia.token, { startsAt, staffMemberId: ctx.staffId });
  const b = await book(ctx, ctx.qa2.token, { startsAt: new Date(new Date(startsAt).getTime() + 15 * 60e3).toISOString(), staffMemberId: ctx.staffId });
  ok(b.status >= 400 || b.booking?.status === 'WAITLISTED',
    `double-booked: ${a.booking.status} ${startsAt} and ${b.booking?.status} 15 min later, same staff`);
});

test('BK-09', A, 'Same slot is still protected after the 5-minute slot lock expires', 'docs: SYSTEM_ARCHITECTURE "Slot Locking"', async (ctx) => {
  const startsAt = nextSlot();
  const a = await book(ctx, ctx.sophia.token, { startsAt, staffMemberId: ctx.staffId });
  // Simulate the 300s TTL elapsing instead of waiting 5 minutes.
  redisCli('DEL', `lock:slot:${ctx.vendorId}:${ctx.staffId}:${new Date(startsAt).toISOString()}`);
  const b = await book(ctx, ctx.qa2.token, { startsAt, staffMemberId: ctx.staffId });
  ok(b.booking?.status === 'WAITLISTED' || b.status >= 400,
    `after lock expiry a second client got status=${b.booking?.status} for the same slot as ${a.booking.status} booking`);
});

test('BK-10', A, 'Client-supplied add-on prices are not trusted', 'security: price tampering', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token, { addOns: [{ id: 'not-a-real-addon', name: 'Gold Mask', price: 0, durationMin: 120 }] });
  ok(b.status >= 400, `fabricated add-on accepted: HTTP ${b.status}, total=${b.booking?.totalAmount}, endsAt=${b.booking?.endsAt}`);
});

test('BK-11', A, 'Notes longer than 500 characters are refused', 'code: CreateBookingSchema', async (ctx) => {
  const r = await post('/bookings', { vendorId: ctx.vendorId, serviceId: ctx.svc.hydra, startsAt: nextSlot(), notes: 'x'.repeat(501) }, { token: ctx.qa2.token });
  expectStatus(r, [400, 422]);
});

test('BK-12', A, 'Payment intent charges the deposit when the service takes a deposit', 'code: payment.controller createIntent', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token, { serviceId: ctx.svc.depositSvc });
  const intent = expectStatus(await post('/payments/intent', { bookingId: b.booking.id }, { token: ctx.qa2.token }), 201).data;
  const amount = intent.amount / 100; // intent.amount is in cents
  eq([Number(b.booking.depositAmount), amount], [33, 33], '[depositAmount, intent amount] for $110 @30%');
});

test('BK-13', A, 'After payment the booking is confirmed (automatically or by vendor)', 'docs CONFLICT: AF §5 auto-confirm vs vendor PDF manual', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  await pay(ctx.qa2.token, b.booking.id);
  const after = (await get(`/bookings/${b.booking.id}`, { token: ctx.qa2.token })).data;
  return `status after payment = ${after.status} (payment ${after.payment?.status}); vendor must confirm manually: ${after.status === 'PENDING'}`;
});

test('BK-14', A, 'Cancel ≥24h before: refund equals what was actually paid (deposit)', 'docs: AF §8 100% refund', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token, { serviceId: ctx.svc.depositSvc });
  await pay(ctx.qa2.token, b.booking.id);
  const r = expectStatus(await post(`/bookings/${b.booking.id}/cancel`, { reason: 'Plans changed' }, { token: ctx.qa2.token }), 200);
  eq(r.data.refundAmount, 33, 'refundAmount (paid only the $33 deposit)');
});

test('BK-15', A, 'Cancelling an already-cancelled booking is refused (no second refund)', 'money integrity', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  await pay(ctx.qa2.token, b.booking.id);
  expectStatus(await post(`/bookings/${b.booking.id}/cancel`, { reason: 'first' }, { token: ctx.qa2.token }), 200, 'first cancel');
  const again = await post(`/bookings/${b.booking.id}/cancel`, { reason: 'second' }, { token: ctx.qa2.token });
  ok(again.status >= 400, `second cancel accepted: HTTP ${again.status} refundAmount=${again.data?.refundAmount}`);
});

test('BK-16', A, 'Late cancel (<24h) by client', 'docs CONFLICT: AF §8 50% refund vs code: blocked', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token, { startsAt: hoursFromNow(5) });
  const r = await post(`/bookings/${b.booking.id}/cancel`, { reason: 'late' }, { token: ctx.qa2.token });
  return `HTTP ${r.status}: ${r.body?.error?.message ?? JSON.stringify(r.data).slice(0, 100)}`;
});

test('BK-17', A, 'Reschedule: past time refused, future time accepted', 'code: rescheduleBooking', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  expectStatus(await post(`/bookings/${b.booking.id}/reschedule`, { startsAt: hoursFromNow(-2) }, { token: ctx.qa2.token }), 409, 'past');
  expectStatus(await post(`/bookings/${b.booking.id}/reschedule`, { startsAt: nextSlot() }, { token: ctx.qa2.token }), 200, 'future');
});

test('BK-18', A, 'Reschedule into a slot already taken by another client is refused', 'docs: slot locking', async (ctx) => {
  const taken = nextSlot();
  await book(ctx, ctx.sophia.token, { startsAt: taken, staffMemberId: ctx.staffId });
  const mine = await book(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId });
  const r = await post(`/bookings/${mine.booking.id}/reschedule`, { startsAt: taken }, { token: ctx.qa2.token });
  ok(r.status >= 400, `rescheduled onto an occupied slot: HTTP ${r.status}`);
});

test('BK-19', A, 'Reschedule beyond the booking window is refused', 'code: bookingWindowDays', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  const r = await post(`/bookings/${b.booking.id}/reschedule`, { startsAt: nextSlot({ daysAhead: 200 }) }, { token: ctx.qa2.token });
  ok(r.status >= 400, `rescheduled 200 days ahead: HTTP ${r.status}`);
});

test('BK-20', A, 'Cancelling the first booking promotes the waitlisted one to PENDING', 'docs: APPLICATION_FLOW §6', async (ctx) => {
  const w = ctx.shared.waitlist;
  ok(w, 'BK-07 did not run');
  expectStatus(await get(`/bookings/${w.second}/waitlist-position`, { token: ctx.qa2.token }), 200, 'position');
  expectStatus(await post(`/bookings/${w.first}/cancel`, { reason: 'free the slot' }, { token: ctx.sophia.token }), 200, 'cancel first');
  eq((await get(`/bookings/${w.second}`, { token: ctx.qa2.token })).data.status, 'PENDING', 'promoted booking status');
});

test('BK-21', A, 'Waitlisted booking cannot be paid or confirmed while still waitlisted', 'docs: APPLICATION_FLOW §6', async (ctx) => {
  const startsAt = nextSlot();
  await book(ctx, ctx.sophia.token, { startsAt, staffMemberId: ctx.staffId });
  const w = await book(ctx, ctx.qa2.token, { startsAt, staffMemberId: ctx.staffId });
  const intent = await post('/payments/intent', { bookingId: w.booking.id }, { token: ctx.qa2.token });
  ok(intent.status >= 400, `payment intent created for a WAITLISTED booking (HTTP ${intent.status})`);
});
