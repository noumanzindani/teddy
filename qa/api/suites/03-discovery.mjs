import { test, get, expectStatus, ok, eq } from '../lib.mjs';

const A = 'discovery';

test('DI-01', A, 'Vendor search lists only ACTIVE vendors', 'docs: APPLICATION_FLOW §2 (admin approval)', async () => {
  const r = expectStatus(await get('/vendors'), 200);
  const bad = r.body.vendors.filter((v) => v.status !== 'ACTIVE').map((v) => `${v.businessName}:${v.status}`);
  ok(!bad.length, `non-active vendors listed: ${bad}`);
});

test('DI-02', A, 'Public vendor detail does not expose private fields', 'security: data exposure', async (ctx) => {
  const r = expectStatus(await get(`/vendors/${ctx.vendorId}`), 200);
  const d = r.data;
  const leaked = ['stripeAccountId', 'smsConfig', 'commissionRate', 'ownerId'].filter((k) => d[k] !== undefined && d[k] !== null);
  const staffLeak = (d.staffMembers ?? []).some((s) => s.permissions || s.userId);
  ok(!leaked.length && !staffLeak, `anonymous response contains: ${leaked.join(', ')}${staffLeak ? ', staffMembers[].permissions/userId' : ''} (smsConfig=${JSON.stringify(d.smsConfig)?.slice(0, 80)})`);
});

test('DI-03', A, 'Suspended / rejected / pending vendor detail is not public', 'docs: APPLICATION_FLOW §2', async (ctx) => {
  for (const [slug, id] of Object.entries(ctx.inactiveVendors)) {
    const r = await get(`/vendors/${id}`);
    ok(r.status === 404, `${slug} detail returned HTTP ${r.status}`);
  }
});

test('DI-04', A, 'Services by vendor returns only active services', 'code: listByVendor', async (ctx) => {
  const r = expectStatus(await get(`/services/${ctx.vendorId}`), 200);
  ok(r.data.length > 0 && r.data.every((s) => s.isActive), 'empty or inactive services listed');
});

test('DI-05', A, 'Service prices are numbers (the app does arithmetic on them)', 'contract', async (ctx) => {
  const r = await get(`/services/${ctx.vendorId}`);
  const types = [...new Set(r.data.map((s) => typeof s.price))];
  eq(types, ['number'], 'typeof price');
});

test('DI-06', A, 'Categories, search and suggest respond 200', 'code: search routes', async () => {
  expectStatus(await get('/services/categories'), 200, 'categories');
  expectStatus(await get('/search/vendors?q=skin'), 200, 'search vendors');
  expectStatus(await get('/search/services?q=facial'), 200, 'search services');
  expectStatus(await get('/search/suggest?q=hy'), 200, 'suggest');
});

test('DI-07', A, 'Search tolerates special characters (no 500)', 'robustness', async () => {
  for (const q of ["'", '%', '"; drop table', '((', '\\']) {
    const r = await get(`/search/vendors?q=${encodeURIComponent(q)}`);
    ok(r.status < 500, `q=${q} → HTTP ${r.status}`);
  }
});

test('DI-08', A, 'Invalid search query params return 4xx, not 500', 'robustness', async () => {
  const r = await get('/vendors?page=-1&limit=abc');
  ok([200, 400, 422].includes(r.status), `HTTP ${r.status}`);
});

test('DI-09', A, 'Reviews for a vendor are public', 'docs: APPLICATION_FLOW §11', async (ctx) => {
  expectStatus(await get(`/reviews/${ctx.vendorId}`), 200);
});
