# Teddy customer app — Bug Report

**Test pass:** 2026-09-25 · local backend (Postgres 16 + Redis, all integrations mocked) · iOS dev build `com.teddybookingllc.teddy` on iPhone 16 simulator (iOS 18.6)
**Scope:** customer (client) mobile app + the API endpoints it uses. Vendor/staff actions triggered via API.
**Status key:** CONFIRMED = reproduced with evidence · SUSPECTED = code reading only, not reproduced · NOT TESTED
**Severity:** S1 critical (security / money / core flow blocked) · S2 major · S3 minor · S4 cosmetic
**Nothing in `api/` or `User/app/src` was changed during testing.**

## Summary

| | Count |
|---|---|
| API tests (`node qa/api/run.mjs`) | 116 run · **59 pass · 57 fail** · 0 blocked |
| UI journeys run on the simulator | U1 sign-up, U1b/U1c onboarding, U2 login, U3 booking, U4 cancel, U5 chat, U7 change password, U9 logout, push registration |
| Confirmed bugs below | **S1: 21 · S2: 17 · S3: 12 · S4: 5** (55 total) |

**The three that block the product:**
1. **Nobody can sign up** with a normal phone number (TDY-001).
2. **Nobody can book** — the app sends a fake salon ID, and the payment steps after it are broken too (TDY-002, TDY-003).
3. **Any logged-in customer can read or change other customers' medical data, refund any booking for any amount, give themselves store credit, and read other people's chats** (TDY-010 … TDY-016).

Evidence paths: API results → `qa/evidence/api-results.md` (+ `.json`); screenshots → `qa/evidence/maestro/<run>/…`; server log → `qa/evidence/api.log`.

---

## S1 — Critical

### TDY-001 · Sign-up always fails when the phone number is typed normally
- **Status:** CONFIRMED (U1) · **Area:** auth / sign-up · **Priority:** P1
- **Steps:** Fresh install → Skip → fill Full Name, Email, phone `5551234567` next to the **+1** label, password `Password123!` ×2, tick Terms → **Signup**.
- **Expected:** account created → onboarding (docs: APPLICATION_FLOW §1).
- **Actual:** red banner **"Validation failed"**, no account. API log: `POST /v1/auth/register 422`. Typing `+15551234567` works (U1b), but no user would do that because the UI already shows "+1".
- **Evidence:** `maestro/…_041426/U1 Sign up/takeScreenshot/U1-03-after-signup.png`
- **Root cause:** `User/app/src/features/auth/screens/SignUpScreen.tsx:~58` sends `phone.trim()` as typed; API requires E.164 (`api/src/lib/validators/auth.validator.ts` `RegisterSchema.phone`). Same screen: a single-word name sends `lastName: ''` (API needs ≥1 char), and the app only checks length ≥8 while the API also needs an uppercase letter and a digit → same useless "Validation failed" message.

### TDY-002 · Booking from the app is impossible — request uses a fake salon ID
- **Status:** CONFIRMED (U3) · **Area:** booking · **Priority:** P1
- **Steps:** Log in → Services → Skincuress Salon → Services → Body Wrap → Book This Service → Sep 30, 1:00 PM → Continue → specialist → Continue → Submit & Continue → Continue to Payment → Pay Now.
- **Expected:** booking created for Body Wrap at Skincuress.
- **Actual:** **"Service does not belong to vendor"** (`POST /v1/bookings 403`). No booking created.
- **Evidence:** `maestro/…_044046/U3 Booking/takeScreenshot/U3-08-result.png`
- **Root cause:** `SalonIntakeScreen.tsx:36-47` drops `vendorId`; `BookingSummaryScreen.tsx:91` then passes `vendorId: service.salonId` from the **mock** list.

### TDY-003 · Even with a valid booking, the app's payment sequence fails (500)
- **Status:** CONFIRMED (API test AC-01) · **Area:** booking / payments · **Priority:** P1
- **Actual:** `POST /bookings` returns `{ booking, waitlisted }`, but `BookingPaymentScreen.tsx:61` reads `booking.id` from the top level → `undefined` → `POST /payments/intent {bookingId: undefined}` → **500**. Then `/payments/confirm` is sent `{ bookingId }`, but the API expects `{ paymentIntentId }` (`api/src/controllers/payment.controller.ts` `confirm`) → **500**.
- **Expected:** booking paid and shown as confirmed.

