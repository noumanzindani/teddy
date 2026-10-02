// Cross-account access: qa.client2 ("attacker") against sophia.carter's data.
import { test, get, post, patch, del, register, expectDenied, expectStatus, ok, eq, socketConnect, sleep, sql, nextSlot } from '../lib.mjs';
import { book, pay } from './04-booking.mjs';

const A = 'security';

test('SE-01', A, 'Client cannot read another client\'s booking', 'security: IDOR', async (ctx) => {
  expectDenied(await get('/bookings/seed-bk-1', { token: ctx.qa2.token }), 'GET /bookings/seed-bk-1 (sophia, has staff assigned)');
});

test('SE-02', A, 'Client cannot read another client\'s invoice', 'security: IDOR', async (ctx) => {
  expectDenied(await get('/bookings/seed-bk-1/invoice', { token: ctx.qa2.token }));
});

test('SE-03', A, 'Client cannot read another client\'s payment status', 'security: IDOR', async (ctx) => {
  expectDenied(await get('/payments/seed-bk-1/status', { token: ctx.qa2.token }));
});

test('SE-04', A, 'Client cannot refund another client\'s booking', 'security: IDOR + money', async (ctx) => {
  const b = await book(ctx, ctx.sophia.token);
  await pay(ctx.sophia.token, b.booking.id);
  const r = await post(`/payments/${b.booking.id}/refund`, { amount: 99999 }, { token: ctx.qa2.token });
  const pay_ = sql(`select status, "refundAmount" from "Payment" where "bookingId"='${b.booking.id}'`);
  ok(r.status >= 400, `refund by another client: HTTP ${r.status}; payment now ${pay_}`);
});

test('SE-05', A, 'Client cannot refund their own booking for an arbitrary amount', 'security: money', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  await pay(ctx.qa2.token, b.booking.id);
  const r = await post(`/payments/${b.booking.id}/refund`, { amount: 5000 }, { token: ctx.qa2.token });
  ok(r.status >= 400, `self-refund of $5000 on a $120 booking: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 80)}`);
});

test('SE-06', A, 'Client cannot create a payment intent for another client\'s booking', 'security: IDOR', async (ctx) => {
  const b = await book(ctx, ctx.sophia.token);
  expectDenied(await post('/payments/intent', { bookingId: b.booking.id }, { token: ctx.qa2.token }));
});

test('SE-07', A, 'Client cannot cancel / reschedule another client\'s booking', 'security: IDOR', async (ctx) => {
  const b = await book(ctx, ctx.sophia.token);
  expectDenied(await post(`/bookings/${b.booking.id}/cancel`, { reason: 'x' }, { token: ctx.qa2.token }), 'cancel');
  expectDenied(await post(`/bookings/${b.booking.id}/reschedule`, { startsAt: nextSlot() }, { token: ctx.qa2.token }), 'reschedule');
});

test('SE-08', A, 'Client cannot read another client\'s waitlist position', 'security: IDOR', async (ctx) => {
  const startsAt = nextSlot();
  await book(ctx, ctx.qa2.token, { startsAt, staffMemberId: ctx.staffId });
  const w = await book(ctx, ctx.sophia.token, { startsAt, staffMemberId: ctx.staffId });
  expectDenied(await get(`/bookings/${w.booking.id}/waitlist-position`, { token: ctx.qa2.token }));
});

test('SE-09', A, 'Client cannot read another client\'s medical profile', 'security: health data', async (ctx) => {
  expectDenied(await get(`/clinical/clients/${ctx.sophia.user.id}/profile`, { token: ctx.qa2.token }));
});

test('SE-10', A, 'Client cannot edit another client\'s medical profile', 'security: health data', async (ctx) => {
  const r = await patch(`/clinical/clients/${ctx.sophia.user.id}/profile`, { notes: 'tampered by qa2' }, { token: ctx.qa2.token });
  const notes = sql(`select notes from "ClientProfile" where "userId"='${ctx.sophia.user.id}'`);
  ok(r.status >= 400, `PATCH another client's profile: HTTP ${r.status}; sophia's notes now "${notes}"`);
});

test('SE-11', A, 'Client cannot read / write another client\'s intake or service record', 'security: health data', async (ctx) => {
  const b = await book(ctx, ctx.sophia.token);
  await post(`/clinical/bookings/${b.booking.id}/intake`, { answers: { secret: 'sophia-only' } }, { token: ctx.sophia.token });
  const read = await get(`/clinical/bookings/${b.booking.id}/intake`, { token: ctx.qa2.token });
  const write = await post(`/clinical/bookings/${b.booking.id}/intake`, { answers: { secret: 'overwritten' } }, { token: ctx.qa2.token });
  const rec = await get('/clinical/bookings/seed-bk-1/record', { token: ctx.qa2.token });
  ok(read.status >= 400 && write.status >= 400 && rec.status >= 400,
    `intake read→${read.status}, intake write→${write.status}, service record read→${rec.status}`);
});

test('SE-12', A, 'Client cannot read another client\'s chat thread', 'security: IDOR', async (ctx) => {
  expectDenied(await get(`/chat/threads/${ctx.threadId}`, { token: ctx.qa2.token }), 'read');
  expectDenied(await post(`/chat/threads/${ctx.threadId}/messages`, { body: 'hi' }, { token: ctx.qa2.token }), 'send');
  expectDenied(await patch(`/chat/threads/${ctx.threadId}/read`, {}, { token: ctx.qa2.token }), 'mark read');
});

