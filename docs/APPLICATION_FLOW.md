# TEDDY Platform — Complete Application Flow Document
> **Status:** LOCKED REFERENCE · Version 1.0 · Last Updated: May 2026
> **Scope:** Every feature across all four roles — Client, Vendor, Staff, Admin
> **Purpose:** End-to-end flow of every feature from first user action to final system state

---

## How to Read This Document

Each feature section shows:
- **Who does what** on each platform
- **Step-by-step flow** from trigger to resolution
- **What the backend does** at each step
- **What other roles see** as a result

**Roles & Surfaces:**
- 🟢 **CLIENT** — Mobile App (iOS/Android)
- 🔵 **VENDOR** — Web Dashboard (vendor.teddy.app)
- 🟡 **STAFF** — Web Portal (staff.teddy.app)
- 🔴 **ADMIN** — Web Panel (admin.teddy.app)
- ⚙️ **SYSTEM** — Backend API / automated process

---

## Table of Contents
1. [User Registration & Onboarding](#1-user-registration--onboarding)
2. [Vendor Registration & Admin Approval](#2-vendor-registration--admin-approval)
3. [Staff Invitation & Onboarding](#3-staff-invitation--onboarding)
4. [Browsing & Discovery (Search)](#4-browsing--discovery-search)
5. [Booking Creation & Payment](#5-booking-creation--payment)
6. [Waitlist Flow](#6-waitlist-flow)
7. [Booking Lifecycle Management](#7-booking-lifecycle-management)
8. [Cancellation & Refund Flow](#8-cancellation--refund-flow)
9. [Chat Flow (Vendor-Initiated)](#9-chat-flow-vendor-initiated)
10. [Before & After Photo Flow](#10-before--after-photo-flow)
11. [Review & Rating Flow](#11-review--rating-flow)
12. [Loyalty Rewards Flow](#12-loyalty-rewards-flow)
13. [Push Notification Flow](#13-push-notification-flow)
14. [Vendor Analytics Flow](#14-vendor-analytics-flow)
15. [Staff Performance & Earnings Flow](#15-staff-performance--earnings-flow)
16. [Payout Flow (Vendor)](#16-payout-flow-vendor)
17. [Dispute Resolution Flow](#17-dispute-resolution-flow)
18. [Admin Platform Management](#18-admin-platform-management)
19. [Complete Cross-Role Interaction Map](#19-complete-cross-role-interaction-map)

---

## 1. User Registration & Onboarding

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🟢 Client | Opens app for first time | Mobile App |
| 2 | 🟢 Client | Chooses Sign Up | Mobile App |
| 3 | 🟢 Client | Enters name, email, phone, password | Mobile App |
| 4 | ⚙️ System | Creates user record (role: client) | API |
| 5 | ⚙️ System | Sends OTP SMS via Twilio | API + Twilio |
| 6 | 🟢 Client | Enters OTP code | Mobile App |
| 7 | ⚙️ System | Marks user `isVerified: true` | API |
| 8 | ⚙️ System | Issues JWT access token + refresh token | API |
| 9 | 🟢 Client | Completes onboarding questionnaire | Mobile App |
| 10 | 🟢 Client | Selects beauty preferences (categories) | Mobile App |
| 11 | 🟢 Client | Uploads profile photo (optional) | Mobile App → S3 |
| 12 | ⚙️ System | Stores preferences in user record | API |
| 13 | 🟢 Client | Arrives at Home / Discover screen | Mobile App |

### Full Step-by-Step Flow

```
[CLIENT — MOBILE APP]
    │
    ├─ Splash Screen → Auth Gate
    │     No token found → Auth Stack
    │
    ├─ Welcome Screen
    │     [Sign Up] button tapped
    │
    ├─ Registration Screen
    │     firstName, lastName, email, phone, password
    │     → POST /auth/register { role: "client", ...fields }
    │
    │   [API — BACKEND]
    │     ├── Validate with Zod schema
    │     ├── Check email/phone uniqueness
    │     ├── bcrypt.hash(password, 12)
    │     ├── INSERT User { role: "client", isVerified: false }
    │     └── Trigger OTP: POST Twilio API → SMS to phone
    │
    ├─ OTP Verification Screen
    │     6-digit code input
    │     → POST /auth/login/phone/verify { phone, otp }
    │
    │   [API — BACKEND]
    │     ├── Check Redis: otp:{phone} === submitted code
    │     ├── UPDATE User SET isVerified = true
    │     ├── Sign accessToken (15m) + refreshToken (7d)
    │     ├── Store refreshToken JTI in Redis
    │     └── Return { accessToken, refreshToken, user }
    │
    ├─ Client stores tokens in expo-secure-store
    │
    ├─ Onboarding Questionnaire (multi-step)
    │     Step 1: What services are you interested in?
    │             (Hair, Nails, Skin, Lashes, etc.)
    │     Step 2: How often do you book?
    │     Step 3: Location permission request
    │     → PATCH /users/me { preferences, location }
    │
    ├─ Profile Photo (optional)
    │     → POST /media/upload/avatar → presigned S3 URL
    │     → PUT file to S3
    │     → PATCH /users/me { avatarUrl }
    │
    └─ Home Screen rendered
          Personalized recommendations based on preferences + location

[NO ADMIN ACTION REQUIRED — Client self-registers]
[NO VENDOR ACTION REQUIRED]
[NO STAFF ACTION REQUIRED]
```

### Alternative: Google Sign-In
```
Client taps [Continue with Google]
→ expo-auth-session opens Google OAuth
→ Google returns auth code
→ POST /auth/login/google { code }
→ API exchanges code for Google profile
→ Upsert User (create if new, login if existing)
→ Return JWT pair
→ Skip OTP step (Google already verified email)
```

---

## 2. Vendor Registration & Admin Approval

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🔵 Vendor | Visits vendor.teddy.app | Vendor Web |
| 2 | 🔵 Vendor | Clicks Register New Salon | Vendor Web |
| 3 | 🔵 Vendor | Fills application form | Vendor Web |
| 4 | ⚙️ System | Creates vendor in PENDING status | API |
| 5 | ⚙️ System | Notifies admin of new application | API → Admin |
| 6 | 🔴 Admin | Reviews application in panel | Admin Web |
| 7 | 🔴 Admin | Approves or Rejects with reason | Admin Web |
| 8 | ⚙️ System | Updates vendor status | API |
| 9 | ⚙️ System | Triggers Stripe Connect onboarding | API → Stripe |
| 10 | 🔵 Vendor | Completes Stripe onboarding | Vendor Web → Stripe |
| 11 | ⚙️ System | Marks vendor ACTIVE, salon goes live | API |
| 12 | 🟢 Clients | Can now discover the salon | Mobile App |

### Full Step-by-Step Flow

```
[VENDOR — VENDOR WEB DASHBOARD]
    │
    ├─ Register Page (vendor.teddy.app/register)
    │     Owner first/last name, email, password
    │     Business name, address (Google Maps autocomplete)
    │     Business category (Hair | Nails | Skin | Lashes | Multi)
    │     Bio / description
    │     Upload: cover photo, logo
    │     Business hours (per day)
    │     → POST /auth/register { role: "vendor_owner" }
    │     → POST /vendors { businessName, address, lat, lng, ... }
    │
    │   [API — BACKEND]
    │     ├── Create User { role: "vendor_owner" }
    │     ├── Create Vendor { status: PENDING, ownerId }
    │     ├── Index vendor in Elasticsearch (status: PENDING, hidden)
    │     └── Emit notification → admin panel: "New vendor application"
    │
    ├─ Vendor sees "Application Under Review" dashboard state
    │     (All features locked except Settings > Profile)

    ─────────────────────────────────────────────────
    [ADMIN — ADMIN WEB PANEL]
    │
    ├─ Vendors > Pending Queue
    │     Table row: Business Name, Owner, City, Applied Date
    │     [Review] → Vendor Detail Page
    │
    ├─ Vendor Detail Review Page
    │     Shows: all form data, cover photo, Google Maps pin
    │     Admin checks: legitimate business, complete info
    │
    ├─ [Approve] or [Reject with Reason]
    │     → POST /admin/vendors/:id/approve
    │     OR → POST /admin/vendors/:id/reject { reason }
    │
    │   [API — BACKEND on APPROVE]
    │     ├── UPDATE Vendor SET status = ACTIVE
    │     ├── stripe.accounts.create({ type: 'express' }) → stripeAccountId
    │     ├── UPDATE Vendor SET stripeAccountId
    │     ├── Generate Stripe Connect onboarding link
    │     ├── Send email to vendor: "Approved! Complete your payout setup"
    │     └── Send in-app notification to vendor
    │
    │   [API — BACKEND on REJECT]
    │     ├── UPDATE Vendor SET status = REJECTED
    │     └── Send email to vendor: rejection reason
    │
    ─────────────────────────────────────────────────
    [VENDOR — POST APPROVAL]
    │
    ├─ Email received: "Congratulations! Your salon is approved."
    │
    ├─ Dashboard unlocked — vendor can now:
    │     Add services, set prices, invite staff, manage calendar
    │
    ├─ Settings > Payouts → Stripe Connect onboarding
    │     Vendor enters: bank account, ID verification
    │     → Stripe webhook: account.updated { charges_enabled: true }
    │
    │   [API — BACKEND on Stripe webhook]
    │     └── No additional action (vendor already ACTIVE)
    │         Payouts now enabled end-to-end
    │
    └─ Salon now visible in client search results 🎉

[CLIENT SEES]
    → Salon appears in search after Elasticsearch re-index (near-real-time)
```

---

## 3. Staff Invitation & Onboarding

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🔵 Vendor | Goes to Team page | Vendor Web |
| 2 | 🔵 Vendor | Clicks Invite Staff Member | Vendor Web |
| 3 | 🔵 Vendor | Enters staff email + role title | Vendor Web |
| 4 | ⚙️ System | Creates invite record + sends email | API + SendGrid |
| 5 | 🟡 Staff | Opens email, clicks Accept Invite | Email |
| 6 | 🟡 Staff | Creates account on staff portal | Staff Web |
| 7 | ⚙️ System | Links StaffMember to Vendor | API |
| 8 | 🟡 Staff | Sets weekly availability | Staff Web |
| 9 | 🔵 Vendor | Sees staff on team roster | Vendor Web |
| 10 | 🟢 Client | Can select staff when booking | Mobile App |

### Full Step-by-Step Flow

```
[VENDOR — TEAM PAGE]
    │
    ├─ Team / Roster Page
    │     Table: existing staff members, their bookings, ratings
    │     [+ Invite Staff] button
    │
    ├─ Invite Modal
    │     Email address, Job Title (e.g. "Senior Stylist")
    │     → POST /vendors/me/staff/invite { email, title }
    │
    │   [API — BACKEND]
    │     ├── Create VendorInvite { vendorId, email, token: uuid, expiresAt: +48h }
    │     ├── Send email via SendGrid:
    │     │   Subject: "[Vendor Name] invited you to join TEDDY"
    │     │   Body: "Accept invite" link → staff.teddy.app/invite?token={token}
    │     └── Return invite status "Pending"
    │
    ─────────────────────────────────────────────────
    [STAFF — EMAIL]
    │
    ├─ Opens invite email
    │     Clicks "Accept & Set Up Account"
    │     → Redirects to staff.teddy.app/invite?token=abc123
    │
    [STAFF — STAFF WEB PORTAL]
    │
    ├─ Invite Landing Page
    │     Token validated against VendorInvite table
    │     Shows: "You've been invited to join [Salon Name]"
    │     Form: First name, last name, password
    │     → POST /auth/register { role: "staff", inviteToken }
    │
    │   [API — BACKEND]
    │     ├── Validate invite token (exists, not expired, not accepted)
    │     ├── Create User { role: "staff" }
    │     ├── Create StaffMember { userId, vendorId, title }
    │     ├── UPDATE VendorInvite SET accepted = true, acceptedAt = now()
    │     ├── Issue JWT { role: "staff", staffId, vendorId }
    │     └── Notify vendor: "Staff member has accepted your invite"
    │
    ├─ Staff Portal — Onboarding Steps
    │     Step 1: Upload profile photo
    │     Step 2: Write bio
    │     Step 3: Set weekly availability
    │             (drag/click calendar: available time blocks per day)
    │     → PATCH /staff/me { bio, avatarUrl, weeklyAvailability }
    │
    └─ Staff Portal Home: schedule, upcoming clients, earnings

[VENDOR SEES]
    → Team page: new staff member appears with "Active" badge
    → Can assign staff to services when managing bookings

[CLIENT SEES]
    → When booking a service at this salon, staff member appears
      in "Choose your stylist" selection list
```

---

## 4. Browsing & Discovery (Search)

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🟢 Client | Opens Discover tab | Mobile App |
| 2 | 🟢 Client | Searches by location / category / name | Mobile App |
| 3 | ⚙️ System | Elasticsearch geo + filter query | API + ES |
| 4 | 🟢 Client | Views results list / map view | Mobile App |
| 5 | 🟢 Client | Taps salon card | Mobile App |
| 6 | 🟢 Client | Views salon profile (photos, services, reviews, staff) | Mobile App |
| 7 | 🟢 Client | Saves to wishlist (heart icon) | Mobile App |

### Full Step-by-Step Flow

```
[CLIENT — DISCOVER SCREEN]
    │
    ├─ Discover tab loaded
    │     Default: nearby salons based on GPS location
    │     → GET /search/vendors?lat={lat}&lng={lng}&radius=10km
    │
    ├─ Search Bar
    │     Type: "nail salon" → GET /search/suggest?q=nail+salon
    │     → Elasticsearch suggest query on businessName + services.name
    │     → Shows autocomplete dropdown (debounced 300ms)
    │
    ├─ Filter Sheet (bottom sheet)
    │     Category: Hair | Nails | Skin | Lashes | Brows | Multi
    │     Price range: slider
    │     Min rating: 1-5 stars
    │     Distance: 5km / 10km / 20km / Any
    │     Availability: pick date
    │     Sort: Nearest | Highest Rated | Most Booked
    │
    │   [API — SEARCH ENGINE]
    │     → Elasticsearch bool query:
    │       filter: geo_distance, status=ACTIVE, category, price range
    │       should: rating filter
    │       sort: geo_distance or avgRating
    │     → Returns list of vendor objects (id, name, coverUrl, avgRating,
    │              distance, priceFrom, category tags)
    │
    ├─ Results displayed as:
    │     ● Cards list (vertical scroll)
    │     ● Map view with pin markers (toggle)
    │
    ├─ Tap Salon Card → Salon Profile Screen
    │     Header: cover photo, name, location, rating (stars + count)
    │     Tabs:
    │       [Services]  — list of services, duration, price, [Book]
    │       [Portfolio] — before/after grid (vendor's uploaded photos)
    │       [Reviews]   — client reviews with stars + comments
    │       [About]     — bio, hours, address on mini-map
    │     Heart icon → POST /users/me/wishlist/:vendorId (toggle)
    │
    │   [API — VENDOR PROFILE]
    │     GET /vendors/:id
    │     → PostgreSQL query (with Redis cache vendor:{id}:profile, 1h TTL)
    │     → Returns: full vendor, services[], recent reviews[], staff[]
    │
    └─ Wishlist toggle saved

[VENDOR SEES — NO ACTION REQUIRED]
    → Vendor analytics: search impressions counter incremented

[ADMIN SEES — NO ACTION REQUIRED]
    → Platform analytics: search volume tracked
```

---

## 5. Booking Creation & Payment

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🟢 Client | Taps Book on a service | Mobile App |
| 2 | 🟢 Client | Selects staff member (optional) | Mobile App |
| 3 | 🟢 Client | Selects date and time slot | Mobile App |
| 4 | ⚙️ System | Checks availability + locks slot | API + Redis |
| 5 | ⚙️ System | Creates PaymentIntent with Stripe | API + Stripe |
| 6 | 🟢 Client | Enters card / uses saved payment | Mobile App |
| 7 | 🟢 Client | Confirms booking | Mobile App |
| 8 | ⚙️ System | Stripe webhook — payment captured | Stripe → API |
| 9 | ⚙️ System | Booking marked CONFIRMED | API |
| 10 | 🔵 Vendor | Receives new booking notification | Vendor Web + Push |
| 11 | 🟡 Staff | Sees booking on their schedule | Staff Web |
| 12 | 🔴 Admin | Booking appears in platform analytics | Admin Web |

### Full Step-by-Step Flow

```
[CLIENT — MOBILE APP]
    │
    ├─ Salon Profile → [Book] on chosen service
    │
    ├─ Staff Selection Screen (if vendor has staff)
    │     Cards: staff photo, name, rating, availability badge
    │     "No preference" option available
    │
    ├─ Date & Time Screen
    │     Calendar: pick date
    │     Time slots grid:
    │     → GET /vendors/:id/availability?date={date}&serviceId={id}&staffId={id}
    │
    │   [API — SLOT AVAILABILITY]
    │     ├── Load service duration (e.g. 60 min) + buffer (15 min)
    │     ├── Load staff weekly availability
    │     ├── Load existing confirmed bookings for that staff + date
    │     ├── Check Redis locks (active lock = slot taken)
    │     └── Return: { available: ["09:00","10:15","11:30"...], taken: ["14:00"] }
    │
    ├─ Summary / Review Booking Screen
    │     Salon name, service, staff, date+time, duration, price
    │     [Notes for stylist] text input (optional)
    │     [Confirm & Pay] button
    │
    ├─ Payment Screen
    │     Existing cards shown (Stripe Customer)
    │     [+ Add Card] → Stripe CardField native component
    │     [Pay $100] button
    │     → POST /bookings { vendorId, serviceId, staffId, startsAt, notes }
    │
    │   [API — BOOKING CREATION]
    │     ├── SETNX Redis: lock:slot:{vendorId}:{staffId}:{startsAt}  EX 300
    │     │     → Lock acquired ✓ → proceed
    │     │     → Lock failed ✗ → go to Waitlist Flow (Section 6)
    │     │
    │     ├── Calculate: totalAmount, platformFee (15%), vendorPayout (85%)
    │     │
    │     ├── stripe.paymentIntents.create({
    │     │     amount: 10000,  // in cents
    │     │     currency: 'aed',
    │     │     on_behalf_of: vendor.stripeAccountId,
    │     │     transfer_data: { destination: vendor.stripeAccountId, amount: 8500 },
    │     │     application_fee_amount: 1500,
    │     │     metadata: { bookingId, vendorId, clientId }
    │     │   })
    │     │
    │     ├── INSERT Booking { status: PENDING, stripePaymentIntentId }
    │     └── Return { bookingId, clientSecret }
    │
    ├─ Stripe SDK: confirmPayment(clientSecret, cardDetails)
    │     → Stripe processes payment
    │
    │   [STRIPE → API WEBHOOK]
    │     Event: payment_intent.succeeded
    │     ├── UPDATE Booking SET status = CONFIRMED, confirmedAt = now()
    │     ├── INSERT Payment { status: CAPTURED, capturedAt }
    │     ├── DEL Redis lock (slot officially booked)
    │     ├── Socket.IO emit → room:vendor:{vendorId}: booking:created { booking }
    │     ├── Expo Push → vendor owner: "New booking from [Client Name]!"
    │     ├── Expo Push → client: "Booking confirmed for [Service] on [Date]!"
    │     └── Schedule job: reminder 24h before booking
    │
    └─ Client sees: Booking Confirmed screen
          Booking card in My Bookings tab (CONFIRMED status)

─────────────────────────────────────────────────────────────
[VENDOR — VENDOR WEB DASHBOARD]

    ├─ Real-time: booking:created socket event received
    │     Toast notification: "New booking — [Client Name] — [Service] — [Time]"
    │
    ├─ Bookings page: new row appears with status CONFIRMED
    │     Columns: Client, Service, Staff, Date/Time, Amount, Status
    │
    └─ Calendar page: time slot now shows as booked (colour-coded)

─────────────────────────────────────────────────────────────
[STAFF — STAFF WEB PORTAL]

    ├─ Schedule page: appointment appears on their calendar
    │     Shows: client name, service, duration, time block
    │
    └─ Real-time: booking:created → staff schedule updated live

─────────────────────────────────────────────────────────────
[ADMIN — ADMIN WEB PANEL]

    └─ Platform Analytics: total bookings count + revenue updated
       (no action required — automated tracking)
```

---

## 6. Waitlist Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🟢 Client | Attempts to book a taken slot | Mobile App |
| 2 | ⚙️ System | Detects slot lock in Redis | API |
| 3 | 🟢 Client | Offered waitlist position | Mobile App |
| 4 | 🟢 Client | Accepts waitlist | Mobile App |
| 5 | ⚙️ System | Creates booking with WAITLISTED status | API |
| 6 | ⚙️ System | When slot opens (cancellation) → promotes waitlist | API |
| 7 | 🟢 Client | Receives push notification to confirm | Mobile App |
| 8 | 🟢 Client | Confirms and pays within time window | Mobile App |

### Full Step-by-Step Flow

```
[CLIENT — MOBILE APP]
    │
    ├─ Selects a time slot
    │     → POST /bookings (slot taken — Redis lock exists)
    │
    │   [API]
    │     ├── Lock not acquired
    │     ├── Check ZADD waitlist:{vendorId}:{date} (sorted set by timestamp)
    │     ├── Current position = ZRANK + 1
    │     └── Return { waitlisted: true, position: 3 }
    │
    ├─ Waitlist Offer Screen
    │     "This time slot is fully booked.
    │      Join the waitlist — you're #3 in line.
    │      We'll notify you if a spot opens up."
    │     [Join Waitlist] | [Pick Different Time]
    │
    ├─ Client taps [Join Waitlist]
    │     → POST /bookings { ...same data, joinWaitlist: true }
    │
    │   [API]
    │     ├── INSERT Booking { status: WAITLISTED, waitlistPosition: 3 }
    │     ├── ZADD waitlist:{vendorId}:{staffId}:{date} score=timestamp bookingId
    │     └── Return { bookingId, waitlistPosition: 3 }
    │
    ├─ My Bookings tab shows booking in "Waitlist" sub-tab
    │     Badge: "#3 on waitlist"
    │
    ════════════════════════════════════════
    [WHEN SLOT OPENS — Another client cancels]
    ════════════════════════════════════════
    │
    │   [API — SLOT OPEN EVENT]
    │     ├── DEL Redis lock for that slot
    │     ├── ZPOPMIN waitlist:{vendorId}:{staffId}:{date} → get top waitlist bookingId
    │     ├── UPDATE Booking (top waitlist) SET status = PENDING
    │     ├── Set Redis: hold:slot:{...} EX 900 (15 min to confirm payment)
    │     ├── Socket.IO → user:{clientId}: booking:promoted { bookingId, expiresAt }
    │     └── Expo Push → client: "Good news! A spot opened up. Confirm within 15 min!"
    │
    ├─ Client receives push → deep link opens Booking Confirm screen
    │     Shows countdown timer: "14:32 remaining to confirm"
    │     [Confirm & Pay $100] button
    │
    ├─ Client pays → same payment flow as Section 5
    │
    │   [IF CLIENT DOES NOT CONFIRM IN 15 MIN]
    │     ├── DEL hold:slot Redis key
    │     ├── UPDATE Booking SET status = CANCELLED (waitlist expired)
    │     ├── Promote NEXT waitlist entry
    │     └── Push: "Your waitlist spot expired. Try booking again."
    │
    └─ Client confirms → Booking CONFIRMED, full flow resumes

[VENDOR SEES]
    → No action needed — waitlist is fully automated
    → Calendar shows correct occupied/open slots in real-time
```

---

## 7. Booking Lifecycle Management

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🔵 Vendor | Opens Bookings / Calendar page | Vendor Web |
| 2 | 🔵 Vendor | Views upcoming booking | Vendor Web |
| 3 | 🔵 Vendor | Marks booking as "Started" | Vendor Web |
| 4 | ⚙️ System | Updates status to IN_PROGRESS | API |
| 5 | 🟡 Staff | Sees their current appointment active | Staff Web |
| 6 | 🔵 Vendor | Marks booking as "Completed" | Vendor Web |
| 7 | ⚙️ System | Updates status to COMPLETED | API |
| 8 | ⚙️ System | Awards loyalty points to client | API |
| 9 | ⚙️ System | Schedules T+2 payout to vendor | API |
| 10 | 🟢 Client | Receives prompt to leave a review | Mobile App |

### Full Step-by-Step Flow

```
[24 HOURS BEFORE BOOKING]
    │
    │   [SYSTEM — bookingReminder.job.ts]
    │     ├── Expo Push → client: "Reminder: [Service] tomorrow at [Time] at [Salon]"
    │     └── Expo Push → staff: "Reminder: Appointment with [Client] tomorrow at [Time]"
    │

═══════════════════
ON BOOKING DAY
═══════════════════

[VENDOR — VENDOR WEB DASHBOARD]
    │
    ├─ Calendar / Bookings page
    │     Current booking highlighted
    │     Status: CONFIRMED
    │     [Mark as Started] button
    │     → POST /bookings/:id/start
    │
    │   [API]
    │     ├── UPDATE Booking SET status = IN_PROGRESS
    │     └── Socket.IO → client, staff: booking:in_progress
    │
    ├─ Client's app shows booking status: "In Progress 🟢"
    │
    ├─ Staff sees their active appointment highlighted on portal
    │
    ├─ Service completed
    │     [Mark as Completed] button
    │     → POST /bookings/:id/complete
    │
    │   [API — BOOKING COMPLETE]
    │     ├── UPDATE Booking SET status = COMPLETED, completedAt = now()
    │     ├── UPDATE Vendor: bookingCount++
    │     ├── UPDATE StaffMember: bookingCount++
    │     ├── rewards.service: award points to client
    │     │     Points formula: floor(totalAmount × 10) e.g. $100 = 1000 pts
    │     │     INSERT PointsTransaction { userId, bookingId, delta: +1000 }
    │     │     UPDATE User SET pointsBalance += 1000
    │     │     Check tier upgrade: Bronze→Silver→Gold→Platinum
    │     ├── Schedule payoutRelease.job: run at T+2 days
    │     ├── Socket.IO → client: booking:completed
    │     └── Expo Push → client: "Your service is done! Leave a review?"
    │

[CLIENT — MOBILE APP]
    │
    ├─ Push notification → deep link to Review Screen
    │     (See Review Flow — Section 11)
    │
    └─ My Bookings: booking moves to "Completed" tab
          Shows: total paid, points earned badge, [Leave Review] button

[STAFF — STAFF WEB PORTAL]
    │
    └─ Schedule: booking slot marked complete
         Earnings updated on Earnings page

[VENDOR — after T+2 days]
    │
    └─ Payouts page: payout appears (see Payout Flow — Section 16)
```

---

## 8. Cancellation & Refund Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1a | 🟢 Client | Cancels their booking | Mobile App |
| 1b | 🔵 Vendor | Cancels a client's booking | Vendor Web |
| 2 | ⚙️ System | Applies refund policy | API |
| 3 | ⚙️ System | Issues Stripe refund | API + Stripe |
| 4 | ⚙️ System | Releases slot, promotes waitlist | API |
| 5 | 🟢 Client | Receives refund confirmation | Mobile App |
| 6 | 🔵 Vendor | Sees updated booking status | Vendor Web |

### Full Step-by-Step Flow

```
═══════════════════════
CLIENT-INITIATED CANCEL
═══════════════════════
[CLIENT — MOBILE APP]
    │
    ├─ My Bookings → tap booking → [Cancel Booking]
    │
    ├─ Cancel Reason Screen
    │     Radio options:
    │     • Change of plans
    │     • Found a better option
    │     • Emergency / personal reason
    │     • Wrong date / time selected
    │     • Other (free text)
    │     [Submit Cancellation]
    │     → POST /bookings/:id/cancel { reason, cancelledBy: "client" }
    │
    │   [API — CANCELLATION LOGIC]
    │     ├── Check: now vs. booking.startsAt
    │     │
    │     ├── IF hours_until_booking > 24:
    │     │     Refund 100% → stripe.refunds.create({ charge: chargeId, amount: 10000 })
    │     │     UPDATE Payment SET status = REFUNDED, refundAmount = 10000
    │     │     UPDATE Booking SET status = CANCELLED_CLIENT
    │     │     Push → client: "Full refund of $100 issued (3-5 business days)"
    │     │
    │     ├── IF hours_until_booking <= 24:
    │     │     Refund 50% → stripe.refunds.create({ amount: 5000 })
    │     │     UPDATE Payment SET status = PARTIALLY_REFUNDED, refundAmount = 5000
    │     │     UPDATE Booking SET status = CANCELLED_CLIENT
    │     │     Push → client: "50% refund of $50 issued (late cancellation policy)"
    │     │
    │     ├── DEL Redis lock for that slot
    │     ├── Promote waitlist (if any) → see Section 6
    │     ├── Socket.IO → vendor: booking:cancelled
    │     └── Push → vendor: "Booking cancelled by [Client Name]"
    │

═══════════════════════
VENDOR-INITIATED CANCEL
═══════════════════════
[VENDOR — VENDOR WEB DASHBOARD]
    │
    ├─ Bookings → booking row → [Cancel] button
    │     Reason text input (required)
    │     → POST /bookings/:id/cancel { reason, cancelledBy: "vendor" }
    │
    │   [API — ALWAYS FULL REFUND when vendor cancels]
    │     ├── stripe.refunds.create({ amount: FULL })
    │     ├── UPDATE Booking SET status = CANCELLED_VENDOR
    │     ├── DEL Redis lock
    │     ├── Promote waitlist
    │     └── Push → client: "Salon cancelled your booking. Full refund issued."
    │

═══════════════════════
NO-SHOW
═══════════════════════
[VENDOR marks no-show]
    │
    │     → POST /bookings/:id/no-show
    │
    │   [API]
    │     ├── UPDATE Booking SET status = NO_SHOW
    │     ├── No refund issued (vendor keeps payout at T+2)
    │     └── Push → client: "[Salon] has marked your appointment as a no-show"
    │

[ADMIN SEES]
    → Cancellation and no-show rates visible in analytics
    → Excessive vendor cancellations flagged for review
```

---

## 9. Chat Flow (Vendor-Initiated)

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🔵 Vendor | Initiates chat with a client | Vendor Web |
| 2 | ⚙️ System | Creates chat thread | API |
| 3 | ⚙️ System | Notifies client via push + in-app | API |
| 4 | 🟢 Client | Opens notification → Chat screen | Mobile App |
| 5 | 🟢 Client | Reads and replies to vendor | Mobile App |
| 6 | 🔵 Vendor | Sees reply in real-time | Vendor Web |
| 7 | 🟡 Staff | Can participate if vendor assigns | Staff Web |

### Full Step-by-Step Flow

```
[VENDOR — VENDOR WEB DASHBOARD]
    │
    ├─ Clients page OR Bookings page → [Message] button next to client
    │     OR Chat page → [+ New Conversation]
    │     Select client from dropdown
    │     → POST /chat/threads { clientId }
    │
    │   [API]
    │     ├── Check: vendor owns a thread with this client? → reuse existing
    │     ├── CREATE ChatThread { vendorId, clientId }
    │     └── Return { threadId }
    │
    ├─ Vendor types first message → [Send]
    │     → POST /chat/threads/:id/messages { body: "Hi [Name], ..." }
    │
    │   [API — MESSAGE DELIVERY]
    │     ├── INSERT Message { threadId, senderId: vendorId, senderRole: "vendor" }
    │     ├── UPDATE ChatThread SET lastMessageAt = now()
    │     ├── Publish to Redis: channel chat:{threadId}
    │     ├── Socket.IO (subscribed to Redis) → emit chat:new_message
    │     │     → room: thread:{threadId}
    │     ├── IF client socket NOT connected:
    │     │     → Expo Push: "[Salon Name]: Hi [Name], ..."
    │     └── UPDATE notification badge count for client
    │
    │   [CLIENT — MOBILE APP]
    │
    ├─ Push notification arrives → tap → opens Chat Screen (deep link)
    │
    ├─ Chat Thread Screen
    │     Messages displayed as bubbles (vendor = left, client = right)
    │     Real-time: Socket.IO room thread:{threadId}
    │
    ├─ Client types reply → [Send]
    │     → POST /chat/threads/:id/messages { body: "..." }
    │     Socket.IO → vendor sees reply instantly
    │
    ├─ Image sharing:
    │     → POST /chat/threads/:id/media (presigned S3 URL)
    │     → Upload image → send URL as message mediaUrl
    │
    └─ Read receipts:
          Client opens thread → PATCH /chat/threads/:id/messages/read-all
          → UPDATE Message SET isRead=true, readAt=now()
          → Socket.IO → vendor: chat:read_receipt

[STAFF — STAFF WEB PORTAL]
    ├─ Chat page: can view threads for their vendor
    │     Can read and reply (senderRole: "staff")
    └─ Cannot initiate new threads (vendor-only initiation rule)

[ADMIN — NO DIRECT ACCESS]
    → Admin can view chat logs only for moderation/dispute purposes
    → Accessed via: GET /admin/chat/threads/:id (admin scope)
```

---

## 10. Before & After Photo Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🔵 Vendor / 🟡 Staff | Uploads before photo (start of service) | Vendor Web / Staff Web |
| 2 | 🔵 Vendor / 🟡 Staff | Uploads after photo (end of service) | Vendor Web / Staff Web |
| 3 | ⚙️ System | Stores photo pair linked to booking | API + S3 |
| 4 | 🔵 Vendor | Chooses to share with client | Vendor Web |
| 5 | 🟢 Client | Views before/after in booking history | Mobile App |
| 6 | 🟢 Client | Can view salon portfolio | Mobile App |

### Full Step-by-Step Flow

```
[VENDOR or STAFF]
    │
    ├─ Booking detail page → [Upload Before Photo]
    │     At start of appointment
    │     → POST /media/upload/before-after { bookingId, type: "before" }
    │     → API returns presigned S3 PUT URL
    │     → Upload image directly to S3: before-after/{bookingId}/before.jpg
    │
    ├─ After service is done → [Upload After Photo]
    │     → POST /media/upload/before-after { bookingId, type: "after" }
    │     → Upload: before-after/{bookingId}/after.jpg
    │
    │   [API]
    │     ├── INSERT BeforeAfterPhoto { bookingId, vendorId, staffMemberId,
    │     │                            beforeUrl, afterUrl, clientVisible: false }
    │     └── Return photo pair
    │
    ├─ Vendor can toggle [Share with Client]
    │     → PATCH /before-after/:id { clientVisible: true }
    │
    │   [API]
    │     └── UPDATE BeforeAfterPhoto SET clientVisible = true
    │         → Push → client: "Your stylist shared your transformation!"
    │

[CLIENT — MOBILE APP]
    │
    ├─ My Bookings → Completed booking → [View Transformation]
    │     → BeforeAfterViewer modal (full screen)
    │     Tabs: [Before] / [After]
    │     Swipe between images
    │
    └─ Salon Profile → Portfolio tab
          Grid of before/after pairs from this salon
          Tapping a pair opens full-screen viewer
          → GET /vendors/:id/portfolio (only clientVisible: true)
```

---

## 11. Review & Rating Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | ⚙️ System | Sends review prompt after booking completes | API → Client |
| 2 | 🟢 Client | Opens review screen | Mobile App |
| 3 | 🟢 Client | Rates 1-5 stars, writes comment | Mobile App |
| 4 | ⚙️ System | Saves review, recalculates vendor rating | API |
| 5 | 🔵 Vendor | Sees new review on dashboard | Vendor Web |
| 6 | 🔴 Admin | Can moderate flagged reviews | Admin Web |

### Full Step-by-Step Flow

```
[TRIGGERED AUTOMATICALLY]
    │
    │   [API — post booking:complete]
    │     ├── Push → client: "How was your experience at [Salon]?"
    │     └── In-app notification with deep link to review screen
    │

[CLIENT — MOBILE APP]
    │
    ├─ Review Screen
    │     Salon name + service + staff name
    │     ⭐⭐⭐⭐⭐ star rating (tap to select)
    │     [Write a review...] text area (optional, max 500 chars)
    │     [Submit Review] → POST /reviews { bookingId, rating, body }
    │
    │   [API — REVIEW VALIDATION]
    │     ├── Verify: booking.clientId === req.user.id
    │     ├── Verify: booking.status === COMPLETED
    │     ├── Verify: no existing review for this bookingId (unique constraint)
    │     ├── INSERT Review { bookingId, clientId, vendorId, staffMemberId, rating, body }
    │     ├── Recalculate vendor avg rating:
    │     │     SELECT AVG(rating) FROM Review WHERE vendorId = :id AND isVisible = true
    │     │     UPDATE Vendor SET avgRating, reviewCount++
    │     ├── Recalculate staff avg rating if staff assigned
    │     ├── Invalidate Redis cache: vendor:{id}:reviews
    │     └── Update Elasticsearch index: avgRating field
    │

[VENDOR — VENDOR WEB DASHBOARD]
    │
    ├─ Dashboard: avg rating card updates
    ├─ Analytics: new review in reviews chart
    └─ Notification: "[Client Name] left you a 5-star review"

[REVIEW MODERATION]
    │
    ├─ Any user can [Flag Review] → POST /reviews/:id/flag
    │
    │   [API]
    │     └── UPDATE Review SET isFlagged = true
    │         → Notify admin: "Review flagged for moderation"
    │

[ADMIN — ADMIN WEB PANEL]
    │
    ├─ Moderation queue: flagged reviews
    │     Shows: review content, reviewer, vendor, flag reason
    │     [Keep Visible] | [Hide Review]
    │     → POST /admin/reviews/:id/moderate { action: "hide" }
    │
    │   [API]
    │     ├── UPDATE Review SET isVisible = false
    │     └── Recalculate vendor avg rating (excluding hidden reviews)
```

---

## 12. Loyalty Rewards Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | ⚙️ System | Awards points on booking completion | API |
| 2 | 🟢 Client | Sees points balance update | Mobile App |
| 3 | ⚙️ System | Checks for tier upgrade | API |
| 4 | 🟢 Client | Views rewards screen | Mobile App |
| 5 | 🟢 Client | Redeems points for discount | Mobile App |
| 6 | 🔴 Admin | Manages tier thresholds and rules | Admin Web |

### Full Step-by-Step Flow

```
[TRIGGERED ON BOOKING COMPLETE]
    │
    │   [API — rewards.service]
    │     ├── Points = floor(totalAmount × 10)
    │     │     e.g. $100 booking = 1,000 points
    │     ├── INSERT PointsTransaction { delta: +1000, reason: "booking_complete" }
    │     ├── UPDATE User SET pointsBalance += 1000
    │     │
    │     ├── Check tier upgrade:
    │     │     Bronze:   0 – 4,999 pts
    │     │     Silver:   5,000 – 14,999 pts
    │     │     Gold:     15,000 – 29,999 pts
    │     │     Platinum: 30,000+ pts
    │     │
    │     ├── IF tier changed:
    │     │     UPDATE User SET tier = newTier
    │     │     Push: "Congratulations! You've reached [Gold] status! 🎉"
    │     └── Push: "You earned 1,000 points from your booking!"

[CLIENT — MOBILE APP]
    │
    ├─ Rewards Screen (Profile tab → Rewards)
    │     Current balance: 12,450 pts
    │     Tier badge: Silver → Gold progress bar
    │     Transaction history: earned / redeemed
    │
    ├─ Redeem Points
    │     During booking checkout:
    │     "Use [1,000 points = $5 off]" toggle
    │     → Applied as discount to PaymentIntent amount
    │     → INSERT PointsTransaction { delta: -1000, reason: "redemption" }
    │     → UPDATE User SET pointsBalance -= 1000

[ADMIN — ADMIN WEB PANEL]
    │
    └─ Settings → Rewards Config
          Points per dollar: configurable (default: 10)
          Tier thresholds: configurable
          Redemption rate: configurable (default: 1000 pts = $5)
```

---

## 13. Push Notification Flow

### Complete Notification Event Reference

| Event | Trigger | Recipient | Message |
|---|---|---|---|
| Booking Confirmed | Payment captured | Client | "✅ Booking confirmed: [Service] on [Date]" |
| New Booking | Payment captured | Vendor | "📅 New booking from [Client]!" |
| Booking Reminder | 24h before | Client | "⏰ Reminder: [Service] tomorrow at [Time]" |
| Booking Reminder | 24h before | Staff | "⏰ Appointment with [Client] tomorrow" |
| Booking Started | Vendor marks started | Client | "✂️ Your service has started!" |
| Booking Completed | Vendor marks complete | Client | "🎉 Done! Leave a review for [Salon]" |
| Review Received | Client posts review | Vendor | "⭐ [Client] left you a [N]-star review" |
| Cancellation (by client) | Client cancels | Vendor | "❌ [Client] cancelled their booking" |
| Cancellation (by vendor) | Vendor cancels | Client | "❌ [Salon] cancelled your booking. Refund issued." |
| Waitlist Promoted | Slot opens | Client | "🎉 A spot opened up! Confirm in 15 min" |
| Waitlist Expired | 15 min not confirmed | Client | "⏱️ Your waitlist spot expired" |
| New Chat Message | Vendor sends message | Client | "💬 [Salon]: [message preview]" |
| Chat Reply | Client replies | Vendor | "💬 [Client]: [message preview]" |
| Points Earned | Booking complete | Client | "⭐ You earned [N] points!" |
| Tier Upgrade | Points threshold | Client | "🏆 You've reached [Tier] status!" |
| Staff Invited | Vendor sends invite | Staff | Email only (no push yet) |
| Vendor Approved | Admin approves | Vendor | Email + "✅ Your salon is approved and live!" |
| Payout Released | T+2 auto payout | Vendor | "💰 Payout of $[amount] sent to your account" |

### Push Delivery Architecture

```
[API — Notification Service]
    │
    ├─ notification.service.send(userId, { title, body, deepLink, data })
    │
    ├─ Look up user's Expo push token(s) from DB
    │     (stored on: POST /notifications/push/register on app open)
    │
    ├─ Expo Push API:
    │     POST https://exp.host/--/api/v2/push/send
    │     { to: [token], title, body, data: { deepLink }, sound: "default" }
    │
    ├─ INSERT Notification { userId, title, body, deepLink }
    │
    └─ Update in-app badge count via Socket.IO → user:{userId}

[CLIENT — MOBILE APP]
    ├─ Push notification received → tap → deep link routing
    │     booking:confirmed → My Bookings screen
    │     chat:message     → Chat Thread screen
    │     review:prompt    → Review screen
    │     waitlist:promoted → Booking confirm screen
    │
    └─ Notifications inbox: Bell icon → all notifications listed
```

---

## 14. Vendor Analytics Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🔵 Vendor | Opens Analytics page | Vendor Web |
| 2 | ⚙️ System | Aggregates booking + revenue data | API + PostgreSQL |
| 3 | 🔵 Vendor | Views charts, KPIs, staff performance | Vendor Web |
| 4 | 🔵 Vendor | Filters by date range | Vendor Web |

### Analytics Data Points

```
[VENDOR — ANALYTICS PAGE]

KPI Cards (top row):
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Total Revenue│ │ Total Bookings│ │  Avg Rating  │ │ New Clients  │
    │   $12,450    │ │     148      │ │     4.8 ⭐    │ │     23       │
    │ vs last mo.  │ │ vs last mo.  │ │ vs last mo.  │ │ vs last mo.  │
    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Charts:
    Revenue over time (line chart) — daily/weekly/monthly toggle
    Bookings by service (pie/bar chart)
    Busiest hours heatmap (day × hour grid)
    Client retention rate (returning vs new)
    Cancellation rate

Staff Performance Table:
    | Staff Name | Bookings | Revenue | Avg Rating | Retention % |
    |------------|----------|---------|------------|-------------|
    | Sarah      | 48       | $4,200  | 4.9        | 72%         |
    | Mike       | 31       | $2,800  | 4.7        | 68%         |

    → GET /vendors/me/dashboard?from=2025-01-01&to=2025-01-31

    [API — ANALYTICS QUERY]
    ├── Revenue: SELECT SUM(vendorPayout) FROM Booking WHERE vendorId, status=COMPLETED, dateRange
    ├── Bookings count: SELECT COUNT(*) same filter
    ├── New clients: clients with first booking in date range
    ├── Retention: clients with 2+ bookings / total unique clients
    ├── Busiest hours: GROUP BY EXTRACT(hour FROM startsAt), EXTRACT(dow FROM startsAt)
    └── Cached in Redis: vendor:{id}:analytics, TTL 1h
```

---

## 15. Staff Performance & Earnings Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🟡 Staff | Opens Earnings page | Staff Web |
| 2 | ⚙️ System | Loads staff-specific booking revenue | API |
| 3 | 🟡 Staff | Views performance stats | Staff Web |
| 4 | 🔵 Vendor | Can see all staff performance | Vendor Web |

### Full Step-by-Step Flow

```
[STAFF — STAFF WEB PORTAL]
    │
    ├─ Earnings Page
    │     Period selector: This Week / This Month / Custom
    │     → GET /staff/me/earnings?from={date}&to={date}
    │
    │   [API]
    │     ├── SELECT bookings for this staffMemberId, status=COMPLETED, dateRange
    │     ├── Sum vendorPayout (staff gets % of vendor's share — configurable)
    │     └── Return: { totalEarnings, bookingCount, avgPerBooking, breakdown[] }
    │
    │   Earnings Table:
    │     | Date    | Client  | Service | Amount | Status |
    │     |---------|---------|---------|--------|--------|
    │     | Jan 15  | Sarah M | Nails   | $85    | Paid   |
    │
    ├─ Performance Page
    │     → GET /staff/me/performance
    │     Stats:
    │       Avg rating: 4.9 ⭐ (from reviews on their bookings)
    │       Total bookings: 48
    │       Client retention: 72% (clients who rebooked)
    │       Completion rate: 98% (completed vs cancelled)
    │       Avg service duration vs. booked duration
    │
    └─ Schedule Page
          Weekly calendar view
          → GET /staff/me/schedule?week={date}
          Shows: confirmed appointments, time blocks, client names
          Color coding: confirmed (green), in-progress (amber), completed (grey)

[VENDOR — VENDOR WEB DASHBOARD]
    │
    └─ Team page → click any staff member → their performance tab
          Same data as staff sees, but accessible to vendor owner
```

---

## 16. Payout Flow (Vendor)

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | ⚙️ System | T+2 days after booking completed | API Job |
| 2 | ⚙️ System | Stripe transfer to vendor account | API + Stripe |
| 3 | 🔵 Vendor | Receives payout + notification | Stripe + Vendor Web |
| 4 | 🔴 Admin | Can view all platform payouts | Admin Web |

### Full Step-by-Step Flow

```
[SYSTEM — payoutRelease.job.ts]
    │
    ├─ Runs every hour (cron)
    │     Finds: Booking WHERE status=COMPLETED
    │                   AND completedAt <= NOW() - 2 days
    │                   AND payout NOT released
    │
    ├─ For each eligible booking:
    │     stripe.transfers.create({
    │       amount: vendorPayout,          // e.g. 8500 cents = $85
    │       currency: 'aed',
    │       destination: vendor.stripeAccountId,
    │       metadata: { bookingId, vendorId }
    │     })
    │
    │   [API]
    │     ├── INSERT Payout { vendorId, stripeTransferId, grossAmount,
    │     │                  commissionAmount, netAmount, status: PENDING }
    │     └── On Stripe webhook: payout.paid
    │           UPDATE Payout SET status = PAID, paidAt = now()
    │           Push → vendor: "💰 Payout of $85 sent to your bank account"
    │

[VENDOR — VENDOR WEB DASHBOARD]
    │
    ├─ Payouts Page
    │     → GET /vendors/me/payouts?page=1
    │     Table:
    │       | Date    | Booking        | Gross  | Commission | Net  | Status |
    │       |---------|----------------|--------|------------|------|--------|
    │       | Jan 17  | [Client] Nails | $100   | $15        | $85  | Paid   |
    │
    │     Summary cards:
    │       Total Earned This Month | Pending Payouts | Total Lifetime
    │
    └─ External: vendor can log into Stripe Express dashboard
          To see: individual payouts, bank transfers, statements

[ADMIN — ADMIN WEB PANEL]
    │
    └─ Payouts page: all platform payouts
          Total commission earned by TEDDY (all application_fee_amount)
          Filter: date range, vendor, status
          Export to CSV
```

---

## 17. Dispute Resolution Flow

### Who Does What

| Step | Actor | Action | Platform |
|---|---|---|---|
| 1 | 🟢 Client | Reports issue with booking | Mobile App |
| 2 | ⚙️ System | Creates dispute ticket | API |
| 3 | ⚙️ System | Notifies admin | API → Admin |
| 4 | 🔴 Admin | Reviews dispute | Admin Web |
| 5 | 🔴 Admin | Contacts both parties | Admin Web |
| 6 | 🔴 Admin | Issues resolution (refund / no action) | Admin Web |
| 7 | ⚙️ System | Executes refund if applicable | API + Stripe |

### Full Step-by-Step Flow

```
[CLIENT — MOBILE APP]
    │
    ├─ My Bookings → Completed booking → [Report Issue]
    │     OR: Contact Support screen → [Dispute a Booking]
    │
    ├─ Dispute Form
    │     Select booking
    │     Issue type: Service not as described / Did not show up /
    │                 Charged wrong amount / Other
    │     Description (required)
    │     Evidence: upload photos (optional)
    │     → POST /disputes { bookingId, type, description, evidenceUrls[] }
    │
    │   [API]
    │     ├── INSERT Dispute { bookingId, clientId, vendorId, type, description, status: OPEN }
    │     ├── Notify admin: "New dispute filed — [Type] — $[Amount]"
    │     └── Auto-response to client: "Dispute received. We'll respond within 24h."
    │

[ADMIN — ADMIN WEB PANEL]
    │
    ├─ Disputes Queue
    │     Table: Client, Vendor, Amount, Type, Filed Date, Status
    │     Priority sort: high-value, older disputes first
    │
    ├─ Dispute Detail Page
    │     Full booking info, payment history, chat logs, photos
    │     Client's description + evidence
    │
    ├─ Admin actions:
    │     [Contact Client] → opens thread in admin chat
    │     [Contact Vendor] → opens thread in admin chat
    │
    ├─ Resolution:
    │     [Full Refund to Client]
    │       → stripe.refunds.create({ charge, amount: full })
    │       → UPDATE Dispute SET status = RESOLVED_REFUNDED
    │       → Notify both parties
    │
    │     [Partial Refund]
    │       → stripe.refunds.create({ amount: partial })
    │       → UPDATE Dispute SET status = RESOLVED_PARTIAL
    │
    │     [No Action — Client Claim Invalid]
    │       → UPDATE Dispute SET status = RESOLVED_NO_ACTION
    │       → Notify client: reason
    │
    │     [Suspend Vendor]
    │       → POST /admin/vendors/:id/suspend
    │       → Vendor dashboard locked, all future bookings blocked

[VENDOR SEES]
    → Notified of dispute via email + in-app
    → Asked to provide response / evidence
    → Notified of resolution outcome
```

---

## 18. Admin Platform Management

### Who Does What

| Feature | Admin Action | Impact |
|---|---|---|
| Vendor Approval | Approve / Reject / Suspend | Vendor goes live or is blocked |
| Commission Rate | Change global or per-vendor rate | Affects all future bookings |
| User Management | View, search, ban users | Client or vendor account blocked |
| Dispute Resolution | Review + decide | Refund or no action |
| Platform Analytics | View all KPIs | Business intelligence |
| Payout Oversight | View all payouts, flag issues | Financial reconciliation |
| Content Moderation | Hide flagged reviews | Review visible/hidden |
| Settings | Points per dollar, tier thresholds, refund policy | Platform rules |

### Admin Dashboard Features

```
[ADMIN — ADMIN WEB PANEL]

OVERVIEW PAGE
    Platform KPIs (real-time):
    ├── Total Active Vendors: 247
    ├── Total Clients: 8,432
    ├── Bookings Today: 134
    ├── Revenue Today: $18,450
    ├── Platform Commission Today: $2,767
    ├── Pending Vendor Applications: 12
    ├── Open Disputes: 3
    └── Avg Platform Rating: 4.7

VENDORS PAGE
    ├── Pending Applications tab (approval queue)
    ├── Active Vendors tab (search, filter by city/category)
    ├── Suspended Vendors tab
    └── Per-vendor: bookings, revenue, rating, complaint rate

USERS PAGE
    ├── Search by name, email, phone
    ├── Filter by: role, tier, join date
    ├── User detail: bookings, spend, reviews, disputes
    └── [Ban User] → soft-delete + revoke tokens (Redis blacklist)

ANALYTICS PAGE
    ├── Revenue chart (daily/weekly/monthly/yearly)
    ├── Commission earned by TEDDY
    ├── Top performing vendors (by revenue)
    ├── Top performing cities
    ├── Booking funnel: searches → profile views → bookings → completions
    ├── Cancellation rate trend
    └── Client retention rate

SETTINGS PAGE
    ├── Commission rate: global default (15%) + per-vendor overrides
    ├── Payout delay: T+2 days (configurable)
    ├── Loyalty points per dollar (10 pts default)
    ├── Tier thresholds (Bronze/Silver/Gold/Platinum)
    ├── Cancellation policy (24h cutoff configurable)
    ├── Waitlist confirm window (15 min default)
    └── Refund policies
```

---

## 19. Complete Cross-Role Interaction Map

This diagram shows every touchpoint between roles across the entire platform lifecycle.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║              TEDDY PLATFORM — COMPLETE ROLE INTERACTION MAP                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

                        ┌──────────────────────────────┐
                        │         ADMIN PANEL           │
                        │ • Approve / reject vendors    │
                        │ • Moderate reviews            │
                        │ • Resolve disputes            │
                        │ • Manage platform settings    │
                        │ • View all analytics          │
                        └──────────────┬───────────────┘
                                       │ approves
                                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           VENDOR WEB DASHBOARD                             │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Dashboard  │  │  Bookings /  │  │     Team     │  │    Settings    │  │
│  │ (KPIs)    │  │  Calendar    │  │  (Staff)     │  │   (Payout,     │  │
│  │           │  │              │  │              │  │    Services)   │  │
│  └────────────┘  └──────┬───────┘  └──────┬───────┘  └────────────────┘  │
└──────────────────────────│──────────────────│───────────────────────────────┘
                           │ confirms/cancels  │ invites
                           │ manages           │
                           ▼                   ▼
               ┌───────────────────┐   ┌──────────────────────────────────┐
               │   BOOKING ENGINE  │   │         STAFF WEB PORTAL          │
               │  (slot lock,      │   │  ┌──────────┐  ┌─────────────┐  │
               │   waitlist,       │   │  │ Schedule │  │  Earnings   │  │
               │   state machine)  │   │  │(calendar)│  │ Performance │  │
               └─────────┬─────────┘   │  └──────────┘  └─────────────┘  │
                         │             └──────────────────────────────────┘
                         │ real-time                ▲
                         │ push notifications        │ assigned bookings
                         │                           │
                         ▼                           │
┌──────────────────────────────────────────────────────────────────────────┐
│                        CLIENT MOBILE APP                                   │
│                                                                            │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────┐    ┌─────────────┐ │
│  │   Home /    │    │   Booking    │    │   Chat   │    │   Profile / │ │
│  │  Discover   │    │   My Bookings│    │ (receive)│    │   Rewards   │ │
│  │  (Search)   │    │   Payment    │    │          │    │             │ │
│  └──────┬──────┘    └──────┬───────┘    └────┬─────┘    └─────────────┘ │
└─────────│─────────────────│───────────────────│──────────────────────────┘
          │                  │                   │
          │ browses          │ books + pays       │ receives messages
          ▼                  ▼                   ▼
    ┌──────────────────────────────────────────────────┐
    │                   BACKEND API                     │
    │  ┌──────────┐  ┌────────┐  ┌──────┐  ┌───────┐ │
    │  │ Search   │  │Booking │  │Stripe│  │Socket │ │
    │  │ (ES geo) │  │Engine  │  │Pay   │  │  .IO  │ │
    │  └──────────┘  └────────┘  └──────┘  └───────┘ │
    │  ┌──────────┐  ┌────────┐  ┌──────┐  ┌───────┐ │
    │  │ Auth     │  │Review  │  │Media │  │ Push  │ │
    │  │ JWT/RBAC │  │Engine  │  │ S3   │  │ Notif │ │
    │  └──────────┘  └────────┘  └──────┘  └───────┘ │
    └──────────────────────────────────────────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
    ┌──────────┐      ┌────────────┐      ┌──────────────┐
    │PostgreSQL│      │   Redis    │      │Elasticsearch │
    │(source   │      │(cache,     │      │(vendor geo   │
    │ of truth)│      │ pub/sub,   │      │ search)      │
    └──────────┘      │ job queue) │      └──────────────┘
                      └────────────┘
```

### Feature → Role Matrix

| Feature | 🟢 Client | 🔵 Vendor | 🟡 Staff | 🔴 Admin |
|---|---|---|---|---|
| Register | ✅ Self | ✅ Self (pending) | Invite only | System |
| Login | ✅ | ✅ | ✅ | ✅ |
| Browse/Search | ✅ | — | — | — |
| View Vendor Profile | ✅ | Own only | Own vendor | All |
| Wishlist | ✅ | — | — | — |
| Book Service | ✅ | — | — | — |
| Pay | ✅ | — | — | — |
| View Own Bookings | ✅ | All salon's | Assigned only | All |
| Confirm/Start/Complete | — | ✅ | — | — |
| Cancel Booking | ✅ Own | ✅ Own salon | — | ✅ All |
| Mark No-Show | — | ✅ | — | ✅ |
| Join Waitlist | ✅ | — | — | — |
| Initiate Chat | — | ✅ Only | — | — |
| Reply Chat | ✅ | ✅ | ✅ | — |
| Upload Before/After | — | ✅ | ✅ | — |
| View Portfolio | ✅ | Own | Own vendor | All |
| Write Review | ✅ (post-booking) | — | — | — |
| Flag Review | ✅ | ✅ | — | — |
| Moderate Review | — | — | — | ✅ |
| Earn Points | ✅ | — | — | — |
| Redeem Points | ✅ | — | — | — |
| View Own Analytics | — | ✅ | ✅ (own) | All |
| Invite Staff | — | ✅ | — | — |
| View Payouts | — | Own | — | All |
| Approve Vendor | — | — | — | ✅ |
| Suspend User/Vendor | — | — | — | ✅ |
| Resolve Disputes | — | — | — | ✅ |
| Configure Platform | — | — | — | ✅ |

---

*Document End — TEDDY Application Flow v1.0*
*Next update trigger: Any new feature, role permission change, or booking flow modification*
