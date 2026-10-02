# TEDDY Platform — System Architecture Document
> **Status:** LOCKED REFERENCE · Version 1.0 · Last Updated: May 2026
> **Author:** TEDDY Engineering Team
> **Scope:** All four platform surfaces — Client Mobile App, Vendor Web Dashboard, Staff Web Portal, Admin Web Panel

---

## Table of Contents
1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Infrastructure Architecture](#4-infrastructure-architecture)
5. [Deployment Architecture](#5-deployment-architecture)
6. [API Architecture](#6-api-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Real-Time Architecture (WebSocket)](#9-real-time-architecture-websocket)
10. [Booking Engine](#10-booking-engine)
11. [Search Architecture](#11-search-architecture)
12. [Caching Strategy](#12-caching-strategy)
13. [Payment & Payout Architecture](#13-payment--payout-architecture)
14. [Media & File Architecture](#14-media--file-architecture)
15. [Security Architecture](#15-security-architecture)
16. [Scalability Plan](#16-scalability-plan)
17. [Design System Tokens](#17-design-system-tokens)
18. [Environment Variables Reference](#18-environment-variables-reference)

---

## 1. Platform Overview

TEDDY is a pay-per-booking beauty and salon marketplace. It connects clients with vendors (salon owners) and their staff (stylists, nail techs, etc.) through a seamless booking and payment experience.

### The Four Surfaces

| Surface | Platform | URL | Primary User |
|---|---|---|---|
| **Client Mobile App** | React Native + Expo SDK 54 | App Store / Google Play | End customers |
| **Vendor Web Dashboard** | Next.js 14 App Router | vendor.teddy.app | Salon owners / managers |
| **Staff Web Portal** | Next.js 14 App Router | staff.teddy.app | Individual stylists / technicians |
| **Admin Web Panel** | Next.js 14 App Router | admin.teddy.app | TEDDY platform operators |

### Core Business Rules
- Pay-per-booking model — clients pay at time of booking
- Commission: TEDDY takes 15% of each booking; vendor receives 85%
- Payout released T+2 days after booking completion
- Chat is **vendor-initiated only** (per SOW v4)
- Staff members are invited by vendors — they cannot self-register
- Vendors require admin approval before going live
- Waitlist system for fully-booked time slots
- Loyalty points awarded to clients on booking completion

---

## 2. Technology Stack

### Mobile — Client App
| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Styling | NativeWind v4 (TailwindCSS for RN) |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| State Management | Zustand + AsyncStorage (persisted) |
| Secure Storage | expo-secure-store (JWT tokens) |
| HTTP Client | Axios with interceptors |
| Real-time | Socket.IO client |
| Payments | Stripe React Native SDK |
| Maps | React Native Maps + Google Maps API |
| Push Notifications | Expo Notifications + EAS |
| Image Picker | expo-image-picker |
| Date/Time | @react-native-community/datetimepicker |
| Animations | react-native-reanimated v3 |
| OTA Updates | expo-updates |

### Web — Vendor / Staff / Admin
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS + shadcn/ui |
| State Management | Zustand + React Query (TanStack) |
| HTTP Client | Axios / fetch with React Query |
| Real-time | Socket.IO client |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| Date/Calendar | date-fns + react-big-calendar |

### Backend — API Server
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| ORM | Prisma 5 |
| Primary Database | PostgreSQL 15 |
| Cache / Pub-Sub | Redis 7 (ElastiCache) |
| Search | Elasticsearch 8 (AWS OpenSearch) |
| Job Queue | BullMQ (Redis-backed) |
| WebSocket | Socket.IO 4 |
| Validation | Zod |
| Auth | JWT (jsonwebtoken) + bcrypt |
| File Uploads | AWS S3 + presigned URLs |
| Image CDN | CloudFront + Lambda@Edge |

### External Services
| Service | Purpose |
|---|---|
| Stripe | Payments, refunds, vendor Connect payouts |
| Expo Push | Mobile push notifications |
| SendGrid | Transactional email |
| Twilio | SMS OTP verification |
| Google Maps API | Geolocation, distance, map display |
| Cloudflare | CDN, WAF, DDoS protection |
| AWS S3 | File storage |
| AWS CloudFront | Global CDN for media |
| GitHub Actions | CI/CD pipeline |

### Monorepo Tooling
| Tool | Purpose |
|---|---|
| Turborepo | Monorepo orchestration + build caching |
| pnpm | Package manager (workspaces) |
| TypeScript 5 | Shared types across all apps |
| ESLint + Prettier | Code quality |
| Vitest | Unit testing |
| Playwright | E2E testing (web) |
| Detox | E2E testing (mobile) |

---

## 3. Monorepo Structure

```
teddy/                                          ← Turborepo root
├── turbo.json                                  ← Pipeline: build, test, lint, dev
├── package.json                                ← Root workspace (pnpm)
├── pnpm-workspace.yaml
├── .env.example                                ← All environment variables documented
├── .github/
│   └── workflows/
│       ├── ci.yml                              ← Run on every PR
│       ├── deploy-staging.yml                  ← Push to main
│       └── deploy-production.yml               ← Manual release tag
│
├── apps/
│   ├── user-mobile/                            ← Expo React Native (Client App)
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── tailwind.config.js
│   │   ├── src/
│   │   │   ├── navigation/
│   │   │   │   ├── types.ts                    ← Full typed RootStackParamList
│   │   │   │   ├── RootNavigator.tsx
│   │   │   │   ├── AuthNavigator.tsx
│   │   │   │   ├── OnboardingNavigator.tsx
│   │   │   │   └── TabNavigator.tsx
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── home/
│   │   │   │   ├── discover/
│   │   │   │   ├── bookings/
│   │   │   │   ├── chat/
│   │   │   │   ├── profile/
│   │   │   │   ├── rewards/
│   │   │   │   └── notifications/
│   │   │   ├── store/
│   │   │   │   ├── index.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── goals.ts
│   │   │   │   ├── mood.ts
│   │   │   │   ├── journal.ts
│   │   │   │   └── reminders.ts
│   │   │   ├── hooks/
│   │   │   │   └── useImagePicker.ts
│   │   │   └── components/
│   │   │       └── primitives/
│   │   │           ├── GradientButton.tsx
│   │   │           ├── ConfirmPopup.tsx
│   │   │           └── TimePickerRow.tsx
│   │   └── package.json
│   │
│   ├── vendor-web/                             ← Next.js 14 (Vendor Dashboard)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx                  ← Sidebar + top nav
│   │   │       ├── page.tsx                    ← Overview / KPIs
│   │   │       ├── bookings/page.tsx
│   │   │       ├── calendar/page.tsx
│   │   │       ├── services/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── clients/page.tsx
│   │   │       ├── chat/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   │
│   ├── staff-web/                              ← Next.js 14 (Staff Portal)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   └── (portal)/
│   │   │       ├── layout.tsx
│   │   │       ├── schedule/page.tsx
│   │   │       ├── clients/page.tsx
│   │   │       ├── earnings/page.tsx
│   │   │       ├── performance/page.tsx
│   │   │       └── chat/page.tsx
│   │   ├── components/
│   │   └── package.json
│   │
│   ├── admin-web/                              ← Next.js 14 (Admin Panel)
│   │   ├── app/
│   │   │   └── (admin)/
│   │   │       ├── layout.tsx
│   │   │       ├── vendors/page.tsx            ← Approval queue
│   │   │       ├── users/page.tsx
│   │   │       ├── disputes/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── payouts/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   └── package.json
│   │
│   └── api/                                    ← Express.js API Server
│       ├── src/
│       │   ├── server.ts                       ← Express app + Socket.IO bootstrap
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── user.routes.ts
│       │   │   ├── vendor.routes.ts
│       │   │   ├── service.routes.ts
│       │   │   ├── staff.routes.ts
│       │   │   ├── booking.routes.ts
│       │   │   ├── payment.routes.ts
│       │   │   ├── review.routes.ts
│       │   │   ├── search.routes.ts
│       │   │   ├── chat.routes.ts
│       │   │   ├── media.routes.ts
│       │   │   ├── notification.routes.ts
│       │   │   └── admin.routes.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── booking.service.ts
│       │   │   ├── payment.service.ts
│       │   │   ├── search.service.ts
│       │   │   ├── notification.service.ts
│       │   │   ├── chat.service.ts
│       │   │   ├── media.service.ts
│       │   │   └── rewards.service.ts
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts          ← JWT verify + attach user
│       │   │   ├── rbac.middleware.ts          ← Role + scope enforcement
│       │   │   └── rateLimit.middleware.ts     ← Redis sliding window
│       │   ├── socket/
│       │   │   ├── index.ts                    ← Socket.IO server setup
│       │   │   ├── chat.handler.ts
│       │   │   ├── booking.handler.ts
│       │   │   └── notification.handler.ts
│       │   ├── jobs/
│       │   │   ├── bookingReminder.job.ts      ← 24h before booking push
│       │   │   ├── payoutRelease.job.ts        ← T+2 auto-payout trigger
│       │   │   ├── noShowDetection.job.ts      ← Auto no-show after window
│       │   │   └── searchReindex.job.ts        ← Nightly ES full re-index
│       │   ├── webhooks/
│       │   │   └── stripe.webhook.ts
│       │   └── prisma/
│       │       ├── client.ts
│       │       └── schema.prisma
│       └── package.json
│
└── packages/
    ├── types/                                  ← @teddy/types
    │   └── src/
    │       ├── user.types.ts
    │       ├── vendor.types.ts
    │       ├── booking.types.ts
    │       ├── payment.types.ts
    │       ├── chat.types.ts
    │       └── api.types.ts
    │
    ├── api-client/                             ← @teddy/api-client
    │   └── src/
    │       ├── client.ts                       ← Axios instance + auto token refresh
    │       └── endpoints/
    │           ├── auth.ts
    │           ├── user.ts
    │           ├── vendor.ts
    │           ├── booking.ts
    │           ├── payment.ts
    │           ├── chat.ts
    │           └── search.ts
    │
    ├── ui-tokens/                              ← @teddy/ui-tokens
    │   └── src/
    │       ├── colors.ts
    │       │   # gold:    #B89766 → #E0C58A (gradient)
    │       │   # sage:    #7E8A6E
    │       │   # cream:   #E5E2D0
    │       │   # ink:     #1A1A1A
    │       │   # surface: #F7F5EE
    │       ├── typography.ts
    │       └── spacing.ts
    │
    └── validators/                             ← @teddy/validators
        └── src/
            ├── booking.schema.ts               ← Zod schemas (shared FE + BE)
            ├── vendor.schema.ts
            ├── user.schema.ts
            └── payment.schema.ts
```

---

## 4. Infrastructure Architecture

```
CLIENTS                          CDN LAYER                    ORIGIN
┌──────────────┐            ┌──────────────────┐
│ iOS App      │────────┐   │  Cloudflare CDN  │    ┌────────────────────┐
│ (Expo/RN)    │        │   │  • Static assets │    │   Load Balancer    │
└──────────────┘        ├──▶│  • Image proxy   │───▶│   (Nginx / ALB)   │
┌──────────────┐        │   │  • DDoS protect  │    │   SSL Termination  │
│ Android App  │────────┘   │  • Edge cache    │    └─────────┬──────────┘
│ (Expo/RN)    │            └──────────────────┘              │
└──────────────┘                                              │
┌──────────────┐            ┌──────────────────┐              │
│ Vendor Web   │───────────▶│  Vercel          │              │
│ (Next.js)    │            │  Edge Network    │              │
└──────────────┘            └────────┬─────────┘              │
┌──────────────┐                     │                        │
│ Staff Web    │─────────────────────┘                        │
│ (Next.js)    │                                              ▼
└──────────────┘                              ┌───────────────────────────┐
┌──────────────┐                              │       API GATEWAY         │
│ Admin Web    │─────────────────────────────▶│  Express.js Server        │
│ (Next.js)    │                              │  • Rate Limiting          │
└──────────────┘                              │  • JWT Auth Middleware     │
                                              │  • RBAC Enforcement        │
                                              │  • Request Routing         │
                                              └────────────┬──────────────┘
                                                           │
                        ┌──────────────────────────────────┤
                        │                                  │
              ┌─────────▼────────┐              ┌──────────▼──────────┐
              │  PostgreSQL 15   │              │  Redis 7 Cluster    │
              │  (RDS Multi-AZ)  │              │  • Session/Cache    │
              │  Primary DB      │              │  • Pub/Sub (WS)     │
              └──────────────────┘              │  • Rate Limiting    │
                                                │  • Job Queue        │
              ┌───────────────────┐             └─────────────────────┘
              │  Elasticsearch 8  │
              │  (AWS OpenSearch)  │             ┌─────────────────────┐
              │  Vendor search    │             │  AWS S3 + CloudFront│
              │  Geo queries      │             │  • Avatars          │
              └───────────────────┘             │  • Portfolio photos │
                                                │  • Before/After     │
                                                │  • Chat media       │
                                                └─────────────────────┘
```

### Application Service Layer

| Service | Responsibility |
|---|---|
| **Auth Service** | JWT issue/refresh, OTP, Google OAuth |
| **Booking Engine** | Slot availability, lock, waitlist, state machine |
| **Payment Service** | Stripe intent, capture, refund, payout |
| **Search Service** | Elasticsearch geo+filter queries, autocomplete |
| **Chat Service** | Socket.IO, Redis pub/sub, message persistence |
| **Notification Service** | Expo Push, SendGrid email, in-app badge |
| **Media Service** | S3 presigned URLs, CloudFront delivery |
| **Review Engine** | Post-booking only, fraud check, rating calc |
| **Analytics Service** | Booking metrics, revenue, staff performance |
| **Rewards Service** | Points award, tier upgrades, redemption |

---

## 5. Deployment Architecture

### Environments

| Environment | Trigger | URL |
|---|---|---|
| **Development** | Local + ngrok | localhost |
| **Staging** | Push to `main` branch | staging.teddy.app |
| **Production** | Manual release tag | teddy.app |

### Hosting Per Surface

| App | Hosting | Notes |
|---|---|---|
| vendor-web | Vercel | Auto-deploy from Turborepo |
| staff-web | Vercel | Auto-deploy from Turborepo |
| admin-web | Vercel | IP allowlist enforced |
| api | Railway / Render | Auto-scaling, 3 replicas prod |
| Socket.IO | Railway | Sticky sessions required |
| PostgreSQL | AWS RDS Multi-AZ | Automated backups, 7-day retention |
| Redis | AWS ElastiCache | Cluster mode, 3 shards prod |
| Elasticsearch | AWS OpenSearch | 3-node prod cluster |
| S3 + CloudFront | AWS | Versioning enabled |

### Mobile — EAS Build Pipeline

```
GitHub Push
    └── GitHub Actions triggers EAS Build
              ├── iOS → App Store (TestFlight for staging)
              ├── Android → Google Play (Internal track for staging)
              └── OTA Update → expo-updates (for patch releases)
```

### CI/CD Pipeline (GitHub Actions)

```
PR Opened
  └── ci.yml
        ├── pnpm install
        ├── turbo lint
        ├── turbo test
        ├── turbo build (all apps)
        └── Preview deploy (Vercel preview URLs)

Push to main
  └── deploy-staging.yml
        ├── turbo build
        ├── Deploy vendor-web, staff-web, admin-web → Vercel staging
        ├── Deploy api → Railway staging
        └── Run Playwright E2E tests against staging

Release Tag (v*)
  └── deploy-production.yml
        ├── Same steps as staging
        ├── Deploy to production URLs
        ├── Run database migrations (prisma migrate deploy)
        └── Trigger EAS build for mobile
```

---

## 6. API Architecture

### Base URL
```
https://api.teddy.app/v1/
```

### Complete Endpoint Map

```
/auth
  POST  /register                    Create account (client | vendor)
  POST  /login                       Email + password → JWT pair
  POST  /login/google                Google OAuth callback
  POST  /login/phone/send-otp        Send OTP via Twilio
  POST  /login/phone/verify          Verify OTP → JWT pair
  POST  /token/refresh               Rotate access token
  POST  /logout                      Invalidate refresh token

/users  [client scope]
  GET   /me                          Current user profile
  PATCH /me                          Update name, avatar, preferences
  DELETE /me                         Soft-delete account (GDPR)
  GET   /me/bookings                 Booking history (paginated)
  GET   /me/wishlist                 Saved salons
  POST  /me/wishlist/:vendorId       Toggle wishlist save
  GET   /me/rewards                  Points balance, tier, history

/vendors  [public read | vendor write]
  GET   /                            Browse vendors (geo + filters)
  POST  /                            Submit vendor application
  GET   /:id                         Vendor public profile
  PATCH /me                          Update salon info (vendor only)
  GET   /me/dashboard                Revenue, bookings, KPI cards
  GET   /me/bookings                 All bookings for this salon
  GET   /me/clients                  Client list for CRM
  GET   /me/staff                    Roster of linked staff
  POST  /me/staff/invite             Invite staff member by email
  GET   /me/payouts                  Payout history

/services  [public read | vendor write]
  GET   /:vendorId/services          List services for salon (public)
  POST  /                            Create service
  PATCH /:id                         Update service
  DELETE /:id                        Remove service

/staff  [staff scope]
  GET   /me                          Staff profile
  PATCH /me                          Update availability, bio
  GET   /me/schedule                 Calendar view
  GET   /me/clients                  My assigned clients
  GET   /me/earnings                 Earnings breakdown by period
  GET   /me/performance              Stats: ratings, bookings, retention

/bookings
  POST  /                            Create booking (client)
  GET   /:id                         Booking detail
  POST  /:id/confirm                 Vendor confirms booking
  POST  /:id/start                   Mark in-progress
  POST  /:id/complete                Mark complete
  POST  /:id/cancel                  Cancel with reason
  POST  /:id/no-show                 Mark no-show
  GET   /:id/waitlist-position       Waitlist queue position

/payments
  POST  /intent                      Create Stripe PaymentIntent
  POST  /confirm                     Confirm payment
  POST  /:bookingId/refund           Issue refund
  POST  /webhooks/stripe             Stripe webhook handler [unprotected]

/reviews
  POST  /                            Submit review (post-booking only)
  GET   /:vendorId/reviews           Public reviews for salon
  POST  /:id/flag                    Flag abusive review

/search
  GET   /vendors                     Geo + filter + sort search
  GET   /services                    Service category search
  GET   /suggest                     Autocomplete suggestions

/chat  [vendor-initiated only]
  GET   /threads                     My chat threads
  POST  /threads                     Start thread (vendor only)
  GET   /threads/:id                 Thread detail + messages
  POST  /threads/:id/media           Upload image in chat

/notifications
  GET   /                            Notification inbox
  PATCH /:id/read                    Mark read
  POST  /push/register               Register Expo push token

/media
  POST  /upload/avatar               Upload profile photo (presigned)
  POST  /upload/portfolio            Upload portfolio photo
  POST  /upload/before-after         Upload before/after pair
  DELETE /:id                        Remove media asset

/admin  [admin scope only]
  GET   /vendors/pending             Vendor approval queue
  POST  /vendors/:id/approve         Approve vendor
  POST  /vendors/:id/reject          Reject with reason
  POST  /vendors/:id/suspend         Suspend vendor
  GET   /disputes                    Dispute queue
  POST  /disputes/:id/resolve        Resolve dispute
  GET   /analytics                   Platform-wide stats
  PATCH /settings                    Platform settings, commission rate
  GET   /users                       All users with filters
  POST  /users/:id/ban               Ban user
```

---

## 7. Database Architecture

### Schema (PostgreSQL + Prisma)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phone         String?   @unique
  passwordHash  String
  role          Role      // client | vendor_owner | staff | admin
  firstName     String
  lastName      String
  avatarUrl     String?
  pointsBalance Int       @default(0)
  tier          Tier      @default(BRONZE)
  isActive      Boolean   @default(true)
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  deletedAt     DateTime? // soft delete
}

model Vendor {
  id              String    @id @default(uuid())
  ownerId         String    @unique
  businessName    String
  slug            String    @unique
  bio             String?
  coverUrl        String?
  address         String
  lat             Float
  lng             Float
  city            String
  state           String
  galleryUrls     Json      @default("[]")
  openHours       Json      // { mon: { open: "09:00", close: "20:00" }, ... }
  avgRating       Float     @default(0)
  reviewCount     Int       @default(0)
  bookingCount    Int       @default(0)
  status          VendorStatus  @default(PENDING)
  commissionRate  Float     @default(0.15)
  stripeAccountId String?
  approvedAt      DateTime?
  createdAt       DateTime  @default(now())
}

model Service {
  id          String   @id @default(uuid())
  vendorId    String
  name        String
  description String?
  category    String
  durationMin Int
  price       Decimal
  bufferMin   Int      @default(15)
  isActive    Boolean  @default(true)
  imageUrl    String?
}

model StaffMember {
  id                  String   @id @default(uuid())
  userId              String   @unique
  vendorId            String
  title               String?
  bio                 String?
  avgRating           Float    @default(0)
  bookingCount        Int      @default(0)
  weeklyAvailability  Json     // { mon: [{start: "09:00", end: "17:00"}], ... }
  isActive            Boolean  @default(true)
  joinedAt            DateTime @default(now())
}

model Booking {
  id              String        @id @default(uuid())
  clientId        String
  vendorId        String
  staffMemberId   String?
  serviceId       String
  startsAt        DateTime
  endsAt          DateTime
  totalAmount     Decimal
  platformFee     Decimal
  vendorPayout    Decimal
  status          BookingStatus @default(PENDING)
  cancelReason    String?
  waitlistPosition Int?
  confirmedAt     DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime      @default(now())
}

model Payment {
  id                    String        @id @default(uuid())
  bookingId             String        @unique
  stripePaymentIntentId String        @unique
  stripeChargeId        String?
  amount                Decimal
  currency              String        @default("aed")
  status                PaymentStatus @default(PENDING)
  refundAmount          Decimal?
  refundReason          String?
  capturedAt            DateTime?
  refundedAt            DateTime?
  createdAt             DateTime      @default(now())
}

model Payout {
  id               String       @id @default(uuid())
  vendorId         String
  stripeTransferId String?
  grossAmount      Decimal
  commissionAmount Decimal
  netAmount        Decimal
  status           PayoutStatus @default(PENDING)
  paidAt           DateTime?
}

model Review {
  id             String   @id @default(uuid())
  bookingId      String   @unique
  clientId       String
  vendorId       String
  staffMemberId  String?
  rating         Int      // 1-5
  body           String?
  isFlagged      Boolean  @default(false)
  isVisible      Boolean  @default(true)
  createdAt      DateTime @default(now())
}

model BeforeAfterPhoto {
  id             String   @id @default(uuid())
  bookingId      String
  vendorId       String
  staffMemberId  String?
  beforeUrl      String
  afterUrl       String
  clientVisible  Boolean  @default(false)
  createdAt      DateTime @default(now())
}

model Wishlist {
  clientId  String
  vendorId  String
  createdAt DateTime @default(now())
  @@id([clientId, vendorId])
}

model ChatThread {
  id              String   @id @default(uuid())
  vendorId        String
  clientId        String
  lastMessageAt   DateTime?
  vendorArchived  Boolean  @default(false)
  clientArchived  Boolean  @default(false)
}

model Message {
  id         String      @id @default(uuid())
  threadId   String
  senderId   String
  senderRole SenderRole  // client | vendor | staff
  body       String?
  mediaUrl   String?
  isRead     Boolean     @default(false)
  readAt     DateTime?
  createdAt  DateTime    @default(now())
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  title     String
  body      String
  deepLink  String?
  metadata  Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model PointsTransaction {
  id        String   @id @default(uuid())
  userId    String
  bookingId String?
  delta     Int      // positive = earned, negative = redeemed
  reason    String
  createdAt DateTime @default(now())
}

model VendorInvite {
  id         String   @id @default(uuid())
  vendorId   String
  email      String
  token      String   @unique
  accepted   Boolean  @default(false)
  expiresAt  DateTime
  acceptedAt DateTime?
}

// Enums
enum Role            { client vendor_owner staff admin }
enum Tier            { BRONZE SILVER GOLD PLATINUM }
enum VendorStatus    { PENDING ACTIVE SUSPENDED REJECTED }
enum BookingStatus   { PENDING CONFIRMED WAITLISTED IN_PROGRESS COMPLETED CANCELLED_CLIENT CANCELLED_VENDOR NO_SHOW }
enum PaymentStatus   { PENDING CAPTURED REFUNDED PARTIALLY_REFUNDED FAILED }
enum PayoutStatus    { PENDING PAID FAILED }
enum SenderRole      { client vendor staff }
```

---

## 8. Authentication & Authorization

### JWT Token Structure

**Access Token** (15 minutes)
```json
{
  "sub": "user-uuid",
  "role": "vendor_owner",
  "vendorId": "vendor-uuid",
  "staffId": null,
  "scope": ["booking:read", "booking:write", "chat:read", "chat:write", "analytics:read"],
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token** (7 days — stored in Redis)
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "jti": "unique-token-id"
}
```

### Role → Scope Mapping

| Role | Scopes |
|---|---|
| `client` | `booking:rw`, `review:w`, `chat:r`, `profile:rw`, `wishlist:rw`, `rewards:r` |
| `vendor_owner` | `booking:rw`, `service:rw`, `staff:rw`, `chat:rw`, `analytics:r`, `payout:r`, `client:r` |
| `staff` | `booking:r`, `schedule:r`, `chat:r`, `earnings:r`, `performance:r` |
| `admin` | `*` (all scopes) |

### Auth Flow

```
1. Client sends POST /auth/login { email, password }
2. Auth Service verifies bcrypt hash (cost 12)
3. Load user record + role + vendorId/staffId
4. Sign Access Token (RS256, 15min)
5. Sign Refresh Token (RS256, 7d) → store in Redis with JTI key
6. Return { accessToken, refreshToken, user }

Token Refresh:
1. Client sends POST /token/refresh { refreshToken }
2. Verify signature + expiry
3. Look up JTI in Redis (not found = already rotated/logged out)
4. Issue new Access Token + rotate Refresh Token (old JTI deleted)

Logout:
1. DELETE Redis key for refresh JTI
2. Client clears tokens from expo-secure-store
```

### RBAC Middleware

```typescript
// Usage on protected routes:
router.get('/me/dashboard',
  authenticate,                           // verify JWT, attach req.user
  authorize('vendor_owner'),              // check role
  requireScope('analytics:read'),         // check scope
  vendorController.getDashboard
)

// Resource ownership check:
router.patch('/vendors/me',
  authenticate,
  authorize('vendor_owner'),
  ensureVendorOwnership,                  // req.user.vendorId === vendor.id
  vendorController.update
)
```

---

## 9. Real-Time Architecture (WebSocket)

### Socket.IO Namespaces & Rooms

| Namespace | Room Pattern | Who Joins |
|---|---|---|
| `/chat` | `thread:{threadId}` | Vendor + Client of that thread |
| `/booking` | `booking:{bookingId}` | Client + Vendor + Staff on booking |
| `/booking` | `vendor:{vendorId}` | Vendor (receives all booking updates) |
| `/notifications` | `user:{userId}` | Every authenticated user |

### Events Reference

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `chat:new_message` | Server → Client | `{ message }` | New chat message |
| `chat:read_receipt` | Server → Client | `{ messageId, readAt }` | Message read |
| `booking:created` | Server → Vendor | `{ booking }` | New booking arrived |
| `booking:confirmed` | Server → Client | `{ booking }` | Vendor confirmed |
| `booking:cancelled` | Server → Both | `{ booking, reason }` | Cancellation |
| `booking:promoted` | Server → Client | `{ booking, position }` | Off waitlist |
| `booking:in_progress` | Server → Client | `{ booking }` | Service started |
| `booking:completed` | Server → Both | `{ booking }` | Service done |
| `notification:new` | Server → Client | `{ notification }` | Push-style in-app |

### Redis Pub/Sub Bridge (Multi-server scaling)

```
API Server 1 → publish("chat:{threadId}", message)
                         ↓
                   Redis Pub/Sub
                         ↓
Socket.IO Server → subscribe("chat:*") → emit to room
```

---

## 10. Booking Engine

### Booking State Machine

```
                    ┌─────────┐
                    │ PENDING │  ← Slot locked, payment pending
                    └────┬────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      CONFIRMED     WAITLISTED       FAILED
     (payment ok)  (slot taken)   (payment fail → slot released)
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
IN_PROGRESS   CANCELLED_CLIENT / CANCELLED_VENDOR
    │
    ▼
COMPLETED
    │
    ├──▶ REVIEWED    (client submits review)
    └──▶ PAID_OUT    (T+2 payout released)

CANCELLED_CLIENT → REFUNDED (if >24h) or NO_REFUND (if <24h)
CANCELLED_VENDOR → FULL_REFUND always
NO_SHOW          → NO_REFUND (vendor keeps payout)
```

### Slot Locking (Redis)

```
On booking attempt:
  SETNX lock:slot:{vendorId}:{staffId}:{startsAt}  {bookingId}  EX 300
  → If acquired: proceed to create PaymentIntent
  → If not acquired: check waitlist position, offer waitlist

On payment confirmed (webhook):
  Keep lock until booking completed/cancelled

On cancellation or payment failure:
  DEL lock:slot:{...}
  → Promote next waitlist entry
  → Send push notification to waitlisted client
```

### Cancellation Refund Policy

| When Cancelled | By | Refund to Client | Vendor Keeps |
|---|---|---|---|
| > 24h before | Client | 100% | 0% |
| < 24h before | Client | 50% | 50% |
| Any time | Vendor | 100% | 0% |
| No-show | — | 0% | 100% |

---

## 11. Search Architecture

### Elasticsearch Index: `teddy_vendors`

```json
{
  "mappings": {
    "properties": {
      "id":           { "type": "keyword" },
      "businessName": { "type": "text", "analyzer": "standard" },
      "slug":         { "type": "keyword" },
      "bio":          { "type": "text" },
      "city":         { "type": "keyword" },
      "location":     { "type": "geo_point" },
      "avgRating":    { "type": "float" },
      "reviewCount":  { "type": "integer" },
      "status":       { "type": "keyword" },
      "services": {
        "type": "nested",
        "properties": {
          "category": { "type": "keyword" },
          "name":     { "type": "text" },
          "price":    { "type": "float" },
          "durationMin": { "type": "integer" }
        }
      },
      "openHours":    { "type": "object" }
    }
  }
}
```

### Query Strategy

```
GET /search/vendors?lat=25.2&lng=55.3&radius=10km
                   &category=nails&priceMax=150
                   &rating=4&sort=distance

→ Elasticsearch bool query:
   filter: [ geo_distance, status=ACTIVE, services.category, services.price<=max ]
   should: [ rating >= min ]
   sort:   [ geo_distance ASC, avgRating DESC ]
   from: 0, size: 20
```

### Data Sync
- **Real-time**: Prisma middleware fires on vendor/service update → POST internal re-index
- **Nightly**: Full re-index cron at 02:00 UTC (searchReindex.job.ts)

---

## 12. Caching Strategy

### Redis Key Patterns

| Key | TTL | Invalidated On |
|---|---|---|
| `vendor:{id}:profile` | 1h | PATCH /vendors/me |
| `vendor:{id}:services` | 30m | Service create/update/delete |
| `vendor:{id}:slots:{date}` | 5m | Booking created/cancelled |
| `vendor:{id}:reviews` | 15m | New review posted |
| `vendor:{id}:analytics` | 1h | Midnight cron |
| `search:{hash}` | 5m | Vendor profile update |
| `suggest:{prefix}` | 10m | — |
| `user:{id}:profile` | 30m | PATCH /users/me |
| `user:{id}:wishlist` | 15m | Toggle wishlist |
| `user:{id}:rewards` | 5m | Booking completed |
| `session:refresh:{jti}` | 7d | POST /auth/logout |
| `otp:{phone}` | 10m | Verified or expired |
| `lock:slot:{vid}:{time}` | 5m | Payment confirmed or expired |

### Rate Limiting (Redis Sliding Window)

| Key | Window | Limit | Response |
|---|---|---|---|
| `ratelimit:api:{ip}` | 1 min | 100 req | HTTP 429 |
| `ratelimit:otp:{phone}` | 10 min | 3 attempts | HTTP 429 |
| `ratelimit:payment:{uid}` | 1 hour | 10 attempts | HTTP 429 |
| `ratelimit:search:{ip}` | 1 min | 60 req | HTTP 429 |

---

## 13. Payment & Payout Architecture

### Money Flow

```
Client pays $100
      │
      ▼ Stripe PaymentIntent (on_behalf_of: vendor Stripe account)
      │   application_fee_amount: $15   ← TEDDY 15%
      │   transfer_data.amount:   $85   ← Vendor 85%
      │
Booking CONFIRMED
      │
      │ (T+2 days after COMPLETED)
      │
      ▼ Stripe auto-transfer
      ├── $85 → Vendor Stripe Connect account
      └── $15 → TEDDY platform Stripe balance
```

### Stripe Webhook Events Handled

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Confirm booking, notify vendor + client |
| `payment_intent.payment_failed` | Release slot, notify client |
| `charge.refunded` | Update payment status |
| `account.updated` | Vendor Stripe onboarding complete |
| `payout.paid` | Update payout record to PAID |

### Vendor Stripe Onboarding
1. Vendor submits application → admin approves
2. API calls `stripe.accounts.create({ type: 'express' })` → stores `stripe_account_id`
3. Vendor redirected to Stripe Connect Express onboarding
4. On `account.updated` webhook with `charges_enabled: true` → mark vendor `ACTIVE`

---

## 14. Media & File Architecture

### Upload Flow (Presigned URLs)
```
1. App calls POST /media/upload/avatar
2. API generates S3 presigned PUT URL (10min expiry)
3. Returns { uploadUrl, fileKey }
4. App PUT file directly to S3 (bypasses API server)
5. App calls PATCH /users/me { avatarUrl: fileKey }
6. API saves fileKey to DB
```

### S3 Bucket Structure
```
teddy-assets/
├── avatars/           {userId}.jpg
├── portfolio/         {vendorId}/{filename}.jpg
├── before-after/      {bookingId}/before.jpg, after.jpg
└── chat-media/        {threadId}/{messageId}.jpg
```

### Image Delivery
```
CloudFront CDN → Lambda@Edge (resize on the fly)
  → URL format: https://media.teddy.app/avatars/{userId}.jpg?w=200&h=200
  → Cache: 1 year (content-addressed by fileKey)
```

---

## 15. Security Architecture

### Layer 1 — Network
- Cloudflare WAF with OWASP Core Rule Set
- DDoS protection and rate limiting at edge
- TLS 1.3 everywhere — HSTS enforced (max-age 1 year)
- All HTTP redirected to HTTPS

### Layer 2 — API Gateway
- JWT validation on every protected request
- RBAC middleware — role + scope enforcement
- Rate limiting per IP and per user (Redis sliding window)
- Request size limit: 10MB
- CORS: explicit whitelist of known origins
- Helmet.js: CSP, X-Frame-Options, HSTS, X-Content-Type-Options

### Layer 3 — Application
- Zod schema validation on all inputs (shared FE + BE via @teddy/validators)
- Parameterized queries via Prisma (SQL injection prevention)
- Password hashing: bcrypt cost factor 12
- Sensitive data never logged, never in URL parameters
- Admin panel: separate subdomain + IP allowlist
- Vendor financial data: scoped to `vendorId` claim in JWT

### Layer 4 — Data
- PostgreSQL: encrypted at rest (AES-256, RDS)
- S3: Server-Side Encryption (SSE-S3)
- Redis: AUTH password + TLS in transit
- Secrets: AWS Secrets Manager (prod) / `.env` (dev only)
- PII: soft-delete only (GDPR right to erasure = field anonymization)
- Payment data: never stored (Stripe tokenizes all card data)

### Layer 5 — Mobile
- JWT tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore)
- No sensitive data in AsyncStorage
- Certificate pinning in production builds
- Biometric auth hook (optional for lock screen)

---

## 16. Scalability Plan

| Metric | MVP (0–1K bookings/day) | Growth (10K/day) | Scale (100K/day) |
|---|---|---|---|
| **API** | 1 Railway instance | 3× horizontal pods | Auto-scaling k8s |
| **Database** | PostgreSQL single | Read replica ×2 | Citus horizontal sharding |
| **Redis** | Single ElastiCache | Cluster (3 shards) | Cluster + sentinel |
| **Elasticsearch** | 1 node | 3-node cluster | Dedicated OpenSearch domain |
| **WebSocket** | 1 WS server | Socket.IO + Redis adapter | Dedicated WS fleet |
| **Media** | S3 + CloudFront | Same (CloudFront scales) | Global edge + image optimizer |
| **Jobs** | In-process cron | BullMQ + Redis queue | Dedicated worker fleet |
| **Search** | Full re-index nightly | Incremental + nightly | Real-time Kafka stream |

---

## 17. Design System Tokens

### Colors
| Token | Hex | Usage |
|---|---|---|
| `gold-start` | `#B89766` | Gradient start, CTA buttons |
| `gold-end` | `#E0C58A` | Gradient end |
| `sage` | `#7E8A6E` | Splash background, accents |
| `cream` | `#E5E2D0` | Primary background |
| `surface` | `#F7F5EE` | Card backgrounds |
| `ink` | `#1A1A1A` | Primary text |
| `ink-muted` | `#6B6B6B` | Secondary text |

### Mapping to Tailwind Classes
```js
// tailwind.config.js
colors: {
  gold: { DEFAULT: '#B89766', light: '#E0C58A' },
  sage: { DEFAULT: '#7E8A6E' },
  cream: { DEFAULT: '#E5E2D0' },
  surface: { DEFAULT: '#F7F5EE' },
  ink: { DEFAULT: '#1A1A1A', muted: '#6B6B6B' },
}
```

---

## 18. Environment Variables Reference

```bash
# API Server
DATABASE_URL=postgresql://user:pass@host:5432/teddy
REDIS_URL=redis://user:pass@host:6379
ELASTICSEARCH_URL=https://host.us-east-1.es.amazonaws.com

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_ACCOUNT=acct_...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@teddy.app

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=teddy-assets
CLOUDFRONT_URL=https://media.teddy.app

EXPO_ACCESS_TOKEN=...           # For EAS push notifications

# Web Apps (Next.js)
NEXT_PUBLIC_API_URL=https://api.teddy.app/v1
NEXT_PUBLIC_WS_URL=wss://ws.teddy.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...

# Mobile App (Expo)
EXPO_PUBLIC_API_URL=https://api.teddy.app/v1
EXPO_PUBLIC_WS_URL=wss://ws.teddy.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_GOOGLE_MAPS_KEY=...
```

---

*Document End — TEDDY System Architecture v1.0*
*Next update trigger: Any change to tech stack, DB schema, or deployment infrastructure*
