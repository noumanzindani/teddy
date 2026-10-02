import { test, get, patch, post, del, login, register, expectStatus, ok, eq, PW } from '../lib.mjs';

const A = 'profile';

test('PR-01', A, 'GET /users/me returns the profile without secrets', 'security', async (ctx) => {
  const r = expectStatus(await get('/users/me', { token: ctx.sophia.token }), 200);
  ok(!('passwordHash' in r.data) && !('pushTokens' in r.data), `secret fields present: ${Object.keys(r.data)}`);
});

test('PR-02', A, 'Updating first/last name persists', 'code: UpdateProfileSchema', async (ctx) => {
  expectStatus(await patch('/users/me', { firstName: 'Qatwo', lastName: 'Client' }, { token: ctx.qa2.token }), 200);
  eq((await get('/users/me', { token: ctx.qa2.token })).data.firstName, 'Qatwo', 'firstName');
});

test('PR-03', A, 'Client cannot raise their own role / points / tier', 'security: mass assignment', async () => {
  const u = await register('qa.massassign@example.com');
  await patch('/users/me', { role: 'admin', pointsBalance: 999999, tier: 'PLATINUM', isVerified: true }, { token: u.token });
  const me = (await get('/users/me', { token: u.token })).data;
  eq([me.role, me.pointsBalance, me.tier], ['client', 0, 'BRONZE'], 'role/points/tier after PATCH');
});

test('PR-04', A, 'Change password: the app\'s request actually changes the password', 'contract: ChangePasswordScreen.tsx:27', async () => {
  const u = await register('qa.changepw@example.com');
  const r = await patch('/users/me', { currentPassword: PW, newPassword: 'NewPass456!' }, { token: u.token });
  const newWorks = (await post('/auth/login', { email: 'qa.changepw@example.com', password: 'NewPass456!' })).status === 200;
  const oldWorks = (await post('/auth/login', { email: 'qa.changepw@example.com', password: PW })).status === 200;
  ok(newWorks && !oldWorks, `PATCH returned ${r.status} (app shows success), but new password works=${newWorks}, old password still works=${oldWorks}`);
});

test('PR-05', A, 'Change password with a WRONG current password is refused', 'security', async () => {
  const u = await register('qa.changepw2@example.com');
  const r = await patch('/users/me', { currentPassword: 'Wrong999!', newPassword: 'NewPass456!' }, { token: u.token });
  ok(r.status >= 400, `wrong current password accepted with HTTP ${r.status}`);
});

test('PR-06', A, 'Edit profile as the app sends it works for a user with no phone', 'contract: EditProfileScreen.tsx:53', async (ctx) => {
  // App sends: { firstName, lastName, email, phone: phone.trim() || user.phone } — user.phone is null for email sign-ups.
  const me = (await get('/users/me', { token: ctx.sophia.token })).data;
  const r = await patch('/users/me', { firstName: 'Sophia', lastName: 'Carter', email: me.email, phone: me.phone }, { token: ctx.sophia.token });
  expectStatus(r, 200, `edit profile (user.phone=${me.phone})`);
});

test('PR-07', A, 'Edit profile: an email change is either saved or refused, never silently dropped', 'contract: EditProfileScreen.tsx:53', async () => {
  const u = await register('qa.email.old@example.com');
  const r = await patch('/users/me', { firstName: 'QA', lastName: 'Tester', email: 'qa.email.new@example.com' }, { token: u.token });
  const me = (await get('/users/me', { token: u.token })).data;
  ok(r.status >= 400 || me.email === 'qa.email.new@example.com',
    `PATCH returned ${r.status} (app shows success) but email is still ${me.email}`);
});

test('PR-08', A, 'DELETE /users/me returns 204 and the session stops working', 'docs: UF account deletion', async () => {
  const u = await register('qa.delete.me@example.com');
  expectStatus(await del('/users/me', { token: u.token }), 204);
  const after = await get('/users/me', { token: u.token });
  ok(after.status >= 400, `deleted user can still call /users/me with the old access token (HTTP ${after.status})`);
});

test('PR-09', A, 'Push token: valid Expo token registered once; invalid format refused', 'code: PushTokenSchema', async (ctx) => {
  const token = 'ExponentPushToken[qa-test-token-1]';
  expectStatus(await post('/users/me/push-token', { token }, { token: ctx.qa2.token }), 200, 'register');
  expectStatus(await post('/users/me/push-token', { token }, { token: ctx.qa2.token }), 200, 'duplicate');
  expectStatus(await post('/users/me/push-token', { token: 'fcm:abc' }, { token: ctx.qa2.token }), [400, 422], 'invalid format');
});

test('PR-10', A, 'Notifications list + preferences get/patch', 'docs: APPLICATION_FLOW §13', async (ctx) => {
  expectStatus(await get('/notifications', { token: ctx.sophia.token }), 200, 'list');
  expectStatus(await get('/notifications/preferences', { token: ctx.sophia.token }), 200, 'get prefs');
  expectStatus(await patch('/notifications/preferences', { pushBookingUpdates: true }, { token: ctx.sophia.token }), 200, 'patch prefs');
  expectStatus(await req_readAll(ctx), 200, 'read-all');
});
const req_readAll = (ctx) => patch('/notifications/read-all', {}, { token: ctx.sophia.token });

test('PR-11', A, 'Notification preferences reject unknown / invalid fields', 'security: mass assignment', async (ctx) => {
  const r = await patch('/notifications/preferences', { userId: ctx.sophia.user.id, pushBookingUpdates: 'yes' }, { token: ctx.qa2.token });
  ok([400, 422].includes(r.status), `invalid preference payload accepted/errored with HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
});
