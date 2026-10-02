import { test, get, post, register, expectStatus, expectDenied, ok, eq, sql } from '../lib.mjs';
import { book, pay, bookPaidConfirmed } from './04-booking.mjs';

const A = 'lifecycle';

test('LC-01', A, 'Vendor confirms a paid booking → CONFIRMED + client notified', 'docs: vendor PDF', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  await pay(ctx.qa2.token, b.booking.id);
  // Count in the DB — the list endpoint is paginated, so its length can't show a new row.
  const q = `select count(*) from "Notification" where "userId"='${ctx.qa2.user.id}' and title='Booking Confirmed!'`;
  const before = Number(sql(q));
  expectStatus(await post(`/bookings/${b.booking.id}/confirm`, {}, { token: ctx.emily.token }), 200);
  ok(Number(sql(q)) === before + 1, 'no "Booking Confirmed!" notification created for the client');
});

test('LC-02', A, 'Another salon\'s owner cannot confirm the booking', 'security', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  expectDenied(await post(`/bookings/${b.booking.id}/confirm`, {}, { token: ctx.camille.token }));
});

test('LC-03', A, 'Admin can confirm a booking (route allows admin)', 'code: booking.routes confirm → vendor_owner, admin', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  expectStatus(await post(`/bookings/${b.booking.id}/confirm`, {}, { token: ctx.admin.token }), 200);
});

test('LC-04', A, 'A cancelled booking cannot be confirmed again', 'state machine: SYSTEM_ARCHITECTURE enum', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  await post(`/bookings/${b.booking.id}/cancel`, { reason: 'x' }, { token: ctx.qa2.token });
  const r = await post(`/bookings/${b.booking.id}/confirm`, {}, { token: ctx.emily.token });
  const status = (await get(`/bookings/${b.booking.id}`, { token: ctx.qa2.token })).data.status;
  ok(r.status >= 400, `cancelled booking re-confirmed: HTTP ${r.status}, status now ${status}`);
});

test('LC-05', A, 'Another salon\'s owner cannot start / complete / no-show the booking', 'security', async (ctx) => {
  const bk = await bookPaidConfirmed(ctx, ctx.qa2.token);
  const start = await post(`/bookings/${bk.id}/start`, {}, { token: ctx.camille.token });
  const noShow = await post(`/bookings/${bk.id}/no-show`, {}, { token: ctx.camille.token });
  const status = (await get(`/bookings/${bk.id}`, { token: ctx.qa2.token })).data.status;
  ok(start.status >= 400 && noShow.status >= 400, `foreign vendor: start→${start.status}, no-show→${noShow.status}; booking now ${status}`);
});

test('LC-06', A, 'Staff starts, extends and completes; client earns floor(total × 10) points', 'docs: AF §7/§12 (10 pts per $1)', async (ctx) => {
  const bk = await bookPaidConfirmed(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId });
  const pts0 = (await get('/users/me', { token: ctx.qa2.token })).data.pointsBalance;
  expectStatus(await post(`/bookings/${bk.id}/start`, {}, { token: ctx.sarah.token }), 200, 'start');
  const ext = expectStatus(await post(`/bookings/${bk.id}/timer/extend`, { extraMin: 15 }, { token: ctx.sarah.token }), 200, 'extend');
  expectStatus(await post(`/bookings/${bk.id}/complete`, {}, { token: ctx.sarah.token }), 200, 'complete');
  const pts1 = (await get('/users/me', { token: ctx.qa2.token })).data.pointsBalance;
  eq(pts1 - pts0, 1200, 'points earned for $120');
  ctx.shared.completed = bk.id;
  return `extend → extraMin=${ext.data.timerExtraMin} extraCost=${ext.data.timerExtraCost}`;
});

test('LC-07', A, 'Pay balance + tip settles the booking; paying twice is refused', 'code: payBalance', async (ctx) => {
  const id = ctx.shared.completed; ok(id, 'LC-06 did not complete a booking');
  const r = expectStatus(await post(`/bookings/${id}/pay-balance`, { tip: 10 }, { token: ctx.qa2.token }), 200, 'pay-balance');
  eq(Number(r.data.booking.tipAmount), 10, 'tip');
  expectStatus(await post(`/bookings/${id}/pay-balance`, { tip: 10 }, { token: ctx.qa2.token }), 409, 'second pay-balance');
});