test('SE-13', A, 'Client cannot listen in on another client\'s chat via socket', 'security: realtime IDOR', async (ctx) => {
  const spy = await socketConnect(ctx.qa2.token);
  spy.emit('chat:join', ctx.threadId);
  await sleep(300);
  await post(`/chat/threads/${ctx.threadId}/messages`, { body: 'PRIVATE: see you at 3pm' }, { token: ctx.emily.token });
  await sleep(800);
  spy.close();
  ok(!spy.events.some((e) => JSON.stringify(e).includes('PRIVATE: see you at 3pm')), 'qa2 received sophia\'s private chat message over the socket');
});

test('SE-14', A, 'Client cannot see another client\'s before/after photos', 'security: IDOR + docs AF §10 (hidden until shared)', async (ctx) => {
  expectDenied(await get('/media/before-after/seed-bk-1', { token: ctx.qa2.token }));
});

test('SE-15', A, 'Client cannot delete storage files they do not own', 'security (media.service deleteMedia takes any file key)', async (ctx) => {
  // In real (S3) mode this key is passed straight to deleteObject.
  const key = `avatars%2F${ctx.sophia.user.id}%2Fprofile.jpg`;
  const r = await del(`/media/${key}`, { token: ctx.qa2.token });
  ok(r.status === 403 || r.status === 404, `DELETE /media/<sophia's avatar key> by qa2 → HTTP ${r.status} (no ownership check)`);
});

test('SE-16', A, 'Public guest booking cannot be made in an existing user\'s name', 'security: account abuse', async (ctx) => {
  const before = Number(sql(`select count(*) from "Booking" where "clientId"='${ctx.sophia.user.id}'`));
  const r = await post('/public/bookings', {
    serviceId: ctx.svc.hydra, vendorId: ctx.vendorId, startsAt: nextSlot(), guestName: 'Not Sophia', guestEmail: 'sophia.carter@example.com',
  });
  const after = Number(sql(`select count(*) from "Booking" where "clientId"='${ctx.sophia.user.id}'`));
  ok(after === before, `anonymous request added a booking to sophia's account (HTTP ${r.status}; ${before}→${after})`);
});

test('SE-17', A, 'Public guest booking rejects negative add-on prices', 'security: price tampering', async (ctx) => {
  const r = await post('/public/bookings', {
    serviceId: ctx.svc.hydra, vendorId: ctx.vendorId, startsAt: nextSlot(), guestName: 'Guest Q', guestEmail: 'guest.q@example.com',
    addOns: [{ id: 'x', name: 'Discount', price: -119, durationMin: 0 }],
  });
  const id = r.data?.booking?.booking?.id ?? r.data?.booking?.id;
  const total = id ? sql(`select "totalAmount" from "Booking" where id='${id}'`) : 'n/a';
  ok(r.status >= 400, `guest booking with a -$119 add-on on a $120 service: HTTP ${r.status}, stored totalAmount=${total}`);
});

test('SE-18', A, 'Unsigned payment webhook cannot confirm or cancel bookings', 'security: webhook (mock mode is what the deploy docs run)', async (ctx) => {
  const b = await book(ctx, ctx.sophia.token);
  await post('/payments/webhooks/stripe', { type: 'payment_intent.payment_failed', data: { object: { id: 'pi_fake', metadata: { bookingId: b.booking.id } } } });
  const status = (await get(`/bookings/${b.booking.id}`, { token: ctx.sophia.token })).data.status;
  eq(status, 'PENDING', 'booking status after a forged "payment_failed" webhook');
});

test('SE-19', A, 'Client cannot use staff-only endpoints (gift cards, checkout, forms admin)', 'security: RBAC', async (ctx) => {
  for (const [m, p] of [['GET', '/gift-cards'], ['POST', '/gift-cards/redeem'], ['GET', '/forms'], ['GET', '/vendors/me/bookings'], ['GET', '/admin/users']]) {
    const r = m === 'GET' ? await get(p, { token: ctx.qa2.token }) : await post(p, { code: 'TEDDY-GLOW-25', amount: 1 }, { token: ctx.qa2.token });
    expectDenied(r, `${m} ${p}`);
  }
});

test('SE-20', A, 'Gift card redeem rejects negative amounts (staff endpoint)', 'money integrity', async (ctx) => {
  const before = sql(`select balance from "GiftCard" where code='TEDDY-GLOW-25'`);
  const r = await post('/gift-cards/redeem', { code: 'TEDDY-GLOW-25', amount: -500 }, { token: ctx.emily.token });
  const after = sql(`select balance from "GiftCard" where code='TEDDY-GLOW-25'`);
  ok(Number(after) <= Number(before), `redeem -500: HTTP ${r.status}; balance ${before} → ${after}`);
});

test('SE-21', A, 'Client cannot change their own role via notification preferences', 'security: mass assignment (notification.controller updatePreferences passes req.body to prisma)', async (ctx) => {
  const u = await register('qa.escalate@example.com');
  await patch('/notifications/preferences', { user: { update: { role: 'admin' } } }, { token: u.token });
  const role = sql(`select role from "User" where id='${u.user.id}'`);
  eq(role, 'client', 'role after PATCH /notifications/preferences {user:{update:{role:"admin"}}}');
});

test('SE-22', A, 'Client cannot mark another client\'s payment as paid via /payments/confirm', 'security: IDOR (payment.controller confirm has no ownership check)', async (ctx) => {
  const b = await book(ctx, ctx.sophia.token);
  const intent = expectStatus(await post('/payments/intent', { bookingId: b.booking.id }, { token: ctx.sophia.token }), 201, 'sophia creates intent');
  const intentId = intent.data.paymentIntentId ?? intent.data.id ?? intent.data.intentId;
  const r = await post('/payments/confirm', { paymentIntentId: intentId }, { token: ctx.qa2.token });
  const status = sql(`select status from "Payment" where "bookingId"='${b.booking.id}'`);
  ok(status === 'PENDING', `qa2 confirmed sophia's intent: HTTP ${r.status}, payment now ${status}`);
});
