#!/usr/bin/env node
// Teddy API test run.  Usage:
//   node qa/api/run.mjs                 # reset DB to seed, run everything
//   node qa/api/run.mjs --no-reset      # run against current data
//   node qa/api/run.mjs --only SE       # only tests whose id/area matches /SE/
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, get, patch, login, register, runTests, results, sql } from './lib.mjs';

const args = process.argv.slice(2);
const only = args.includes('--only') ? new RegExp(args[args.indexOf('--only') + 1]) : null;

if (!args.includes('--no-reset')) {
  execFileSync(path.join(ROOT, 'qa/reset.sh'), { stdio: 'inherit' });
}

// ── Shared context: seeded accounts + a fresh second client ──────────────────
const ctx = { shared: {} };
ctx.sophia = await login('sophia.carter@example.com');
ctx.emily = await login('emily@skincuress.com');
ctx.camille = await login('camille@glowup.com');
ctx.sarah = await login('sarah.mitchell@skincuress.com');
ctx.admin = await login('admin@teddy.app');
// --no-reset: the account already exists, so log in instead of registering.
ctx.qa2 = await register('qa.client2@example.com', { firstName: 'QA', lastName: 'Client Two' }).catch(() => login('qa.client2@example.com'));

const vendors = (await get('/vendors')).body.vendors;
ctx.vendorId = vendors.find((v) => v.slug === 'skincuress-salon').id;
ctx.otherVendorId = vendors.find((v) => v.slug === 'glow-up-aesthetics').id;
ctx.inactiveVendors = Object.fromEntries(
  sql(`select slug, id from "Vendor" where status <> 'ACTIVE'`).split('\n').filter(Boolean).map((l) => l.split('|')),
);
ctx.svc = { hydra: 'seed-svc-hydrafacial', depositSvc: 'seed-svc-body-wrap' };
ctx.staffId = sql(`select s.id from "StaffMember" s join "User" u on u.id = s."userId" where u.email = 'sarah.mitchell@skincuress.com'`);
ctx.otherStaffId = sql(`select id from "StaffMember" where "vendorId" = '${ctx.otherVendorId}' limit 1`) || null;
ctx.threadId = (await get('/chat/threads', { token: ctx.sophia.token })).data[0]?.id;

// Vendor action (legit, via API): Body Wrap takes a 30% deposit, so deposit maths can be tested.
await patch(`/services/${ctx.svc.depositSvc}`, { depositPercentage: 30 }, { token: ctx.emily.token });

// ── Suites (import order = run order) ────────────────────────────────────────
for (const f of ['01-auth', '02-profile', '03-discovery', '04-booking', '05-lifecycle', '06-chat', '07-profile-data', '08-security', '09-app-contract']) {
  await import(`./suites/${f}.mjs`);
}
console.log(`\nTeddy API tests — ${new Date().toISOString()}\n`);
await runTests(ctx, only);

// ── Summary + evidence files ─────────────────────────────────────────────────
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${results.length} tests: ${count('PASS')} passed, ${count('FAIL')} failed, ${count('BLOCKED')} blocked`);

const md = [
  `# API test results — ${new Date().toISOString()}`,
  '',
  `**${results.length} tests: ${count('PASS')} passed, ${count('FAIL')} failed, ${count('BLOCKED')} blocked**`,
  '',
  '| ID | Area | Expected behaviour | Source | Result | Detail |',
  '|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.area} | ${r.name} | ${r.source} | ${r.status} | ${r.detail.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`),
].join('\n');
writeFileSync(path.join(ROOT, 'qa/evidence/api-results.md'), `${md}\n`);
writeFileSync(path.join(ROOT, 'qa/evidence/api-results.json'), JSON.stringify(results, null, 2));
process.exitCode = count('FAIL') ? 1 : 0;
