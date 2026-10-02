import { test, get, post, patch, expectStatus, ok, eq, sql } from '../lib.mjs';
import { book } from './04-booking.mjs';

const A = 'client-data';

test('CD-01', A, 'Medical profile: get + patch own (as the app sends it)', 'contract: MedicalProfileScreen.tsx:109', async (ctx) => {
  expectStatus(await get('/clinical/clients/me/profile', { token: ctx.qa2.token }), 200, 'get');
  const body = { medicalHistory: 'None', employerName: 'QA Inc', occupation: 'Tester', allergies: ['Latex'], currentProducts: 'Sunscreen', notes: 'n/a' };
  expectStatus(await patch('/clinical/clients/me/profile', body, { token: ctx.qa2.token }), 200, 'patch');
  const p = (await get('/clinical/clients/me/profile', { token: ctx.qa2.token })).data;
  ok(JSON.stringify(p).includes('Latex'), 'allergy not saved');
});

test('CD-02', A, 'Client cannot give themselves store credit', 'security: money (store credit is spent at checkout)', async (ctx) => {
  await patch('/clinical/clients/me/profile', { storeCredit: 500 }, { token: ctx.qa2.token });
  const credit = sql(`select coalesce("storeCredit",0) from "ClientProfile" where "userId"='${ctx.qa2.user.id}'`);
  eq(Number(credit), 0, 'storeCredit after client PATCH');
});

test('CD-03', A, 'Pre-visit intake: submit + read for own booking', 'docs: SOW 4.4', async (ctx) => {
  const b = await book(ctx, ctx.qa2.token);
  const r = await post(`/clinical/bookings/${b.booking.id}/intake`, { answers: { skinType: 'Dry' }, allergies: ['Latex'] }, { token: ctx.qa2.token });
  expectStatus(r, [200, 201], 'submit');
  expectStatus(await get(`/clinical/bookings/${b.booking.id}/intake`, { token: ctx.qa2.token }), 200, 'read');
  ctx.shared.qa2Booking = b.booking.id;
});

test('CD-04', A, 'Forms: my-forms and my-responses load', 'code: form.routes', async (ctx) => {
  expectStatus(await get('/forms/my-forms', { token: ctx.sophia.token }), 200, 'my-forms');
  expectStatus(await get('/forms/my-responses', { token: ctx.sophia.token }), 200, 'my-responses');
});

test('CD-05', A, 'Rewards: balance, tier and history', 'docs: AF §12', async (ctx) => {
  const r = expectStatus(await get('/users/me/rewards', { token: ctx.sophia.token }), 200).data;
  return `rewards payload keys: ${Object.keys(r)}`;
});

test('CD-06', A, 'Referrals, my-products, routine and preferences load', 'code', async (ctx) => {
  for (const p of ['/engagement/referrals', '/engagement/my-products', '/routines/me', '/preferences/my', '/addons']) {
    expectStatus(await get(p, { token: ctx.sophia.token }), 200, p);
  }
});

test('CD-07', A, 'Preference answer saves (as the app sends it)', 'contract: MyPreferencesScreen.tsx:48', async (ctx) => {
  // The seed has no preference questions, so the salon creates one first (legit vendor action).
  const created = await post('/preferences/questions', { label: 'Preferred appointment time?', type: 'single', options: ['Morning', 'Evening'] }, { token: ctx.emily.token });
  expectStatus(created, [200, 201], 'vendor creates question');
  const my = (await get('/preferences/my', { token: ctx.sophia.token })).data;
  const q = (my.questions ?? my)[0];
  ok(q?.id, `question not visible to the client (payload: ${JSON.stringify(my).slice(0, 160)})`);
  expectStatus(await post('/preferences/answers', { questionId: q.questionId ?? q.id, value: 'Morning' }, { token: ctx.sophia.token }), 200, 'answer');
});

test('CD-08', A, 'Wishlist: add, list, remove', 'docs: AF (wishlist)', async (ctx) => {
  expectStatus(await post(`/users/me/wishlist/${ctx.vendorId}`, {}, { token: ctx.qa2.token }), [200, 201], 'add');
  const list = expectStatus(await get('/users/me/wishlist', { token: ctx.qa2.token }), 200).data;
  ok(JSON.stringify(list).includes(ctx.vendorId), 'vendor not in wishlist');
  expectStatus(await post(`/users/me/wishlist/${ctx.vendorId}`, {}, { token: ctx.qa2.token }), [200, 201], 'remove');
});

test('CD-09', A, 'Wishlist refuses a non-existent vendor', 'robustness', async (ctx) => {
  const r = await post('/users/me/wishlist/00000000-0000-0000-0000-000000000000', {}, { token: ctx.qa2.token });
  ok(r.status === 404, `HTTP ${r.status}`);
});

test('CD-10', A, 'Before/after photos for own booking load', 'docs: AF §10', async (ctx) => {
  expectStatus(await get('/media/before-after/seed-bk-1', { token: ctx.sophia.token }), 200);
});

test('CD-11', A, 'Avatar upload URL works in media mock mode', 'code: media.service mock', async (ctx) => {
  const r = expectStatus(await post('/media/upload/avatar', { contentType: 'image/jpeg' }, { token: ctx.qa2.token }), [200, 201], 'get upload URL');
  const url = r.data.uploadUrl ?? r.data.url;
  ok(url, `no upload URL in ${JSON.stringify(r.data)}`);
  const abs = url.startsWith('http') ? url : `http://localhost:4000${url}`;
  const put = await fetch(abs, { method: 'PUT', body: 'fake-image', headers: { 'Content-Type': 'image/jpeg' } });
  ok(put.status < 400, `uploading to ${url} → HTTP ${put.status}`);
});
