// Tiny zero-dependency test harness for the Teddy API (Node 24: global fetch/WebSocket).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const HOST = process.env.API_HOST ?? 'http://localhost:4000';
export const B = `${HOST}/v1`;
export const PW = 'Password123!';
export const API_LOG = path.join(ROOT, 'qa/evidence/api.log');

// ── HTTP ─────────────────────────────────────────────────────────────────────
export async function req(method, p, { token, body, headers } = {}) {
  const res = await fetch(B + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json, data: json?.data ?? json };
}
export const get = (p, o) => req('GET', p, o);
export const post = (p, body, o = {}) => req('POST', p, { ...o, body });
export const patch = (p, body, o = {}) => req('PATCH', p, { ...o, body });
export const del = (p, o) => req('DELETE', p, o);

export async function login(email, password = PW) {
  const r = await post('/auth/login', { email, password });
  if (r.status !== 200) throw new Blocked(`login ${email} → ${r.status} ${short(r.body)}`);
  return { token: r.data.accessToken, refresh: r.data.refreshToken, user: r.data.user };
}

export async function register(email, extra = {}) {
  const r = await post('/auth/register', { firstName: 'QA', lastName: 'Tester', email, password: PW, ...extra });
  if (r.status !== 201 && r.status !== 200) throw new Blocked(`register ${email} → ${r.status} ${short(r.body)}`);
  return { token: r.data.accessToken, refresh: r.data.refreshToken, user: r.data.user };
}

// Latest mock OTP printed by the API for a phone number.
export function otpFromLog(phone) {
  const log = readFileSync(API_LOG, 'utf8');
  const re = new RegExp(`\\[OTP MOCK\\] Code for \\${phone}: (\\d{6})`, 'g');
  let m, code = null;
  while ((m = re.exec(log))) code = m[1];
  return code;
}

export function redisCli(...args) {
  return execFileSync('/opt/homebrew/opt/redis/bin/redis-cli', args, { encoding: 'utf8' }).trim();
}

export function sql(query) {
  return execFileSync('/opt/homebrew/opt/postgresql@16/bin/psql', ['-d', 'teddy_test', '-tAc', query], { encoding: 'utf8' }).trim();
}

// Unique future slots (UTC) so tests never collide with each other or seed data.
let slotN = 0;
export function nextSlot({ daysAhead } = {}) {
  const n = slotN++;
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (daysAhead ?? 8 + Math.floor(n / 8)));
  d.setUTCHours(9 + (n % 8), 0, 0, 0);
  return d.toISOString();
}
export const hoursFromNow = (h) => new Date(Date.now() + h * 3600e3).toISOString();

// ── Minimal Socket.IO v4 client over native WebSocket ─────────────────────────
export function socketConnect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${HOST.replace('http', 'ws')}/socket.io/?EIO=4&transport=websocket`);
    const events = [];
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 5000);
    ws.onmessage = ({ data }) => {
      const s = String(data);
      if (s === '2') return ws.send('3'); // ping → pong
      if (s.startsWith('0')) return ws.send(`40${JSON.stringify({ token })}`);
      if (s.startsWith('40')) { clearTimeout(timer); resolve(api); }
      if (s.startsWith('44')) { clearTimeout(timer); reject(new Error(`socket auth refused ${s}`)); }
      if (s.startsWith('42')) events.push(JSON.parse(s.slice(2)));
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(e); };
    const api = {
      emit: (ev, arg) => ws.send(`42${JSON.stringify([ev, arg])}`),
      events,
      close: () => ws.close(),
    };
  });
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Test registry ────────────────────────────────────────────────────────────
export class Blocked extends Error {}
const tests = [];
export const results = [];

/**
 * @param id      stable test id, e.g. "BK-03"
 * @param area    suite area
 * @param name    what is expected (phrased as the correct behaviour)
 * @param source  where the expectation comes from: "docs: …", "code: …", "security", "contract"
 */
export function test(id, area, name, source, fn) {
  tests.push({ id, area, name, source, fn });
}

export async function runTests(ctx, filter) {
  for (const t of tests) {
    if (filter && !filter.test(t.id) && !filter.test(t.area)) continue;
    const started = Date.now();
    let status = 'PASS', detail = '';
    try {
      const note = await t.fn(ctx);
      if (note) detail = String(note);
    } catch (e) {
      status = e instanceof Blocked ? 'BLOCKED' : 'FAIL';
      detail = e.message;
    }
    const r = { ...t, fn: undefined, status, detail, ms: Date.now() - started };
    results.push(r);
    const icon = { PASS: '✅', FAIL: '❌', BLOCKED: '⛔' }[status];
    console.log(`${icon} ${t.id.padEnd(7)} ${t.name}${detail ? `\n          ↳ ${detail}` : ''}`);
  }
  return results;
}

// ── Assertions ───────────────────────────────────────────────────────────────
export function short(v, n = 220) {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s && s.length > n ? `${s.slice(0, n)}…` : s;
}
export function expectStatus(res, expected, what = '') {
  const ok = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
  if (!ok) throw new Error(`${what ? `${what}: ` : ''}expected HTTP ${expected}, got ${res.status} ${short(res.body)}`);
  return res;
}
/** Expect the request to be refused (401/403/404). A 2xx means the protection is missing. */
export function expectDenied(res, what = '') {
  if (res.status >= 200 && res.status < 300) {
    throw new Error(`${what ? `${what}: ` : ''}NOT DENIED — got HTTP ${res.status} ${short(res.body)}`);
  }
  if (![400, 401, 403, 404, 409].includes(res.status)) {
    throw new Error(`${what ? `${what}: ` : ''}denied but with unexpected HTTP ${res.status} ${short(res.body)}`);
  }
  return res;
}
export function eq(actual, expected, what) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what}: expected ${short(expected)}, got ${short(actual)}`);
  }
}
export function ok(cond, what) {
  if (!cond) throw new Error(what);
}
