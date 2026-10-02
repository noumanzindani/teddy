// Replays the exact requests the mobile app makes (User/app/src) and checks the app
// can read what comes back. A FAIL here means the screen is broken even if the API "works".
import { test, get, post, expectStatus, ok, eq, nextSlot } from '../lib.mjs';

const A = 'app-contract';

test('AC-01', A, 'Booking flow as the app runs it: create → intent → confirm', 'contract: BookingPaymentScreen.tsx:61-83', async (ctx) => {
  const t = ctx.qa2.token;
  const created = await post('/bookings', { serviceId: ctx.svc.hydra, vendorId: ctx.vendorId, startsAt: nextSlot() }, { token: t });
  expectStatus(created, 201, 'create');
  // App: `const booking = await api.post(...)` then uses `booking.id`
  const appBookingId = created.data.id;
  const intent = await post('/payments/intent', { bookingId: appBookingId }, { token: t });
  const confirm = await post('/payments/confirm', { bookingId: appBookingId }, { token: t });
  ok(intent.status === 201 && confirm.status === 200,
    `app reads booking.id=${appBookingId} (response keys: ${Object.keys(created.data)}); intent → HTTP ${intent.status} ${intent.body?.error?.message ?? ''}; confirm({bookingId}) → HTTP ${confirm.status} ${confirm.body?.error?.message ?? ''}`);
});

test('AC-02', A, 'Salon list: the app gets an array of vendors from GET /vendors', 'contract: ServicesBrowse / api.ts unwraps json.data ?? json', async (ctx) => {
  const r = await get('/vendors');
  const appSees = r.body?.data ?? r.body; // api.ts apiFetch
  return `app receives ${Array.isArray(appSees) ? 'an array' : `an object with keys [${Object.keys(appSees)}]`} — screen must read .vendors`;
});

test('AC-03', A, 'My bookings: each booking has the service + vendor objects the list renders', 'contract: MyBookingsScreen ApiBooking', async (ctx) => {
  const list = expectStatus(await get('/users/me/bookings', { token: ctx.sophia.token }), 200).data;
  const b = list[0];
  ok(b?.service?.name && b?.vendor?.businessName, `booking fields: ${Object.keys(b ?? {})}`);
});

test('AC-04', A, 'Rate Now from a notification uses a real booking id', 'contract: NotificationsScreen.tsx:88', async (ctx) => {
  const n = (await get('/notifications', { token: ctx.sophia.token })).data[0];
  const r = await get(`/bookings/${n?.id}`, { token: ctx.sophia.token });
  ok(r.status === 200, `app navigates to RateExperience with bookingId=notification.id → GET /bookings/${n?.id} = HTTP ${r.status}`);
});

test('AC-05', A, 'Delete account from the app reaches the API', 'contract: ProfileScreen.tsx:146-152', async () => {
  // Static contract check: the app never calls DELETE /users/me (verified in UI journey U9).
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../../../User/app/src/features/profile/screens/ProfileScreen.tsx', import.meta.url), 'utf8');
  ok(/api\.delete\(['"`]\/users\/me/.test(src), 'ProfileScreen never calls api.delete(\'/users/me\') — account is only logged out locally');
});

test('AC-06', A, 'API client survives a 204 No Content response', 'contract: utils/api.ts:34 always calls res.json()', async (ctx) => {
  const res = await fetch('http://localhost:4000/v1/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${ctx.qa2.token}`, 'Content-Type': 'application/json' } });
  let threw = false;
  try { await res.json(); } catch { threw = true; }
  ok(!threw, `logout returns HTTP ${res.status} with an empty body; the app's res.json() throws → app shows an error for a successful call`);
});
