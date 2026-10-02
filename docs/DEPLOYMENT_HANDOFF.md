# Teddy — Deployment Handoff (company server)

Quick knowledge for a developer deploying Teddy to a company hosting environment.
For a throwaway/demo box, see `DEPLOY_SELF_HOSTED.md`. This doc focuses on a real,
production-grade deploy.

## 1. What the platform is

| Component | Stack | Notes |
|---|---|---|
| **API** | Node 20 + Express + TypeScript, Prisma ORM, Socket.IO | Port `4000`, routes under `/v1`, health at `/health` |
| **Postgres** | 15+ | Primary datastore (Prisma) |
| **Redis** | 7+ | Required — BullMQ jobs, Socket.IO adapter, caching, booking slot-locks |
| **Vendor panel** | Next.js (static export → `out/`) | Firebase site `teddy-vendor-app` |
| **User app** | React Native / Expo (web export → `dist/`) | Firebase site `teddy-user-app`; real users use the native APK |
| **Employee portal** | Next.js (`teddy-staff`, port 3003) | Not hosted yet — put on Vercel or a Node host |

Repo layout: `api/`, `Vendor/app/`, `User/app/`, `Employer/app/`, `docs/`.

## 2. API deployment (the core)

The API ships a multi-stage `api/Dockerfile`. Container entrypoint:
```
npx prisma migrate deploy && node dist/server.js
```
So **migrations apply automatically on every deploy** — no manual step. Deploy the Docker
image on whatever the company uses (ECS/Fargate, GKE/Cloud Run with min-instances≥1, a VM
with Docker, Kubernetes, etc.). It is a **stateful long-running server** (WebSockets) — do
**not** put it on serverless/FaaS that can't hold persistent connections.

### Required env vars
| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | Postgres connection string (use a **pooled** endpoint if available) |
| `REDIS_URL` | `redis://` or `rediss://` (TLS) — password/TLS supported (see Gotcha #1) |
| `JWT_PRIVATE_KEY_B64` / `JWT_PUBLIC_KEY_B64` | RS256 keypair, base64-encoded. Or use `JWT_*_KEY_PATH` to files. **Must be identical across all API instances.** |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | `15m` / `7d` |
| `CORS_ORIGINS` | Comma-separated front-end origins (also used by Socket.IO CORS) — no trailing slash |
| `PLATFORM_COMMISSION_RATE` / `POINTS_PER_DOLLAR` / `PAYOUT_DELAY_DAYS` / `AUTO_FINALIZE_HOURS` | Business config (`0.15` / `100` / `2` / `24`) |

### Mock modes → real integrations (IMPORTANT for production)
The API defaults every external integration to **mock mode**. For a real deployment, set
these to `false` and supply the corresponding real credentials:

| Flag | Turn off for real… | Needs |
|---|---|---|
| `PAYMENT_MOCK_MODE` | Stripe payments/payouts | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, connected-account setup |
| `EMAIL_MOCK_MODE` | Email (incl. invoices) | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |
| `OTP_MOCK_MODE` | SMS OTP | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| `PUSH_MOCK_MODE` | Push notifications | `EXPO_ACCESS_TOKEN` |
| `MEDIA_MOCK_MODE` | Media/photo uploads | `AWS_ACCESS_KEY_ID/SECRET`, `AWS_REGION`, `CLOUDFRONT_URL` |
| Google OAuth | Social login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

> Note: invoices are currently shared **in-app** via notifications with a clearly-marked
> hook for email. Wiring real email invoices means turning off `EMAIL_MOCK_MODE` and
> filling the TODO in `api/src/services/invoice.service.ts`.

### Background jobs
BullMQ workers run **in-process** with the API (`api/src/jobs/index.ts`): booking
reminders, no-show detection, payout release, and **auto-finalize** (settles a completed
booking's balance if the client doesn't confirm within `AUTO_FINALIZE_HOURS`). They need
Redis. If you run multiple API replicas, the workers are safe to run on all of them
(BullMQ coordinates via Redis), but confirm you're comfortable with that or split a
dedicated worker instance.

## 3. Database

- Managed Postgres recommended (RDS/Cloud SQL/etc.) with automated backups.
- Migrations live in `api/prisma/migrations/` and apply via `prisma migrate deploy`
  (already in the container CMD, or run in a CI/CD deploy step).
- **Seeding** (demo/sample data) is `npm run db:seed` → `ts-node prisma/seed.ts`. `ts-node`
  is a **devDependency**, so it is NOT in the production image (`npm ci --omit=dev`). To
  seed, run it from a full-deps context (the `Dockerfile.dev` image, or `npm ci` in CI).
  Production environments usually **don't** seed — create real accounts instead.

## 4. Front-ends

All API calls go to `${API_URL}/v1`.
- **Vendor** & **Employee**: read `NEXT_PUBLIC_API_URL` at build time.
- **User app**: currently a constant in `User/app/src/utils/api.ts` — set it to the prod
  API URL (or refactor to an env var).

Build + host:
```bash
# Vendor (static export)
cd Vendor/app && NEXT_PUBLIC_API_URL="https://api.company.com" npm run build   # -> out/
# User web (Expo)
cd User/app && npm run build:web                                               # -> dist/
# Employee (Next.js) — deploy to Vercel/Node with NEXT_PUBLIC_API_URL set
```
Then set `CORS_ORIGINS` on the API to every front-end origin.

## 5. Gotchas discovered (read these)

1. **Redis auth/TLS** — the BullMQ connection now parses the full `REDIS_URL`
   (username/password, `tls` for `rediss://`). Any managed Redis with a password works;
   an earlier version only used host+port and silently failed to connect.
2. **HTTPS / mixed content** — front-ends are HTTPS, so the API **must** be HTTPS too or
   browsers block the calls. Terminate TLS at a load balancer / reverse proxy.
3. **CORS + WebSockets** — `CORS_ORIGINS` drives both REST CORS and the Socket.IO handshake.
   Missing an origin breaks live updates (timer/chat/invoice), not just REST.
4. **Stripe webhook** — mounted with a **raw body parser** at
   `POST /v1/payments/webhooks/stripe`, before the JSON parser. Keep that route order and
   point the Stripe dashboard webhook there.
5. **Socket.IO scaling** — a Redis adapter is wired in for multi-instance. Behind a load
   balancer, enable **sticky sessions** (or WebSocket-only transport) for the handshake.
6. **JWT keys must match across instances** — RS256; a mismatch invalidates tokens issued
   by another replica.
7. **Migrations run on boot** — if a migration fails, the container won't start (fail-fast).
   Watch deploy logs on the first rollout after new migrations.

## 6. Minimal go-live checklist
- [ ] Managed Postgres + Redis provisioned, `DATABASE_URL` / `REDIS_URL` set
- [ ] RS256 JWT keypair generated, set on all instances (base64 env or mounted files)
- [ ] All `*_MOCK_MODE=false` with real Stripe/SendGrid/Twilio/Expo/AWS creds (or keep
      mocked intentionally for a staging/demo)
- [ ] API served over HTTPS; `CORS_ORIGINS` lists every front-end origin
- [ ] `prisma migrate deploy` runs on deploy (in CMD or CI/CD)
- [ ] Front-ends built with the prod `NEXT_PUBLIC_API_URL` and deployed
- [ ] Stripe webhook pointed at `/v1/payments/webhooks/stripe`
- [ ] `/health` wired to the platform health check