### TDY-010 · Any customer can refund any booking, for any amount
- **Status:** CONFIRMED (SE-04, SE-05) · **Area:** payments / security · **Priority:** P1
- **Actual:** qa.client2 called `POST /v1/payments/{sophia's booking}/refund {amount: 99999}` → 200, payment now `REFUNDED 99999.00`. A customer can also refund **their own** $120 booking for $5,000.
- **Root cause:** `api/src/controllers/payment.controller.ts:33-38` — no ownership check, no role check, amount taken from the request body, no cap.

### TDY-011 · Any customer can read and edit any other customer's medical profile
- **Status:** CONFIRMED (SE-09, SE-10) · **Area:** clinical / security (health data) · **Priority:** P1
- **Actual:** `GET /v1/clinical/clients/{sophiaId}/profile` as qa.client2 → 200 with Sophia's name, email, medical history and allergies. `PATCH` the same URL → Sophia's notes changed to "tampered by qa2".
- **Root cause:** `api/src/controllers/clinical.controller.ts:13-24` — `:userId` is used directly, no check that it's the caller (or their salon).

### TDY-012 · Any customer can read and overwrite other customers' pre-visit intake and service records
- **Status:** CONFIRMED (SE-11) · **Area:** clinical / security · **Priority:** P1
- **Actual:** intake read → 200, intake write → 200, service record read → 200 for a booking that isn't theirs.
- **Root cause:** `clinical.controller.ts:45-60` (`getRecord`, `submitIntake`, `getIntake`) have no ownership checks.

### TDY-013 · Customers can give themselves store credit
- **Status:** CONFIRMED (CD-02) · **Area:** clinical profile / money · **Priority:** P1
- **Actual:** `PATCH /v1/clinical/clients/me/profile {storeCredit: 500}` → credit is now 500. Store credit is spent at checkout (`api/src/services/checkout.service.ts:78,108`).
- **Root cause:** `api/src/services/clinical.service.ts:50` copies `storeCredit` from the request.