test('LC-08', A, 'Invoice is available to the booking\'s client', 'docs: DEPLOYMENT_HANDOFF §2', async (ctx) => {
  expectStatus(await get(`/bookings/${ctx.shared.completed}/invoice`, { token: ctx.qa2.token }), 200);
});

test('LC-09', A, 'Review: allowed once, only by the client, only when COMPLETED', 'docs: AF §11', async (ctx) => {
  const id = ctx.shared.completed;
  expectStatus(await post('/reviews', { bookingId: id, rating: 5, body: 'Great' }, { token: ctx.qa2.token }), 201, 'first review');
  expectStatus(await post('/reviews', { bookingId: id, rating: 4 }, { token: ctx.qa2.token }), 409, 'second review');
  expectDenied(await post('/reviews', { bookingId: id, rating: 1 }, { token: ctx.sophia.token }), 'other client reviewing');
  const pending = await book(ctx, ctx.qa2.token);
  expectDenied(await post('/reviews', { bookingId: pending.booking.id, rating: 5 }, { token: ctx.qa2.token }), 'review of a non-completed booking');
});

test('LC-10', A, 'Review text over 500 characters is refused', 'docs: AF §11 (500 chars)', async (ctx) => {
  const bk = await bookPaidConfirmed(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId });
  await post(`/bookings/${bk.id}/start`, {}, { token: ctx.sarah.token });
  await post(`/bookings/${bk.id}/complete`, {}, { token: ctx.sarah.token });
  const r = await post('/reviews', { bookingId: bk.id, rating: 5, body: 'y'.repeat(700) }, { token: ctx.qa2.token });
  ok([400, 422].includes(r.status), `700-char review accepted: HTTP ${r.status}`);
});

test('LC-11', A, 'An IN_PROGRESS booking cannot be marked no-show', 'state machine', async (ctx) => {
  const bk = await bookPaidConfirmed(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId });
  await post(`/bookings/${bk.id}/start`, {}, { token: ctx.sarah.token });
  await post(`/bookings/${bk.id}/no-show`, {}, { token: ctx.emily.token });
  const status = (await get(`/bookings/${bk.id}`, { token: ctx.qa2.token })).data.status;
  eq(status, 'IN_PROGRESS', 'status after no-show on a running service');
});

test('LC-12', A, 'A COMPLETED booking cannot be cancelled / refunded', 'money integrity', async (ctx) => {
  const bk = await bookPaidConfirmed(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId });
  await post(`/bookings/${bk.id}/start`, {}, { token: ctx.sarah.token });
  await post(`/bookings/${bk.id}/complete`, {}, { token: ctx.sarah.token });
  const r = await post(`/bookings/${bk.id}/cancel`, { reason: 'after the fact' }, { token: ctx.emily.token });
  ok(r.status >= 400, `vendor cancelled a COMPLETED booking: HTTP ${r.status}, refundAmount=${r.data?.refundAmount}`);
});

test('LC-13', A, 'Tier thresholds match the spec (Silver 5,000 / Gold 15,000 / Platinum 30,000)', 'docs: AF §12', async (ctx) => {
  // A fresh client who earns 1,200 points (one $120 service) should still be BRONZE per spec.
  const u = await register('qa.tier@example.com');
  const bk = await bookPaidConfirmed(ctx, u.token, { staffMemberId: ctx.staffId });
  await post(`/bookings/${bk.id}/start`, {}, { token: ctx.sarah.token });
  await post(`/bookings/${bk.id}/complete`, {}, { token: ctx.sarah.token });
  const me = (await get('/users/me', { token: u.token })).data;
  eq([me.pointsBalance, me.tier], [1200, 'BRONZE'], '[points, tier] after one $120 service');
});

test('LC-14', A, 'Concurrent point awards are not lost (two completions at once)', 'money integrity: awardPoints read-modify-write', async (ctx) => {
  const [a, b] = await Promise.all([
    bookPaidConfirmed(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId }),
    bookPaidConfirmed(ctx, ctx.qa2.token, { staffMemberId: ctx.staffId }),
  ]);
  await Promise.all([a, b].map((x) => post(`/bookings/${x.id}/start`, {}, { token: ctx.sarah.token })));
  const p0 = (await get('/users/me', { token: ctx.qa2.token })).data.pointsBalance;
  await Promise.all([a, b].map((x) => post(`/bookings/${x.id}/complete`, {}, { token: ctx.sarah.token })));
  const p1 = (await get('/users/me', { token: ctx.qa2.token })).data.pointsBalance;
  eq(p1 - p0, 2400, 'points after two simultaneous $120 completions');
});
