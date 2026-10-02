import { test, post, get, del, login, register, expectStatus, expectDenied, ok, eq, otpFromLog, sleep, PW } from '../lib.mjs';

const A = 'auth';

test('AU-01', A, 'Register a new client returns 201 + token pair', 'docs: APPLICATION_FLOW §1', async (ctx) => {
  eq(ctx.qa2.user.role, 'client', 'role');
  ok(ctx.qa2.token && ctx.qa2.refresh, 'token pair missing');
});

test('AU-02', A, 'Duplicate email registration is refused (409)', 'code: auth.service register', async () => {
  const r = await post('/auth/register', { firstName: 'a', lastName: 'b', email: 'qa.client2@example.com', password: PW });
  expectStatus(r, 409);
});

test('AU-03', A, 'Duplicate email with different letter case is refused', 'best practice: emails are case-insensitive', async () => {
  await register('qa.case@example.com');
  const r = await post('/auth/register', { firstName: 'a', lastName: 'b', email: 'QA.Case@Example.com', password: PW });
  expectStatus(r, 409, 'second account with same email in different case');
});

test('AU-04', A, 'Weak password rejected (400/422)', 'code: RegisterSchema (8+ chars, upper, digit)', async () => {
  const r = await post('/auth/register', { firstName: 'a', lastName: 'b', email: 'weak@example.com', password: 'password' });
  expectStatus(r, [400, 422]);
});

test('AU-05', A, 'Invalid email rejected (400/422)', 'code: RegisterSchema', async () => {
  expectStatus(await post('/auth/register', { firstName: 'a', lastName: 'b', email: 'nope', password: PW }), [400, 422]);
});

test('AU-06', A, 'Login with correct password returns access + refresh token', 'docs: SYSTEM_ARCHITECTURE Layer 5', async () => {
  const s = await login('sophia.carter@example.com');
  ok(s.token && s.refresh, 'missing tokens');
  ok(!('passwordHash' in s.user), 'passwordHash leaked in login response');
});

test('AU-07', A, 'Wrong password and unknown email give the same 401 message', 'security: no account enumeration', async () => {
  const a = await post('/auth/login', { email: 'sophia.carter@example.com', password: 'Wrong123!' });
  const b = await post('/auth/login', { email: 'nobody@example.com', password: 'Wrong123!' });
  expectStatus(a, 401); expectStatus(b, 401);
  eq(a.body?.error?.message, b.body?.error?.message, 'error messages differ');
});

test('AU-08', A, 'Login email is case-insensitive', 'best practice', async () => {
  expectStatus(await post('/auth/login', { email: 'Sophia.Carter@Example.com', password: PW }), 200);
});

test('AU-09', A, 'Refresh token rotates; reusing the old one is refused', 'docs: SYSTEM_ARCHITECTURE Layer 5', async () => {
  const s = await login('isabelle.park@example.com');
  const r1 = expectStatus(await post('/auth/token/refresh', { refreshToken: s.refresh }), 200, 'first refresh');
  ok(r1.data.accessToken && r1.data.refreshToken, 'no new pair');
  expectDenied(await post('/auth/token/refresh', { refreshToken: s.refresh }), 'reused refresh token');
});

test('AU-10', A, 'Logout revokes the refresh token', 'docs: UPDF "logout invalidates refresh token"', async () => {
  const s = await login('rachel.torres@example.com');
  expectStatus(await post('/auth/logout', {}, { token: s.token }), 204, 'logout');
  expectDenied(await post('/auth/token/refresh', { refreshToken: s.refresh }), 'refresh after logout');
});

test('AU-11', A, 'Phone OTP: send, wrong code refused, right code logs in', 'code: auth.service sendOtp/verifyOtp', async () => {
  const phone = '+15555550101';
  expectStatus(await post('/auth/login/phone/send', { phone }), [200, 201, 204], 'send');
  await sleep(300);
  const code = otpFromLog(phone);
  ok(code, 'OTP not found in API log');
  const wrong = code === '000000' ? '111111' : '000000';
  expectDenied(await post('/auth/login/phone/verify', { phone, code: wrong }), 'wrong code');
  const r = expectStatus(await post('/auth/login/phone/verify', { phone, code }), 200, 'right code');
  ok(r.data.accessToken, 'no token');
});

test('AU-12', A, 'OTP send is limited to 3 per phone per 10 min', 'code: sendOtp rate limit', async () => {
  const phone = '+15555550102';
  for (let i = 0; i < 3; i++) await post('/auth/login/phone/send', { phone });
  expectStatus(await post('/auth/login/phone/send', { phone }), 429, '4th send');
});

test('AU-13', A, 'A deleted account cannot log in with password', 'docs: UF account deletion', async () => {
  const u = await register('qa.deleted.pw@example.com');
  expectStatus(await del('/users/me', { token: u.token }), 204, 'delete');
  expectDenied(await post('/auth/login', { email: 'qa.deleted.pw@example.com', password: PW }), 'login after delete');
});

test('AU-14', A, 'A deleted account cannot log in with phone OTP', 'security: deleted accounts stay locked', async () => {
  const phone = '+15555550103';
  const u = await register('qa.deleted.otp@example.com', { phone });
  expectStatus(await del('/users/me', { token: u.token }), 204, 'delete');
  await post('/auth/login/phone/send', { phone });
  await sleep(300);
  const code = otpFromLog(phone);
  ok(code, 'OTP not found in log');
  expectDenied(await post('/auth/login/phone/verify', { phone, code }), 'OTP login of deleted account');
});

test('AU-15', A, 'A deleted account\'s refresh token stops working', 'security', async () => {
  const u = await register('qa.deleted.rt@example.com');
  await del('/users/me', { token: u.token });
  expectDenied(await post('/auth/token/refresh', { refreshToken: u.refresh }), 'refresh after delete');
});

test('AU-16', A, 'Requests without / with a tampered token are refused (401)', 'security', async (ctx) => {
  expectStatus(await get('/users/me'), 401, 'no token');
  const t = ctx.sophia.token;
  const tampered = t.slice(0, -4) + (t.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  expectStatus(await get('/users/me', { token: tampered }), 401, 'tampered token');
});

test('AU-26', A, 'A refresh token is not accepted as an access token', 'security: jwt.ts verifyAccessToken ignores token type', async (ctx) => {
  const r = expectStatus(await post('/auth/login', { email: 'qa.client2@example.com', password: PW }), 200, 'login');
  const refresh = r.data.refreshToken;
  ok(refresh, 'login returned no refresh token');
  const me = await get('/users/me', { token: refresh });
  ok(me.status === 401, `GET /users/me with the 7-day refresh token as Bearer → HTTP ${me.status}`);
});