### TDY-014 · Any customer can read other customers' bookings, payments, waitlist position and photos
- **Status:** CONFIRMED (SE-01, SE-03, SE-06, SE-08, SE-14) · **Area:** booking / security · **Priority:** P1
- **Actual:** as qa.client2: `GET /bookings/seed-bk-1` (Sophia's) → 200 incl. payment; `GET /payments/seed-bk-1/status` → 200; payment intent on someone else's booking → 201; waitlist position → 200; before/after photos → 200.
- **Root cause:** `api/src/services/booking.service.ts:651` treats **any** booking with a staff member as "owned" (`|| booking.staffMemberId != null`); payment/waitlist/media endpoints have no ownership check at all.

### TDY-015 · Any customer can listen to other customers' chats in real time
- **Status:** CONFIRMED (SE-13, SE-12) · **Area:** chat / security · **Priority:** P1
- **Actual:** qa.client2's socket emitted `chat:join` with Sophia's thread ID and received the salon's private message. Any user can also mark any thread as read.
- **Root cause:** `api/src/socket/index.ts:50-56` joins any room on request; `chat.service.ts:79` has no ownership check.

### TDY-016 · A forged, unsigned webhook can cancel or confirm any booking
- **Status:** CONFIRMED (SE-18) · **Area:** payments / security · **Priority:** P1
- **Actual:** anonymous `POST /v1/payments/webhooks/stripe` with `payment_intent.payment_failed` + any booking ID → booking becomes `CANCELLED_CLIENT`. The deploy docs run with `PAYMENT_MOCK_MODE=true`, so this applies to the documented deployment.
- **Root cause:** `api/src/services/payment.service.ts:91-119` skips signature checks in mock mode.

### TDY-017 · Anonymous guest booking abuse: book in someone else's name, set your own price
- **Status:** CONFIRMED (SE-16, SE-17, BK-10) · **Area:** public booking / security / money · **Priority:** P1
- **Actual:**
  - No-login `POST /v1/public/bookings` with `guestEmail: sophia.carter@example.com` adds a booking **to Sophia's account**.
  - An add-on priced `-119` turned a $120 service into **$1.00**.
  - Logged-in bookings accept made-up add-ons (any name, price and duration).
- **Root cause:** `api/src/services/public.service.ts:37` find-or-create by email with no verification; `booking.service.ts:50-55` trusts client-supplied add-on prices; `/public/bookings` has no validator.

### TDY-018 · Gift card "redeem" with a negative amount adds money to the card
- **Status:** CONFIRMED (SE-20, staff endpoint) · **Area:** gift cards / money · **Priority:** P1
- **Actual:** redeem `-500` on TEDDY-GLOW-25 → balance **25.00 → 525.00**.
- **Root cause:** `api/src/services/giftcard.service.ts:53` — no `amount > 0` check; check-then-decrement is not atomic.

### TDY-019 · Another salon's owner can start or no-show your booking
- **Status:** CONFIRMED (LC-05) · **Area:** booking lifecycle / security · **Priority:** P1
- **Actual:** Glow Up's owner (camille@) started, then no-showed, a Skincuress booking → it's now `NO_SHOW`.
- **Root cause:** `booking.service.ts` `startBooking`/`completeBooking`/`markNoShow` never compare the actor's vendor with the booking's vendor.

### TDY-022 · Cancelling refunds the full price even when only a deposit was paid
- **Status:** CONFIRMED (BK-14) · **Area:** money · **Priority:** P1
- **Actual:** Body Wrap $110 with a 30% deposit ($33 paid) → cancel → `refundAmount: 110`.
- **Root cause:** `booking.service.ts:~499` refunds `totalAmount` instead of the captured amount.

### TDY-023 · The same booking can be refunded again and again
- **Status:** CONFIRMED (BK-15, LC-12) · **Area:** money · **Priority:** P1
- **Actual:** cancelling an already-cancelled booking → 200, `refundAmount: 120` again. The salon cancelling a **COMPLETED** booking → 200, refund 120.
- **Root cause:** `cancelBooking` has no status check.

### TDY-029 · "Logout" in the side menu doesn't log out
- **Status:** CONFIRMED (U9) · **Area:** auth · **Priority:** P1
- **Steps:** Log in as Sophia → ☰ → Logout → close and reopen the app.
- **Actual:** the app opens straight onto **Home, logged in as Sophia**.
- **Evidence:** `maestro/…/U9 Drawer logout/…`
- **Root cause:** `User/app/src/navigation/DrawerContent.tsx:14` only navigates to Login; the token stays in storage.

### TDY-030 · "Delete My Account" doesn't delete the account
- **Status:** CONFIRMED (AC-05, code check) · **Area:** account · **Priority:** P1 (**App Store rule 5.1.1(v) requires working account deletion**)
- **Actual:** `ProfileScreen.tsx:146-152` only clears the local token; `DELETE /users/me` is never called. The account and data stay on the server. (The API endpoint itself works — PR-08.)

### TDY-007 · Customers are logged out every 15 minutes and lose what they were doing
- **Status:** CONFIRMED (U3) · **Area:** auth / session · **Priority:** P1
- **Actual:** qa.client1 signed up at 04:16:44 and tapped Pay Now at 04:33:20 → `POST /bookings 401` → app threw the user back to the splash screen, booking lost, no message.
- **Evidence:** `maestro/…_043312/probe/takeScreenshot/U3-11-after-pay.png`
- **Root cause:** `LoginScreen.tsx:66` / `SignUpScreen.tsx:62` save only the 15-minute access token and discard the 7-day refresh token; `utils/api.ts` never refreshes.

### TDY-054 · Any customer can make themselves ADMIN (found in code review, verified)
- **Status:** CONFIRMED (SE-21, manual repro) · **Area:** notifications / security · **Priority:** P0
- **Actual:** as qa.client2: `PATCH /v1/notifications/preferences {"user":{"update":{"role":"admin"}}}` → 200; DB role `client → admin`; after logging in again `GET /v1/admin/users` → **200**. (Test account restored to client afterwards.)
- **Root cause:** `api/src/controllers/notification.controller.ts:51-54` passes `req.body` straight into `prisma.notificationPreference.update({ data })` with no validator, so Prisma's nested `user.update` writes the User row. Also the cause of TDY-039 (bad payload → 500).

### TDY-055 · The 7-day refresh token works as a normal login token (found in code review, verified)
- **Status:** CONFIRMED (AU-26) · **Area:** auth / security · **Priority:** P1
- **Actual:** using the refresh token as `Authorization: Bearer` → `GET /users/me` 200, `GET /chat/threads` 200. A leaked refresh token gives 7 days of access instead of 15 minutes, including `DELETE /users/me` and sockets.
- **Root cause:** `api/src/lib/jwt.ts:61` `verifyAccessToken` never checks the token `type`.

### TDY-056 · Any customer can mark another customer's payment as paid (found in code review, verified)
- **Status:** CONFIRMED (SE-22) · **Area:** payments / security · **Priority:** P1
- **Actual:** Sophia creates a payment intent; qa.client2 calls `POST /v1/payments/confirm {paymentIntentId}` → 200, Payment `PENDING → CAPTURED`. In mock mode this is also how "payment" happens at all — no money is proven to have moved.
- **Root cause:** `api/src/controllers/payment.controller.ts:25-31` `confirm` has no ownership or state check.

---

## S2 — Major

| ID | Bug | Status / evidence | Root cause |
|---|---|---|---|
| TDY-004 | **Booking date/time can be wrong** (root cause corrected in code review): the calendar lets you tap **greyed-out days from the previous month and past days** and never highlights the chosen day — the U3 test tapped the first "30" on screen, which was **Aug 30** (a past date), and nothing showed it; Continue is enabled with **no date**, silently booking `2026-01-15`; and times are stored as **UTC wall-clock** (1:00 PM salon time saved as 13:00Z) | CONFIRMED U3-05, U3-06 (code check for fallback + TZ) | `MiniCalendar.tsx:76-78` no `disabled` for spill-over/past days, no selected state; `TimeSlotPicker.tsx:143` `date ?? '2026-01-15'`; `toISO` in `BookingPaymentScreen.tsx:17-23` and `RescheduleTimeSlotScreen.tsx:12` appends `Z` |
| TDY-005 | Booking screens after "Book This Service" show **mock data**: "Glow Up Aesthetics · 45 min · $35" for a $110/90 min Skincuress service; specialists Maya/Priya/Sofia don't exist; summary says "Signature Manicure" | CONFIRMED U3-03…06 | `SelectTimeSlotScreen`, `StaffSelectionScreen.tsx:25 MOCK_STAFF`, `BookingSummaryScreen` use `mock-data` |
| TDY-006 | Payment screen shows **no amount**, offers **Google Pay on iPhone**, and **Pay Now submits with empty card fields** | CONFIRMED U3-07 | `BookingPaymentScreen.tsx:43` price from mock list; no card SDK / validation |
| TDY-008 | **Chat messages never send**: the app posts `{content}`, the API requires `{body}` → 422 — but the bubble shows **✓ sent**, so the customer thinks the salon got it | CONFIRMED U5-03, CH-03 | `ChatThreadScreen.tsx:77`; failed send not rolled back (`:80`) |
| TDY-009 | **Existing chat messages render as empty bubbles** (only timestamps) | CONFIRMED U5-02, CH-04 | API field `body`, app reads `content` (`ApiMessage` in `utils/api.ts`) |
| TDY-025 | **Double booking** is easy: same staff 15 min later → both PENDING; same slot after the 5-min lock → both PENDING; reschedule onto an occupied slot → 200; reschedule 200 days ahead → 200; bookings in the **past** → 201; no opening-hours/availability check | CONFIRMED BK-02, 06, 08, 09, 18, 19 | lock key only matches exact start time (`booking.service.ts:16,67`); `rescheduleBooking` takes no lock and no window check |
| TDY-026 | A **waitlisted** booking can be paid (intent 201) | CONFIRMED BK-21 | `createIntent` has no status check |
| TDY-027 | A cancelled booking can be **confirmed again**; an **in-progress** service can be marked **no-show** | CONFIRMED LC-04, LC-11 | `confirmBooking` no status check; `markNoShow` accepts IN_PROGRESS (`booking.service.ts`, also `jobs/scheduler.ts:55`) |
| TDY-024 | **Loyalty points lost** when two services complete at the same moment (2 × $120 → +1,200 instead of +2,400) | CONFIRMED LC-14 | `rewards.service.ts` read-modify-write, not atomic |
| TDY-028 | **Change Password does nothing** but returns to Profile as if it worked; a wrong current password is also "accepted" | CONFIRMED U7-03, PR-04, PR-05 | `ChangePasswordScreen.tsx:27` sends to `PATCH /users/me`, whose validator silently strips the fields → no password endpoint exists |
| TDY-031 | **Edit Profile fails for anyone without a phone number** (all email sign-ups before TDY-001): 422 "Expected string, received null" | CONFIRMED PR-06 | `EditProfileScreen.tsx:53` sends `phone: null` |
| TDY-033 | **Onboarding answers are thrown away**: skin type, goals, salon preferences never reach the server; salons never see them (spec says they're shared with salons) | CONFIRMED U1c (server profile empty after onboarding) | onboarding saves only to local Zustand store |
| TDY-021 | **Logout doesn't revoke the refresh token** (it keeps working); a **deleted account can still log in by phone OTP**; a deleted user's access token still works until expiry | CONFIRMED AU-10, AU-14, PR-08 | `auth.controller.ts:64` deletes the wrong token ID; `verifyOtp` (`auth.service.ts:~161`) doesn't check `deletedAt/isActive` |
| TDY-020 | **Any user can delete any stored file** by key (no ownership check); no-op in mock mode, destructive with real S3 | CONFIRMED SE-15 (HTTP 204) | `media.controller.ts deleteMedia` |
| TDY-044 | **Push tokens pile up and are never removed at logout** — one simulator = 6 tokens for qa.client1; on a shared phone the previous user keeps receiving the next user's notifications | CONFIRMED (DB `User.pushTokens`) | no token removal endpoint / call on logout |
| TDY-036 | Public salon API **leaks** `ownerId`, `commissionRate`, staff `userId`s and permission flags; **pending** (unapproved) salon detail is public | CONFIRMED DI-02, DI-03 | `vendor.controller getById` returns raw row |
| TDY-032 | Emails are case-sensitive: `QA.Case@Example.com` creates a **second account**; `Sophia.Carter@Example.com` can't log in | CONFIRMED AU-03, AU-08 | no lower-casing in register/login |

## S3 — Minor

| ID | Bug | Status / evidence |
|---|---|---|
| TDY-034 | Salon ratings wrong: list shows **4.5 for every salon** (reads `rating`, API sends `avgRating` — `ServicesBrowseScreen.tsx:125`); salon profile shows **"0 (6)"** | CONFIRMED U3 |
| TDY-037 | A brand-new user's home shows **fake data** ("Drink 8 Glass of Water 🔥 8 DAYS STREAK", "You usually journal at night"); greeting says **"Good afternoon" at 4:23 AM** | CONFIRMED U1c-07 |
| TDY-038 | Tier thresholds differ from spec: 1,200 points → **SILVER** (spec: Bronze until 5,000; code uses 1,000/5,000/10,000 vs spec 5,000/15,000/30,000) | CONFIRMED LC-13 — **also a spec question** |
| TDY-040 | Avatar upload returns **404** in media mock mode (upload URL route doesn't exist) | CONFIRMED CD-11 |
| TDY-041 | "Rate Now" from a notification passes the **notification ID** as booking ID → 404 | CONFIRMED AC-04 |
| TDY-039 | Invalid notification-preference payload → **500** instead of 4xx | CONFIRMED PR-11 |
| TDY-043 | Chat list shows no last-message preview (API sends `messages[]`, app expects `lastMessage`) | CONFIRMED U5-01 |
| TDY-045 | Salon profile shows hard-coded tags ("Cosmetic Surgeon") and an empty placeholder Feed | CONFIRMED U3-02 |
| TDY-046 | **iOS build fails when the project path contains spaces** ("Teddy by sundeed") — `expo-constants` build script | CONFIRMED (xcodebuild 65). Workaround used: build from a copy at `~/StudioProjects/teddy-app-ios` |
| TDY-048 | Admin can't confirm bookings although the route allows it (compares actor to the string `'admin'`) | CONFIRMED LC-03 |
| TDY-049 | Wishlist accepts non-existent salons | CONFIRMED CD-09 |
| TDY-050 | Admin/vendor-only `GET /memberships/plans` returns 403 "Not associated with a vendor" for clients | CONFIRMED (not used by the app today) |

## S4 — Cosmetic / latent

| ID | Bug | Status |
|---|---|---|
| TDY-035 | Prices come back from the API as strings (`"110"`), risky for arithmetic in the app | CONFIRMED DI-05 |
| TDY-042 | App API client calls `res.json()` on every response → throws on 204 (logout/delete) | CONFIRMED AC-06 |
| TDY-051 | Review text over 500 chars accepted (spec: 500) | CONFIRMED LC-10 |
| TDY-052 | Docs list demo accounts that don't exist in the seed (`priya@skincuress.com`, `maya.johnson@…`); real ones are `emily@`, `sarah.mitchell@` | CONFIRMED |
| TDY-053 | Dev build shows a React Native warning toast on most screens ("Open debugger to view warnings") | CONFIRMED (content not inspected) |

## SUSPECTED / NOT TESTED (code reading only — to confirm in a follow-up pass)
- Login lockout never triggers (`store/auth.ts` `isLocked: () => false`); the 3rd-failure message is cleared — **SUSPECTED**
- Forgot password, Google/Facebook/Apple sign-in, OTP screen are stubs — **SUSPECTED**
- Edit Reminder creates a duplicate instead of updating; GoalDetails crashes with no goals; journal edit button does nothing — **SUSPECTED** (U8 wellness not run)
- Gift Cards screen is static; reward detail is a placeholder; referral code hard-coded — **SUSPECTED** (U6 not run)
- Waitlisted bookings show Cancel/Reschedule buttons — **SUSPECTED**
- Allergy/medical answers stored unencrypted in AsyncStorage next to the token — **SUSPECTED**
- ~9 screens swallow API errors and show an empty screen (`.catch(() => {})`) — **SUSPECTED** (U12 resilience not run)
- Scheduler auto-no-shows in-progress bookings after 30 min (`jobs/scheduler.ts:55`) — endpoint path CONFIRMED (TDY-027), job path **NOT TESTED**
- Real auth rate limit (10 / 15 min) — **NOT TESTED** (raised for the test run)
- Push tap → screen routing (`routeForDeepLink` still TODO) — **NOT TESTED**

## Spec questions (docs contradict each other — need your decision, not bugs)
1. **Points per $1:** 10 (APPLICATION_FLOW, render.yaml) or 100 (DEPLOYMENT_HANDOFF, `.env.server.example`)?
2. **Late cancel (<24h) by client:** 50% refund (APPLICATION_FLOW §8) or no refund (SYSTEM_ARCHITECTURE)? Code **blocks** late cancels entirely ("contact the salon").
3. **After payment:** auto-confirm (APPLICATION_FLOW §5) or vendor confirms manually (vendor PDF)? Code: stays PENDING until the vendor confirms (BK-13).
4. **Lockout:** 3 failed attempts (USER_FLOW) or only an IP rate limit (feature PDF)? App text says 3, code constant says 5.
5. **Tiers:** spec 5k/15k/30k vs code 1k/5k/10k (TDY-038).
6. **Staff** can start/complete services (Employer PDF) or vendor only (AF §19 matrix)? Code allows staff.
7. **Wishlist/Favorites:** Phase 1 (APPLICATION_FLOW) or Phase 2 (SOW)?
