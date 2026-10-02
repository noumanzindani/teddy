const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ── Brand colours ────────────────────────────────────────────────────────────
const GOLD   = '#D4A843';
const INK    = '#18181B';
const MUTED  = '#6B6B62';
const CREAM  = '#F5F0E1';
const WHITE  = '#FFFFFF';
const SAGE   = '#5A6B52';
const BORDER = '#E4E0D0';

const OUT_DIR = path.join(__dirname, 'docs', 'role-features');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────────────────────────────────────
const roles = [
  {
    id: 'user',
    title: 'Client (User) App',
    subtitle: 'React Native / Expo SDK 54 — iOS, Android & Web',
    color: GOLD,
    intro: 'The Teddy Client App is the consumer-facing surface that allows end-users to discover beauty vendors, book and pay for services, earn loyalty rewards, and communicate with their salon — all in one mobile-first experience.',
    functional: [
      {
        category: 'Authentication & Onboarding',
        items: [
          ['Register with email & password', 'Create an account with first name, last name, email, phone, and a strong password.'],
          ['Login with email & password', 'Secure session creation using RS256 JWT access + refresh token pair.'],
          ['Google OAuth login', 'One-tap sign-in via Google Identity using google-auth-library; account linked automatically.'],
          ['Phone OTP login', 'Receive a one-time passcode via SMS (Twilio in production, console-mocked in dev) to authenticate.'],
          ['JWT token refresh', 'Silent token rotation using the refresh-token endpoint; access tokens expire in 15 minutes.'],
          ['Logout', 'Invalidates the refresh token server-side and clears secure local storage.'],
        ],
      },
      {
        category: 'Vendor & Service Discovery',
        items: [
          ['Location-aware search', 'Geo-radius search surfaces vendors sorted by distance; Haversine post-filter applied on results.'],
          ['Full-text search', 'Search by vendor name, service name, or category using Prisma contains with insensitive mode.'],
          ['Filter & sort', 'Filter by category, price range, minimum rating, and distance. Sort by rating, price, or distance.'],
          ['Vendor profile view', 'View business name, photos, description, services list, staff bios, ratings, and verified reviews.'],
          ['Service detail view', 'See service name, duration, price, description, and real-time staff availability.'],
          ['Browse categories', 'Categorised browse (Skincare, Nails, Hair, Spa, Massage, etc.) from the home screen.'],
          ['Wishlist', 'Save favourite vendors to a personal wishlist for quick future access.'],
        ],
      },
      {
        category: 'Booking Management',
        items: [
          ['Create booking', 'Select service, staff member, date & time slot; slot locked in Redis on confirmation.'],
          ['Pay at booking', 'Stripe payment intent created at booking time; card charged on payment confirmation.'],
          ['View bookings', 'Full history of upcoming and past bookings with status badges and service details.'],
          ['Cancel booking', 'Client cancels >24 h before: 100% refund. Within 24 h: 50% refund. Vendor cancel: 100% refund.'],
          ['Join waitlist', 'If a slot is fully booked, client joins the waitlist and is auto-promoted when a spot opens.'],
          ['Waitlist position', 'View current position in the queue and estimated wait status.'],
          ['Booking reminders', 'Automated push notification sent 24 hours before each confirmed appointment.'],
          ['Real-time status updates', 'Booking status changes (Confirmed, In Progress, Completed, Cancelled) pushed via Socket.IO.'],
        ],
      },
      {
        category: 'Payments',
        items: [
          ['Stripe checkout', 'Encrypted card input via Stripe React Native SDK; PCI-compliant — card data never touches the server.'],
          ['Payment confirmation', 'POST /v1/payments/confirm finalises the charge and transitions booking to CONFIRMED.'],
          ['Refunds', 'Automatic refund initiated server-side on eligible cancellations; credited to original payment method.'],
          ['Payment status', 'View payment status and amount for each booking in booking detail screen.'],
        ],
      },
      {
        category: 'Loyalty Rewards',
        items: [
          ['Earn points', '10 points awarded per dollar spent on each successfully completed booking.'],
          ['Tier progression', 'Four tiers — Bronze, Silver, Gold, Platinum — each with escalating perks and discount thresholds.'],
          ['Redeem points', 'Points redeemable as discount on future bookings at applicable reward rate.'],
          ['Points history', 'Chronological ledger of all point earn/redeem transactions.'],
          ['Tier status', 'Current tier displayed on profile with progress indicator towards next tier.'],
        ],
      },
      {
        category: 'In-App Chat',
        items: [
          ['View chat threads', 'List of all active chat conversations with vendors (vendor-initiated only per business rules).'],
          ['Send & receive messages', 'Real-time text messaging via Socket.IO /chat namespace with Redis pub/sub relay.'],
          ['Before & after photos', 'View before-and-after photos uploaded by the vendor for a completed booking.'],
          ['Read receipts', 'Mark thread as read; unread count badge displayed on chat tab.'],
        ],
      },
      {
        category: 'Reviews & Ratings',
        items: [
          ['Leave a review', 'Submit a star rating (1–5) and written review — only available after a completed booking.'],
          ['View vendor reviews', 'Read verified client reviews on vendor profiles; average rating displayed prominently.'],
        ],
      },
      {
        category: 'Profile & Settings',
        items: [
          ['View & edit profile', 'Update first/last name, phone number, and profile photo.'],
          ['Avatar upload', 'Upload profile photo via device camera or gallery; stored via S3 (mocked in dev).'],
          ['Push notification token', 'Register Expo push token with the API for targeted notifications.'],
          ['Notification preferences', 'Toggle push notifications per category (booking updates, promotions, chat messages).'],
          ['Delete account', 'Request account deletion; all personal data removed per privacy policy.'],
        ],
      },
    ],
    nonFunctional: [
      ['Performance', 'App cold-start under 3 seconds. API responses cached in Redis (TTL 10 min for search, 1 h for profiles). OTA updates via expo-updates for instant bug fixes without store review.'],
      ['Security', 'RS256 JWT (access 15 min / refresh 7 days). Tokens stored in expo-secure-store (iOS Keychain / Android Keystore). Rate limiting: 10 auth attempts per 15 min per IP. CORS restricted to known origins.'],
      ['Reliability', 'Socket.IO auto-reconnects on network drop. Zustand state persisted to AsyncStorage for offline reading. Background fetch retries failed API calls with exponential backoff.'],
      ['Cross-Platform', 'Single React Native codebase targets iOS 16+, Android 10+, and Expo Web. NativeWind v4 ensures pixel-consistent UI across platforms.'],
      ['Scalability', 'Stateless API behind load balancer. Redis adapter on Socket.IO for horizontal scaling. Slot-lock TTL (300 s) prevents deadlocks at scale.'],
      ['Accessibility', 'VoiceOver / TalkBack labels on all interactive elements. Minimum 44 pt touch targets. Colour contrast ratio ≥ 4.5:1 across the UI.'],
      ['Privacy', 'No analytics SDK on the client by default. Location requested only when searching — not stored. Payment data handled exclusively by Stripe; never logged server-side.'],
      ['Maintainability', 'TypeScript strict mode. Zustand stores follow single-responsibility. Axios interceptors centralise auth header injection and 401 handling.'],
    ],
  },

  // ── VENDOR ──────────────────────────────────────────────────────────────────
  {
    id: 'vendor',
    title: 'Vendor Dashboard',
    subtitle: 'Next.js 14 App Router — Web (salon owners & managers)',
    color: SAGE,
    intro: 'The Teddy Vendor Dashboard is a full business management platform for salon owners. It covers the entire operational lifecycle — from onboarding and service setup to real-time booking management, staff coordination, financial payouts, and growth analytics.',
    functional: [
      {
        category: 'Onboarding & Authentication',
        items: [
          ['Vendor application', 'Submit business details, service categories, and supporting documents for admin review.'],
          ['Application status tracking', 'View current application status (Pending, Approved, Rejected, Suspended) on login.'],
          ['Login with email & password', 'JWT-based session; vendor_owner role required to access dashboard.'],
          ['Password reset', 'Email-based password reset flow with tokenised link.'],
        ],
      },
      {
        category: 'Business Profile',
        items: [
          ['Edit business profile', 'Update business name, description, address, phone, website, and operating hours.'],
          ['Upload portfolio photos', 'Add gallery images to showcase the salon environment and work quality.'],
          ['Service categories', 'Tag the business with relevant service categories visible in client search.'],
        ],
      },
      {
        category: 'Service Management',
        items: [
          ['Create service', 'Define service name, description, category, duration (minutes), and price.'],
          ['Edit service', 'Modify any service attribute; changes reflected immediately in client search results.'],
          ['Delete service', 'Soft-delete removes the service from discovery while preserving booking history.'],
          ['View all services', 'Paginated service list with quick edit and status toggles.'],
        ],
      },
      {
        category: 'Booking Management',
        items: [
          ['View all bookings', 'Paginated booking list filterable by status, date range, staff, and service.'],
          ['Today\'s bookings', 'Dashboard widget showing all appointments for the current day in chronological order.'],
          ['Weekly calendar view', 'Week-at-a-glance grid displaying all bookings by day and time slot.'],
          ['Confirm booking', 'Manually confirm a PENDING booking; client notified via push and email.'],
          ['Start booking', 'Mark booking as IN_PROGRESS when the client arrives; triggers no-show detection job.'],
          ['Complete booking', 'Mark booking COMPLETED; awards client loyalty points and queues payout release job.'],
          ['Cancel booking', 'Cancel on behalf of the vendor; full refund automatically initiated for the client.'],
          ['Mark no-show', 'Record a client no-show; booking transitions to NO_SHOW status for record-keeping.'],
          ['Real-time updates', 'New bookings and status changes pushed instantly via Socket.IO /booking namespace.'],
        ],
      },
      {
        category: 'Staff Management',
        items: [
          ['Invite staff member', 'Send email invitation with a tokenised link; staff accept and create their own portal account.'],
          ['View staff list', 'See all staff members with their role, current bookings, and earnings summary.'],
          ['Set staff availability', 'Define recurring weekly availability templates per staff member (days and time windows).'],
          ['Block time slots', 'Add one-off blocked slots (holidays, training) to prevent bookings during those periods.'],
          ['Assign bookings to staff', 'Link each booking to a specific staff member at the time of booking creation.'],
          ['View staff performance', 'Per-staff breakdown of completed bookings, revenue generated, and client ratings.'],
        ],
      },
      {
        category: 'Analytics',
        items: [
          ['Revenue analytics', 'Daily, weekly, and monthly revenue charts with period-over-period comparison.'],
          ['Booking volume', 'Count of bookings by status (confirmed, completed, cancelled, no-show) over time.'],
          ['Occupancy rate', 'Percentage of available slots filled; highlights peak days and underutilised windows.'],
          ['Top services', 'Ranked list of best-performing services by revenue and booking count.'],
          ['Client retention', 'New vs. returning client ratio and repeat-booking frequency metrics.'],
          ['Top clients', 'Ranked list of highest-value clients by total spend.'],
        ],
      },
      {
        category: 'Payouts',
        items: [
          ['View payout history', 'List of all payouts with gross amount, platform commission (15%), net amount, and status.'],
          ['Payout schedule', 'Payouts released automatically T+2 business days after each booking completion.'],
          ['Pending payout balance', 'Dashboard widget showing total funds currently queued for release.'],
          ['Payout flagging', 'Admin can flag a payout for review; vendor notified and payout held until resolved.'],
        ],
      },
      {
        category: 'Client Management',
        items: [
          ['Client list', 'All unique clients with total visit count, total spend, and last visit date.'],
          ['Client profile', 'View individual client booking history, notes, and loyalty tier.'],
          ['Initiate chat', 'Start a chat thread with a client (only vendors can initiate per platform rules).'],
          ['Before & after upload', 'Upload before-and-after photo pairs linked to a specific completed booking.'],
        ],
      },
    ],
    nonFunctional: [
      ['Performance', 'Next.js App Router with React Server Components for fast initial page loads. TanStack Query (React Query) manages client-side data fetching with background revalidation. Dashboard analytics cached in Redis for 10 minutes.'],
      ['Security', 'Role-based access control: vendor_owner and vendor_staff roles enforced at middleware level. API routes validate vendor ownership on all data mutations. Session tokens stored in httpOnly cookies; CSRF protection enabled.'],
      ['Reliability', 'Optimistic UI updates via TanStack Query for booking state changes. Graceful error boundaries on every dashboard page. Socket.IO reconnects automatically on network interruption.'],
      ['Scalability', 'Stateless Next.js deployment; horizontal scaling via Firebase Hosting CDN for static assets. Redis adapter ensures Socket.IO real-time events propagate across all API instances.'],
      ['Usability', 'Responsive design works on 1280 px desktop down to 768 px tablet. shadcn/ui component library ensures WCAG 2.1 AA accessibility compliance. Inline form validation with Zod schema messages.'],
      ['Data Integrity', 'All booking state transitions validated server-side against the state machine. Slot locks in Redis prevent concurrent double-booking. Payout amounts calculated from Prisma aggregates, never from client input.'],
      ['Auditability', 'All booking status changes, payout events, and admin overrides written to structured Winston logs. Timestamps stored in UTC; displayed in vendor\'s local timezone.'],
    ],
  },

  // ── ADMIN ────────────────────────────────────────────────────────────────────
  {
    id: 'admin',
    title: 'Admin Panel',
    subtitle: 'Next.js 14 App Router — Web (Teddy platform operators)',
    color: '#5A6B8A',
    intro: 'The Teddy Admin Panel is the internal operations tool for Teddy platform operators. It provides full oversight and governance over vendors, users, content, finances, and platform configuration — giving operators the control needed to ensure quality, trust, and compliance.',
    functional: [
      {
        category: 'Authentication',
        items: [
          ['Admin login', 'Email and password login restricted to accounts with the admin role; all other roles rejected.'],
          ['Session security', 'Short-lived JWT access tokens (15 min) with secure refresh; admin sessions logged server-side.'],
        ],
      },
      {
        category: 'Vendor Management',
        items: [
          ['View pending applications', 'Paginated list of all vendor applications awaiting review with submitted business details.'],
          ['Approve vendor', 'Transition vendor status to APPROVED; vendor receives email notification and dashboard access is granted.'],
          ['Reject vendor', 'Transition to REJECTED with a required reason; applicant notified by email with the rejection reason.'],
          ['Suspend vendor', 'Immediately suspend an active vendor; all their live services are hidden from client search.'],
          ['Reinstate vendor', 'Lift a suspension and restore the vendor to APPROVED status.'],
          ['View all vendors', 'Full vendor list filterable by status (pending, approved, rejected, suspended) with search.'],
          ['Vendor detail view', 'Inspect full vendor profile, services, booking history, payout record, and any flagged content.'],
        ],
      },
      {
        category: 'User Management',
        items: [
          ['View all users', 'Paginated user list with search by name or email; filter by role (client, vendor, staff, admin).'],
          ['View user profile', 'Full user record including account details, booking history, loyalty tier, and point balance.'],
          ['Ban user', 'Immediately disable a user account; all active sessions invalidated; account hidden from platform.'],
          ['Unban user', 'Restore a banned user\'s account access.'],
          ['View user bookings', 'Inspect complete booking history for any user for support or compliance purposes.'],
        ],
      },
      {
        category: 'Dispute Resolution',
        items: [
          ['View all disputes', 'List of open and resolved disputes raised by clients or vendors with submitted evidence.'],
          ['Dispute detail', 'View full dispute timeline: parties involved, booking reference, evidence, and correspondence.'],
          ['Resolve dispute', 'Record resolution outcome (refund approved, partial refund, no action) with an admin note.'],
          ['Dispute history', 'Complete audit trail of all resolved disputes with resolution details and timestamps.'],
        ],
      },
      {
        category: 'Payout Management',
        items: [
          ['View all payouts', 'Full payout ledger filterable by vendor, status (pending, released, flagged), and date range.'],
          ['Flag payout', 'Place a hold on a specific payout pending investigation; vendor notified automatically.'],
          ['Release payout', 'Manually trigger a held payout; Stripe transfer initiated (mocked in dev, real in production).'],
          ['Payout audit trail', 'Every flag and release action logged with admin identifier and timestamp.'],
        ],
      },
      {
        category: 'Content Moderation',
        items: [
          ['View flagged reviews', 'List of reviews flagged by vendors as inappropriate, with flag reason and flagging timestamp.'],
          ['Hide review', 'Remove a review from public display while preserving it in the database for audit purposes.'],
          ['Show review', 'Restore a hidden review to public visibility if the flag is deemed invalid.'],
          ['Review audit log', 'All moderation actions on reviews logged with admin identity and rationale.'],
        ],
      },
      {
        category: 'Platform Analytics',
        items: [
          ['GMV dashboard', 'Gross Merchandise Value — total payment volume processed through the platform over any period.'],
          ['Booking funnel', 'Conversion rates at each booking stage: search → profile view → booking created → confirmed → completed.'],
          ['Revenue by category', 'Platform commission revenue broken down by service category.'],
          ['Vendor performance', 'Ranked vendor leaderboard by revenue, booking count, and average rating.'],
          ['User growth', 'New user registrations over time by role (client, vendor, staff).'],
          ['Cancellation & no-show rates', 'Platform-wide and per-vendor cancellation and no-show rate trends.'],
        ],
      },
      {
        category: 'Platform Settings',
        items: [
          ['Commission rate', 'Adjust PLATFORM_COMMISSION_RATE; stored server-side and applied to all new transactions.'],
          ['Points per dollar', 'Set POINTS_PER_DOLLAR loyalty earn rate for the rewards programme.'],
          ['Payout delay', 'Configure PAYOUT_DELAY_DAYS — the number of business days after completion before payout release.'],
          ['Feature flags', 'Enable or disable platform features (e.g. waitlist, OTP login) without redeployment.'],
        ],
      },
    ],
    nonFunctional: [
      ['Security', 'Admin role enforced at both Next.js middleware and API route level — dual validation prevents privilege escalation. All admin API endpoints rate-limited independently. Admin actions require re-authentication after 30 minutes of inactivity.'],
      ['Auditability', 'Every administrative action (approve, ban, resolve, flag, release) creates an immutable log entry with actor ID, timestamp, target entity, and action taken. Logs retained for 24 months minimum.'],
      ['Access Control', 'RBAC middleware blocks any non-admin JWT from accessing /v1/admin/* routes. Admin tokens issued with a dedicated claim; vendor/staff tokens explicitly rejected.'],
      ['Performance', 'Analytics queries pre-aggregated and cached in Redis (TTL 10 min) to avoid full table scans on large datasets. Paginated lists never load more than 50 records per request.'],
      ['Reliability', 'Admin mutations (approve, ban, resolve) are wrapped in database transactions — partial failures roll back atomically. Duplicate action prevention via idempotency checks on payout release.'],
      ['Usability', 'Designed for desktop browsers (1280 px+). shadcn/ui data tables with sortable columns. Inline confirmation dialogs for irreversible actions (ban, hide review). Clear status badge system across all entity lists.'],
      ['Compliance', 'PII access in the admin panel is restricted to authenticated admin sessions only. No PII is ever exported to client-side state management — all sensitive queries remain server-side rendered.'],
    ],
  },

  // ── EMPLOYER (STAFF) ────────────────────────────────────────────────────────
  {
    id: 'employer',
    title: 'Staff Portal (Employer)',
    subtitle: 'Next.js 14 App Router — Web (stylists, technicians & staff)',
    color: '#8A6E2A',
    intro: 'The Teddy Staff Portal (internally labelled "Employer") is the individual-contributor dashboard for stylists, nail technicians, and other beauty professionals employed by a vendor. Staff members receive a dedicated view of their own schedule, clients, earnings, and performance — separate from the vendor owner\'s dashboard.',
    functional: [
      {
        category: 'Onboarding & Authentication',
        items: [
          ['Accept invite', 'Staff receive a tokenised invitation link from their vendor; clicking it prompts account creation.'],
          ['Set password', 'Staff create their own login credentials during the invite-acceptance flow.'],
          ['Login', 'Email and password login scoped to the vendor_staff role; access limited to own data only.'],
          ['Invite expiry handling', 'Invitation links expire after 7 days; vendor must re-send if not accepted in time.'],
        ],
      },
      {
        category: 'Schedule Management',
        items: [
          ['View weekly schedule', 'Calendar view of all assigned bookings for the current and upcoming weeks.'],
          ['View daily agenda', 'Day-detail view listing each appointment in chronological order with client and service details.'],
          ['Set availability', 'Define recurring weekly availability windows that the vendor uses for booking assignment.'],
          ['View blocked slots', 'See any time blocks applied by the vendor (holidays, training) that exclude bookings.'],
          ['Real-time updates', 'New bookings assigned to the staff member pushed instantly via Socket.IO.'],
        ],
      },
      {
        category: 'Booking Management',
        items: [
          ['View assigned bookings', 'Full list of bookings assigned to the logged-in staff member, filterable by status and date.'],
          ['Booking detail', 'View client name, service, time, special notes, and payment status for each booking.'],
          ['Start booking', 'Mark a booking as IN_PROGRESS when the client arrives.'],
          ['Complete booking', 'Mark a booking COMPLETED; triggers loyalty point award and payout queue on the vendor account.'],
          ['View booking history', 'Complete historical record of all past bookings handled by the staff member.'],
        ],
      },
      {
        category: 'Client Management',
        items: [
          ['View client list', 'All clients who have been served by the staff member, with visit count and last visit date.'],
          ['Client booking history', 'View the history of bookings a specific client has had with the staff member.'],
          ['Client notes', 'Read any vendor-supplied notes on a client\'s preferences or requirements.'],
          ['Chat with clients', 'Participate in chat threads initiated by the vendor for client communication.'],
        ],
      },
      {
        category: 'Earnings',
        items: [
          ['Earnings dashboard', 'Overview of gross earnings, platform commission deducted, and net payable amount.'],
          ['Earnings by period', 'Filter earnings by day, week, or month with transaction-level breakdown.'],
          ['Per-booking earnings', 'See the exact amount attributable to each completed booking.'],
          ['Payout history', 'Record of all payouts received, including dates and amounts.'],
        ],
      },
      {
        category: 'Performance Metrics',
        items: [
          ['Completion rate', 'Percentage of assigned bookings marked completed vs. cancelled or no-show.'],
          ['Client rating', 'Average star rating received across all reviewed bookings.'],
          ['Revenue generated', 'Total revenue attributed to the staff member\'s completed bookings over a period.'],
          ['Booking volume trend', 'Month-over-month booking count chart showing workload trend.'],
          ['Top services', 'Which services the staff member performs most frequently and generates most revenue from.'],
        ],
      },
      {
        category: 'Profile & Settings',
        items: [
          ['Edit profile', 'Update display name, bio, and profile photo (shown to clients when selecting a stylist).'],
          ['Notification preferences', 'Toggle push notifications for new booking assignments, client messages, and schedule changes.'],
          ['Change password', 'Self-service password change with current password verification.'],
        ],
      },
    ],
    nonFunctional: [
      ['Security', 'vendor_staff JWT claim restricts API access to data scoped exclusively to the authenticated staff member. Cross-staff data access is blocked at service layer — a staff member cannot query another\'s bookings or earnings. Invite tokens are single-use and expire after 7 days.'],
      ['Privacy', 'Staff can only view client PII (name, phone) for bookings assigned to them. Client contact details are never exportable or accessible in bulk.'],
      ['Performance', 'Schedule and earnings pages use TanStack Query with stale-while-revalidate strategy — data loads instantly from cache while background refresh runs. Socket.IO delivers new booking assignments in under 200 ms.'],
      ['Reliability', 'Offline-tolerant reads: last-fetched schedule cached in browser for reference during connectivity loss. Booking status transitions retry automatically on network failure with user-facing feedback.'],
      ['Usability', 'Designed for both desktop (1280 px+) and tablet (768 px+) — staff commonly use iPads between appointments. Clear visual differentiation between upcoming, in-progress, and completed bookings via status colour coding.'],
      ['Scalability', 'Staff portal is stateless — no server-side sessions. All data fetched per-request from the API with the JWT as the only identity source. Supports unlimited staff per vendor without configuration changes.'],
      ['Maintainability', 'Staff portal shares the same shadcn/ui component library and TanStack Query setup as the Vendor and Admin apps, minimising duplication. TypeScript strict mode enforced throughout.'],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  PDF BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildPDF(role) {
  const filePath = path.join(OUT_DIR, `Teddy_${role.id}_Features.pdf`);
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 40, left: 0, right: 0 },
    info: {
      Title: `Teddy — ${role.title} Features`,
      Author: 'Teddy Technologies Inc.',
      Subject: 'Functional & Non-Functional Requirements',
    },
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const W = doc.page.width;    // 595
  const LM = 48;               // left margin for content
  const RM = 48;               // right margin
  const CW = W - LM - RM;     // content width

  // ── helpers ─────────────────────────────────────────────────────────────
  function checkPage(neededPx) {
    if (doc.y + neededPx > doc.page.height - 60) {
      doc.addPage({ margins: { top: 0, bottom: 40, left: 0, right: 0 } });
      // light top band on continuation pages
      doc.rect(0, 0, W, 6).fill(role.color);
      doc.moveDown(1.2);
    }
  }

  function sectionDivider(label) {
    checkPage(60);
    doc.moveDown(0.6);
    // coloured left bar
    doc.rect(LM, doc.y, 4, 22).fill(role.color);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK)
       .text(label, LM + 12, doc.y + 4, { width: CW - 12 });
    doc.moveDown(0.9);
    doc.moveTo(LM, doc.y).lineTo(LM + CW, doc.y)
       .strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveDown(0.5);
  }

  function featureRow(name, desc, isAlt) {
    const rowY = doc.y;
    const nameW = 170;
    const descW = CW - nameW - 10;

    // estimate height
    const lines = Math.ceil(doc.font('Helvetica').fontSize(9).heightOfString(desc, { width: descW }) / 11);
    const rowH = Math.max(28, lines * 11 + 14);

    checkPage(rowH);

    if (isAlt) {
      doc.rect(LM, doc.y, CW, rowH).fill('#FAFAF5');
    }

    const ty = doc.y + 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
       .text(name, LM + 8, ty, { width: nameW - 8, lineGap: 1 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
       .text(desc, LM + nameW + 10, ty, { width: descW - 8, lineGap: 1 });

    doc.moveTo(LM, doc.y + rowH - 0.5).lineTo(LM + CW, doc.y + rowH - 0.5)
       .strokeColor(BORDER).lineWidth(0.3).stroke();
    doc.y = doc.y + rowH;
  }

  function nfRow(name, desc, isAlt) {
    const rowY = doc.y;
    const nameW = 130;
    const descW = CW - nameW - 10;
    const lines = Math.ceil(doc.font('Helvetica').fontSize(9).heightOfString(desc, { width: descW }) / 11);
    const rowH = Math.max(32, lines * 11 + 16);

    checkPage(rowH);

    if (isAlt) {
      doc.rect(LM, doc.y, CW, rowH).fill('#FAFAF5');
    }

    const ty = doc.y + 10;
    // coloured dot
    doc.circle(LM + 14, ty + 4, 4).fill(role.color);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
       .text(name, LM + 24, ty, { width: nameW - 24, lineGap: 1 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
       .text(desc, LM + nameW + 10, ty, { width: descW - 8, lineGap: 1 });

    doc.moveTo(LM, doc.y + rowH - 0.5).lineTo(LM + CW, doc.y + rowH - 0.5)
       .strokeColor(BORDER).lineWidth(0.3).stroke();
    doc.y = doc.y + rowH;
  }

  // ── COVER ────────────────────────────────────────────────────────────────
  // Top colour band
  doc.rect(0, 0, W, 200).fill(INK);

  // Gold accent strip
  doc.rect(0, 200, W, 6).fill(role.color);

  // Logo text
  doc.font('Helvetica-Bold').fontSize(32).fillColor(WHITE)
     .text('teddy.', LM, 44);
  doc.font('Helvetica').fontSize(11).fillColor('rgba(255,255,255,0.5)')
     .text('beauty booking platform', LM, 82);

  // Document type label
  doc.roundedRect(LM, 100, 220, 28, 4).fill(role.color);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
     .text('FEATURES & REQUIREMENTS', LM + 12, 110);

  // Role title
  doc.font('Helvetica-Bold').fontSize(26).fillColor(WHITE)
     .text(role.title, LM, 140, { width: CW });

  // Subtitle
  doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.55)')
     .text(role.subtitle, LM, 173, { width: CW });

  // Intro block
  doc.moveDown(2.5);
  doc.rect(LM, doc.y, CW, 1).fill(BORDER);
  doc.moveDown(0.8);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).lineGap(3)
     .text(role.intro, LM, doc.y, { width: CW });
  doc.moveDown(1.2);
  doc.rect(LM, doc.y, CW, 1).fill(BORDER);
  doc.moveDown(1.4);

  // ── FUNCTIONAL FEATURES ──────────────────────────────────────────────────
  // Big section heading
  doc.rect(0, doc.y, W, 36).fill(role.color + '22');
  doc.font('Helvetica-Bold').fontSize(16).fillColor(role.color)
     .text('Functional Features', LM, doc.y + 10);
  doc.moveDown(2);

  role.functional.forEach(group => {
    sectionDivider(group.category);
    group.items.forEach(([name, desc], i) => featureRow(name, desc, i % 2 === 0));
    doc.moveDown(0.8);
  });

  // ── NON-FUNCTIONAL ───────────────────────────────────────────────────────
  doc.addPage({ margins: { top: 0, bottom: 40, left: 0, right: 0 } });
  doc.rect(0, 0, W, 6).fill(role.color);
  doc.moveDown(1.5);

  doc.rect(0, doc.y, W, 36).fill(role.color + '22');
  doc.font('Helvetica-Bold').fontSize(16).fillColor(role.color)
     .text('Non-Functional Requirements', LM, doc.y + 10);
  doc.moveDown(2);

  role.nonFunctional.forEach(([name, desc], i) => nfRow(name, desc, i % 2 === 0));

  // ── FOOTER on last page ──────────────────────────────────────────────────
  doc.moveDown(2);
  doc.rect(LM, doc.y, CW, 1).fill(BORDER);
  doc.moveDown(0.8);
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
     .text(
       `Teddy Technologies Inc.  ·  ${role.title}  ·  Version 1.0  ·  Confidential`,
       LM, doc.y, { width: CW, align: 'center' }
     );

  doc.end();
  return new Promise(resolve => stream.on('finish', () => {
    console.log(`  ✓  ${path.basename(filePath)}`);
    resolve(filePath);
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nGenerating Teddy role-features PDFs...\n');
  for (const role of roles) await buildPDF(role);
  console.log('\nAll PDFs saved to: docs/role-features/\n');
}

main().catch(console.error);
