import { test, get, post, patch, expectStatus, expectDenied, ok, eq, socketConnect, sleep } from '../lib.mjs';

const A = 'chat';

test('CH-01', A, 'Client lists and opens their own thread', 'docs: AF §9', async (ctx) => {
  const list = expectStatus(await get('/chat/threads', { token: ctx.sophia.token }), 200).data;
  ok(list.some((t) => t.id === ctx.threadId), 'seeded thread missing');
  expectStatus(await get(`/chat/threads/${ctx.threadId}`, { token: ctx.sophia.token }), 200);
});

test('CH-02', A, 'Client sends a message using the API contract ({ body })', 'code: SendMessageSchema', async (ctx) => {
  expectStatus(await post(`/chat/threads/${ctx.threadId}/messages`, { body: 'Hello from QA' }, { token: ctx.sophia.token }), 201);
});

test('CH-03', A, 'Client sends a message the way the app does ({ content })', 'contract: ChatThreadScreen.tsx:77', async (ctx) => {
  const r = await post(`/chat/threads/${ctx.threadId}/messages`, { content: 'Sent like the app' }, { token: ctx.sophia.token });
  expectStatus(r, [200, 201], 'app-shaped send');
});

test('CH-04', A, 'Message fields match what the app renders (content, senderRole)', 'contract: ApiMessage in utils/api.ts', async (ctx) => {
  const t = (await get(`/chat/threads/${ctx.threadId}`, { token: ctx.sophia.token })).data;
  const m = (t.messages ?? [])[0] ?? {};
  const missing = ['content', 'senderRole', 'createdAt'].filter((k) => !(k in m));
  ok(!missing.length, `message is missing ${missing} (has: ${Object.keys(m)})`);
});

test('CH-05', A, 'Client cannot start a new thread (vendor starts chats)', 'docs: AF §9', async (ctx) => {
  expectDenied(await post('/chat/threads', { clientId: ctx.sophia.user.id }, { token: ctx.qa2.token }));
});

test('CH-06', A, 'Mark own thread read', 'code', async (ctx) => {
  expectStatus(await patch(`/chat/threads/${ctx.threadId}/read`, {}, { token: ctx.sophia.token }), 200);
});

test('CH-07', A, 'Empty message refused', 'code: SendMessageSchema', async (ctx) => {
  expectStatus(await post(`/chat/threads/${ctx.threadId}/messages`, { body: '' }, { token: ctx.sophia.token }), [400, 422]);
});

test('CH-08', A, 'Vendor message reaches the client in real time (socket)', 'docs: AF §9', async (ctx) => {
  const s = await socketConnect(ctx.sophia.token);
  s.emit('chat:join', ctx.threadId);
  await sleep(300);
  await post(`/chat/threads/${ctx.threadId}/messages`, { body: 'Realtime ping from salon' }, { token: ctx.emily.token });
  await sleep(800);
  s.close();
  ok(s.events.some((e) => JSON.stringify(e).includes('Realtime ping from salon')), `no realtime event (got ${s.events.map((e) => e[0])})`);
});
