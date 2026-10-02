import { PrismaClient, Role, VendorStatus, BookingStatus, PaymentStatus, Tier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPw(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  const defaultPw = await hashPw('Password123!');

  // ── Admin ────────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@teddy.app' },
    update: {},
    create: {
      email: 'admin@teddy.app',
      firstName: 'Teddy',
      lastName: 'Admin',
      passwordHash: defaultPw,
      role: Role.admin,
      isVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin:', admin.email);

  // ── Vendor owners ────────────────────────────────────────────────────────────
  const vendorOwnerData = [
    { email: 'emily@skincuress.com', firstName: 'Emily', lastName: 'Carter', businessName: 'Skincuress Salon', slug: 'skincuress-salon', city: 'Miami', status: VendorStatus.ACTIVE },
    { email: 'camille@glowup.com', firstName: 'Camille', lastName: 'Bernard', businessName: 'Glow Up Aesthetics', slug: 'glow-up-aesthetics', city: 'New York', status: VendorStatus.ACTIVE },
    { email: 'ana@luxeskin.com', firstName: 'Ana', lastName: 'Torres', businessName: 'Luxe Skin Studio', slug: 'luxe-skin-studio', city: 'Los Angeles', status: VendorStatus.PENDING },
    { email: 'zara@zenface.com', firstName: 'Zara', lastName: 'Ahmed', businessName: 'Zen Face & Body', slug: 'zen-face-body', city: 'Chicago', status: VendorStatus.PENDING },
    { email: 'mei@radiancebar.com', firstName: 'Mei', lastName: 'Chen', businessName: 'Radiance Bar', slug: 'radiance-bar', city: 'San Francisco', status: VendorStatus.REJECTED },
    { email: 'layla@bloomspa.com', firstName: 'Layla', lastName: 'Hassan', businessName: 'Bloom Spa', slug: 'bloom-spa', city: 'Austin', status: VendorStatus.SUSPENDED },
  ];

  const vendors: { vendorId: string; userId: string }[] = [];

  for (const vd of vendorOwnerData) {
    const owner = await prisma.user.upsert({
      where: { email: vd.email },
      update: {},
      create: {
        email: vd.email,
        firstName: vd.firstName,
        lastName: vd.lastName,
        passwordHash: defaultPw,
        role: Role.vendor_owner,
        isVerified: true,
        isActive: true,
      },
    });
    const vendor = await prisma.vendor.upsert({
      where: { ownerId: owner.id },
      update: {},
      create: {
        ownerId: owner.id,
        businessName: vd.businessName,
        slug: vd.slug,
        city: vd.city,
        status: vd.status,
        avgRating: 4.5 + Math.random() * 0.4,
        reviewCount: Math.floor(50 + Math.random() * 100),
        approvedAt: vd.status === VendorStatus.ACTIVE ? new Date() : null,
      },
    });
    vendors.push({ vendorId: vendor.id, userId: owner.id });
  }
  console.log(`✅ ${vendors.length} vendor accounts`);

  const skincuress = await prisma.vendor.findFirst({ where: { slug: 'skincuress-salon' } });
  if (!skincuress) throw new Error('Skincuress vendor not found');

  // ── Services for Skincuress ──────────────────────────────────────────────────
  const serviceData = [
    { name: 'HydraFacial', category: 'Facial & Skin', durationMin: 60, price: 120, description: 'Deep cleanse + hydration treatment' },
    { name: 'Chemical Peel', category: 'Facial & Skin', durationMin: 45, price: 130, description: 'Exfoliating acid peel for radiant skin' },
    { name: 'Microneedling', category: 'Facial & Skin', durationMin: 75, price: 180, description: 'Collagen induction therapy' },
    { name: 'LED Light Therapy', category: 'Facial & Skin', durationMin: 30, price: 65, description: 'Photobiomodulation for skin health' },
    { name: 'Deep Tissue Massage', category: 'Massage & Wellness', durationMin: 60, price: 95, description: 'Therapeutic muscle relief' },
    { name: 'Swedish Massage', category: 'Massage & Wellness', durationMin: 60, price: 85, description: 'Classic relaxation massage' },
    { name: 'Eyebrow Threading', category: 'Brows & Lashes', durationMin: 20, price: 25, description: 'Precise brow shaping' },
    { name: 'Lash Lift & Tint', category: 'Brows & Lashes', durationMin: 60, price: 75, description: 'Lifts and darkens natural lashes' },
    { name: 'Body Wrap', category: 'Body Treatments', durationMin: 90, price: 110, description: 'Detoxifying full-body wrap' },
  ];

  for (const sd of serviceData) {
    await prisma.service.upsert({
      where: { id: `seed-svc-${sd.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-svc-${sd.name.toLowerCase().replace(/\s+/g, '-')}`,
        vendorId: skincuress.id,
        ...sd,
        price: sd.price,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${serviceData.length} services`);

  // ── Staff members ────────────────────────────────────────────────────────────
  const staffUserData = [
    { email: 'sarah.mitchell@skincuress.com', firstName: 'Sarah', lastName: 'Mitchell', title: 'Senior Esthetician' },
    { email: 'emma.r@skincuress.com', firstName: 'Emma', lastName: 'Rodriguez', title: 'Massage Therapist' },
  ];

  const staffUsers: string[] = [];
  for (const sd of staffUserData) {
    const u = await prisma.user.upsert({
      where: { email: sd.email },
      update: {},
      create: {
        email: sd.email,
        firstName: sd.firstName,
        lastName: sd.lastName,
        passwordHash: defaultPw,
        role: Role.vendor_staff,
        isVerified: true,
        isActive: true,
      },
    });
    const sm = await prisma.staffMember.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        vendorId: skincuress.id,
        title: sd.title,
        avgRating: 4.9,
        bookingCount: 38,
        isActive: true,
      },
    });
    // Set Mon–Fri availability
    for (let dow = 1; dow <= 5; dow++) {
      await prisma.staffAvailability.upsert({
        where: { staffMemberId_dayOfWeek: { staffMemberId: sm.id, dayOfWeek: dow } },
        update: {},
        create: { staffMemberId: sm.id, dayOfWeek: dow, startTime: '09:00', endTime: '18:00' },
      });
    }
    staffUsers.push(u.id);
  }
  console.log(`✅ ${staffUsers.length} staff members`);

  // ── Client users ─────────────────────────────────────────────────────────────
  const clientData = [
    { email: 'sophia.carter@example.com', firstName: 'Sophia', lastName: 'Carter', points: 1250, tier: Tier.SILVER },
    { email: 'isabelle.park@example.com', firstName: 'Isabelle', lastName: 'Park', points: 340, tier: Tier.BRONZE },
    { email: 'rachel.torres@example.com', firstName: 'Rachel', lastName: 'Torres', points: 890, tier: Tier.SILVER },
    { email: 'nina.walsh@example.com', firstName: 'Nina', lastName: 'Walsh', points: 125, tier: Tier.BRONZE },
    { email: 'mia.russo@example.com', firstName: 'Mia', lastName: 'Russo', points: 2100, tier: Tier.GOLD },
    { email: 'aisha.brown@example.com', firstName: 'Aisha', lastName: 'Brown', points: 60, tier: Tier.BRONZE },
    { email: 'jordan.kim@example.com', firstName: 'Jordan', lastName: 'Kim', points: 430, tier: Tier.SILVER },
  ];

  const clients: string[] = [];
  for (const cd of clientData) {
    const u = await prisma.user.upsert({
      where: { email: cd.email },
      update: {},
      create: {
        email: cd.email,
        firstName: cd.firstName,
        lastName: cd.lastName,
        passwordHash: defaultPw,
        role: Role.client,
        isVerified: true,
        isActive: true,
        pointsBalance: cd.points,
        tier: cd.tier,
      },
    });
    clients.push(u.id);
  }
  console.log(`✅ ${clients.length} client users`);

  // ── Bookings ─────────────────────────────────────────────────────────────────
  const hydraFacial = await prisma.service.findFirst({
    where: { vendorId: skincuress.id, name: 'HydraFacial' },
  });
  const chemPeel = await prisma.service.findFirst({
    where: { vendorId: skincuress.id, name: 'Chemical Peel' },
  });
  const mayaStaff = await prisma.staffMember.findFirst({
    where: { vendorId: skincuress.id },
  });

  if (hydraFacial && chemPeel && mayaStaff) {
    // Dates are relative to "now" so the demo always shows a live schedule.
    // Hours are in UTC, chosen mid-day so they land in business hours across US timezones.
    const at = (dayOffset: number, hourUtc: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + dayOffset);
      d.setUTCHours(hourUtc, 0, 0, 0);
      return d;
    };
    const bookingSeeds = [
      // Today — a couple completed (drives "Completed Today" + this-week earnings) and upcoming
      { id: 'seed-bk-1', clientIdx: 0, serviceId: hydraFacial.id, startsAt: at(0, 14),  status: BookingStatus.COMPLETED },
      { id: 'seed-bk-2', clientIdx: 1, serviceId: chemPeel.id,   startsAt: at(0, 16),  status: BookingStatus.COMPLETED },
      { id: 'seed-bk-3', clientIdx: 2, serviceId: hydraFacial.id, startsAt: at(0, 20),  status: BookingStatus.CONFIRMED },
      // Rest of this week — upcoming appointments on the calendar
      { id: 'seed-bk-4', clientIdx: 3, serviceId: chemPeel.id,   startsAt: at(1, 15),  status: BookingStatus.CONFIRMED },
      { id: 'seed-bk-5', clientIdx: 4, serviceId: hydraFacial.id, startsAt: at(2, 17),  status: BookingStatus.CONFIRMED },
      { id: 'seed-bk-6', clientIdx: 5, serviceId: chemPeel.id,   startsAt: at(3, 16),  status: BookingStatus.PENDING },
      { id: 'seed-bk-7', clientIdx: 6, serviceId: hydraFacial.id, startsAt: at(4, 18),  status: BookingStatus.CONFIRMED },
      // Earlier — completed history (drives this-month earnings) and a no-show
      { id: 'seed-bk-8', clientIdx: 1, serviceId: chemPeel.id,   startsAt: at(-9, 15),  status: BookingStatus.COMPLETED },
      { id: 'seed-bk-9', clientIdx: 0, serviceId: hydraFacial.id, startsAt: at(-16, 17), status: BookingStatus.COMPLETED },
      { id: 'seed-bk-10', clientIdx: 2, serviceId: chemPeel.id,  startsAt: at(-4, 15),  status: BookingStatus.NO_SHOW },
    ];

    for (const bk of bookingSeeds) {
      const svc = bk.serviceId === hydraFacial.id ? hydraFacial : chemPeel;
      const total = Number(svc.price);
      const fee = total * 0.15;
      const endsAt = new Date(bk.startsAt.getTime() + svc.durationMin * 60 * 1000);
      // Refresh dates + status on every run so the demo schedule always shows a live,
      // current week (seed uses now-relative dates that would otherwise drift stale).
      const dateFields = {
        startsAt: bk.startsAt,
        endsAt,
        status: bk.status,
        confirmedAt: bk.status !== BookingStatus.PENDING ? bk.startsAt : null,
        completedAt: bk.status === BookingStatus.COMPLETED ? endsAt : null,
      };
      await prisma.booking.upsert({
        where: { id: bk.id },
        update: dateFields,
        create: {
          id: bk.id,
          clientId: clients[bk.clientIdx],
          vendorId: skincuress.id,
          staffMemberId: mayaStaff.id,
          serviceId: bk.serviceId,
          totalAmount: total,
          platformFee: fee,
          vendorPayout: total - fee,
          ...dateFields,
        },
      });

      if (bk.status === BookingStatus.CONFIRMED || bk.status === BookingStatus.COMPLETED) {
        await prisma.payment.upsert({
          where: { bookingId: bk.id },
          update: {},
          create: {
            bookingId: bk.id,
            stripePaymentIntentId: `pi_mock_${bk.id}`,
            amount: total,
            status: bk.status === BookingStatus.COMPLETED ? PaymentStatus.CAPTURED : PaymentStatus.PENDING,
            capturedAt: bk.status === BookingStatus.COMPLETED ? bk.startsAt : null,
          },
        });
      }
    }
    console.log(`✅ ${bookingSeeds.length} bookings + payments`);

    // ── Reviews (on completed bookings — powers the Recent Feedback cards) ──
    const reviewSeeds = [
      { bookingId: 'seed-bk-1', clientIdx: 0, rating: 5, body: 'Absolutely amazing — my skin has never looked better. Sarah was wonderful!' },
      { bookingId: 'seed-bk-2', clientIdx: 1, rating: 4, body: 'Really relaxing and professional. Will definitely be back.' },
      { bookingId: 'seed-bk-8', clientIdx: 1, rating: 5, body: 'Best facial I have had in years. Highly recommend.' },
      { bookingId: 'seed-bk-9', clientIdx: 0, rating: 3, body: 'Good service overall, though the wait was a little long.' },
    ];
    for (const rv of reviewSeeds) {
      await prisma.review.upsert({
        where: { bookingId: rv.bookingId },
        update: {},
        create: {
          bookingId: rv.bookingId,
          clientId: clients[rv.clientIdx],
          vendorId: skincuress.id,
          staffMemberId: mayaStaff.id,
          rating: rv.rating,
          body: rv.body,
        },
      });
    }
    console.log(`✅ ${reviewSeeds.length} reviews`);
  }

  // ── Chat threads ─────────────────────────────────────────────────────────────
  const thread1 = await prisma.chatThread.upsert({
    where: { vendorId_clientId: { vendorId: skincuress.id, clientId: clients[0] } },
    update: {},
    create: { vendorId: skincuress.id, clientId: clients[0] },
  });
  await prisma.message.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-msg-1', threadId: thread1.id, senderId: clients[0], senderRole: 'client', body: 'Hi! Can I book a HydraFacial for next week?', isRead: true },
      { id: 'seed-msg-2', threadId: thread1.id, senderId: (await prisma.vendor.findFirst({ where: { slug: 'skincuress-salon' } }))!.ownerId, senderRole: 'vendor', body: 'Absolutely! We have slots available on Tuesday and Thursday.', isRead: true },
    ],
  });

  // ── Notification preferences ──────────────────────────────────────────────────
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const u of allUsers) {
    await prisma.notificationPreference.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    });
  }
  console.log(`✅ ${allUsers.length} notification preferences`);

  // ── Products (retail + professional/back-bar) with ingredient lists ────────────
  // Ingredients are real INCI names; some carry common allergens (Parfum, Glycolic
  // Acid, Tocopherol, Retinol, Beeswax) so the allergy check has real conflicts.
  const productData = [
    // Professional (used in service protocols)
    { id: 'seed-prod-hydraglow',  name: 'HydraGlow Serum',           brand: 'Skincuress Pro', type: 'professional', price: 0,  stock: 40, ingredients: ['Aqua', 'Glycerin', 'Sodium Hyaluronate', 'Parfum', 'Panthenol'] },
    { id: 'seed-prod-vitc',       name: 'Vitamin C Booster',         brand: 'Skincuress Pro', type: 'professional', price: 0,  stock: 30, ingredients: ['Aqua', 'Ascorbic Acid', 'Ferulic Acid', 'Tocopherol', 'Propylene Glycol'] },
    { id: 'seed-prod-glycolic',   name: 'Glycolic Peel Solution 30%',brand: 'Skincuress Pro', type: 'professional', price: 0,  stock: 25, ingredients: ['Aqua', 'Glycolic Acid', 'Sodium Hydroxide', 'Parfum'] },
    { id: 'seed-prod-aloe',       name: 'Soothing Aloe Mask',        brand: 'Skincuress Pro', type: 'professional', price: 0,  stock: 50, ingredients: ['Aqua', 'Aloe Barbadensis Leaf Juice', 'Glycerin', 'Allantoin'] },
    { id: 'seed-prod-hydramask',  name: 'Hydration Sheet Mask',      brand: 'Skincuress Pro', type: 'professional', price: 0,  stock: 60, ingredients: ['Aqua', 'Glycerin', 'Sodium Hyaluronate', 'Niacinamide'] },
    // Retail (sold at checkout)
    { id: 'seed-prod-cleanser',   name: 'Daily Gentle Cleanser',     brand: 'Skincuress',     type: 'retail', price: 28, stock: 35, ingredients: ['Aqua', 'Coco-Glucoside', 'Glycerin', 'Parfum'] },
    { id: 'seed-prod-spf',        name: 'SPF 50 Mineral Sunscreen',  brand: 'Skincuress',     type: 'retail', price: 34, stock: 42, ingredients: ['Zinc Oxide', 'Aqua', 'Caprylic/Capric Triglyceride', 'Niacinamide'] },
    { id: 'seed-prod-retinol',    name: 'Retinol Night Cream',       brand: 'Skincuress',     type: 'retail', price: 52, stock: 20, ingredients: ['Aqua', 'Retinol', 'Glycerin', 'Tocopherol'] },
    { id: 'seed-prod-haserum',    name: 'Hyaluronic Hydra Serum',    brand: 'Skincuress',     type: 'retail', price: 45, stock: 28, ingredients: ['Aqua', 'Sodium Hyaluronate', 'Panthenol', 'Niacinamide'] },
    { id: 'seed-prod-lipbalm',    name: 'Nourishing Lip Balm',       brand: 'Skincuress',     type: 'retail', price: 12, stock: 80, ingredients: ['Beeswax', 'Butyrospermum Parkii (Shea) Butter', 'Parfum'] },
  ];
  for (const pd of productData) {
    await prisma.product.upsert({
      where: { id: pd.id },
      update: {},
      create: { ...pd, vendorId: skincuress.id, type: pd.type as never, ingredients: pd.ingredients as never },
    });
  }
  console.log(`✅ ${productData.length} products`);

  // ── Service protocols (which back-bar products each service applies) ───────────
  const hydra = await prisma.service.findFirst({ where: { vendorId: skincuress.id, name: 'HydraFacial' } });
  const peel = await prisma.service.findFirst({ where: { vendorId: skincuress.id, name: 'Chemical Peel' } });
  const micro = await prisma.service.findFirst({ where: { vendorId: skincuress.id, name: 'Microneedling' } });
  const led = await prisma.service.findFirst({ where: { vendorId: skincuress.id, name: 'LED Light Therapy' } });
  const protocols: { serviceId: string; productId: string; step: number }[] = [];
  if (hydra) protocols.push(
    { serviceId: hydra.id, productId: 'seed-prod-hydraglow', step: 1 },
    { serviceId: hydra.id, productId: 'seed-prod-vitc',      step: 2 },
    { serviceId: hydra.id, productId: 'seed-prod-hydramask', step: 3 },
  );
  if (peel) protocols.push(
    { serviceId: peel.id, productId: 'seed-prod-glycolic', step: 1 },
    { serviceId: peel.id, productId: 'seed-prod-aloe',     step: 2 },
  );
  if (micro) protocols.push(
    { serviceId: micro.id, productId: 'seed-prod-vitc',      step: 1 },
    { serviceId: micro.id, productId: 'seed-prod-hydramask', step: 2 },
  );
  if (led) protocols.push(
    { serviceId: led.id, productId: 'seed-prod-hydraglow', step: 1 },
    { serviceId: led.id, productId: 'seed-prod-aloe',      step: 2 },
  );
  for (const pr of protocols) {
    await prisma.serviceProduct.upsert({
      where: { serviceId_productId: { serviceId: pr.serviceId, productId: pr.productId } },
      update: {},
      create: pr,
    });
  }
  console.log(`✅ ${protocols.length} protocol products`);

  // ── Client profiles (medical history, employer, current products, allergies) ───
  // Allergies are deliberately wired to conflict with protocol ingredients so the
  // safety check flags them: Sophia↔Parfum(HydraGlow), Isabelle↔Glycolic Acid(Peel),
  // Rachel↔Tocopherol(Vitamin C Booster).
  const profileData = [
    { idx: 0, medicalHistory: 'Sensitive, reactive skin. Mild rosacea flare-ups in summer.', conditions: ['Rosacea', 'Sensitive skin'], employer: 'Miami General Hospital', occupation: 'Registered Nurse', current: [{ name: 'CeraVe Hydrating Cleanser' }, { name: 'La Roche-Posay SPF 50' }], allergies: [{ name: 'Parfum', severity: 'moderate', note: 'Contact dermatitis from fragranced products' }], notes: 'Prefers fragrance-free products. Patch test new actives.' },
    { idx: 1, medicalHistory: 'Eczema-prone since childhood. No medications.', conditions: ['Eczema'], employer: 'Lincoln Elementary', occupation: 'Teacher', current: [{ name: 'Cetaphil Moisturizer' }], allergies: [{ name: 'Glycolic Acid', severity: 'high', note: 'Severe stinging and redness' }], notes: 'Avoid strong AHAs. Use gentle exfoliation only.' },
    { idx: 2, medicalHistory: 'Generally healthy. Occasional breakouts.', conditions: [], employer: 'Torres Design Studio', occupation: 'Graphic Designer', current: [{ name: 'The Ordinary Niacinamide' }], allergies: [{ name: 'Tocopherol', severity: 'mild', note: 'Vitamin E causes small bumps' }], notes: '' },
    { idx: 3, medicalHistory: 'No known conditions.', conditions: [], employer: 'Walsh & Co Accounting', occupation: 'Accountant', current: [], allergies: [], notes: 'First-time client.' },
    { idx: 4, medicalHistory: 'No known conditions. Regular facials.', conditions: [], employer: 'Russo Media', occupation: 'Marketing Director', current: [{ name: 'SkinCeuticals C E Ferulic' }, { name: 'EltaMD UV Clear' }], allergies: [], notes: 'GOLD member — offer premium add-ons.' },
    { idx: 5, medicalHistory: 'Combination skin, occasional breakouts.', conditions: ['Acne-prone'], employer: 'Brown & Associates', occupation: 'Attorney', current: [{ name: "Paula's Choice BHA" }], allergies: [{ name: 'Fragrance', severity: 'moderate', note: 'Redness from fragranced products' }], notes: 'Prefers unscented formulas.' },
    { idx: 6, medicalHistory: 'No known conditions.', conditions: [], employer: 'Kim Studios', occupation: 'Photographer', current: [], allergies: [], notes: 'No sensitivities on file.' },
  ];
  for (const pf of profileData) {
    await prisma.clientProfile.upsert({
      where: { userId: clients[pf.idx] },
      update: {},
      create: {
        userId: clients[pf.idx],
        medicalHistory: pf.medicalHistory,
        medicalConditions: pf.conditions as never,
        employerName: pf.employer,
        occupation: pf.occupation,
        currentProducts: pf.current as never,
        allergies: pf.allergies as never,
        notes: pf.notes,
        storeCredit: pf.idx === 4 ? 25 : 0,
      },
    });
  }
  console.log(`✅ ${profileData.length} client profiles`);

  // Give a couple of bookings a paid deposit so checkout can demonstrate the
  // deposit / previous-payment deduction against the final balance.
  for (const [id, deposit] of [['seed-bk-5', 40], ['seed-bk-3', 30]] as const) {
    await prisma.booking.update({ where: { id }, data: { depositAmount: deposit } }).catch(() => {});
  }
  console.log('✅ deposits set on 2 bookings');

  // ── Gift cards ─────────────────────────────────────────────────────────────────
  const giftCardData = [
    { id: 'seed-gc-1', code: 'TEDDY-WELCOME-50', initialAmount: 50,  balance: 50,  recipientId: null as string | null },
    { id: 'seed-gc-2', code: 'TEDDY-SPA-100',    initialAmount: 100, balance: 75,  recipientId: clients[0] },
    { id: 'seed-gc-3', code: 'TEDDY-GLOW-25',    initialAmount: 25,  balance: 25,  recipientId: clients[4] },
  ];
  for (const gc of giftCardData) {
    await prisma.giftCard.upsert({
      where: { id: gc.id },
      update: {},
      create: { id: gc.id, vendorId: skincuress.id, code: gc.code, initialAmount: gc.initialAmount, balance: gc.balance, recipientId: gc.recipientId },
    });
  }
  console.log(`✅ ${giftCardData.length} gift cards`);

  // ── Membership plans + subscriptions ───────────────────────────────────────────
  const planData = [
    { id: 'seed-plan-glow', name: 'Glow Member',  price: 49, interval: 'monthly', benefits: ['10% off all services', '1 free LED Light Therapy monthly', 'Priority booking'], priorityBooking: true },
    { id: 'seed-plan-vip',  name: 'Radiance VIP', price: 99, interval: 'monthly', benefits: ['20% off all services', 'Monthly signature facial', 'Priority booking', 'Exclusive member events'], priorityBooking: true },
  ];
  for (const pl of planData) {
    await prisma.membershipPlan.upsert({
      where: { id: pl.id },
      update: {},
      create: { id: pl.id, vendorId: skincuress.id, name: pl.name, price: pl.price, interval: pl.interval as never, benefits: pl.benefits as never, priorityBooking: pl.priorityBooking },
    });
  }
  const subData = [
    { id: 'seed-sub-1', clientIdx: 4, planId: 'seed-plan-vip' },   // Mia — VIP
    { id: 'seed-sub-2', clientIdx: 0, planId: 'seed-plan-glow' },  // Sophia — Glow
  ];
  for (const sb of subData) {
    const periodEnd = new Date(); periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    await prisma.subscription.upsert({
      where: { id: sb.id },
      update: {},
      create: { id: sb.id, clientId: clients[sb.clientIdx], vendorId: skincuress.id, planId: sb.planId, status: 'active' as never, currentPeriodEnd: periodEnd },
    });
  }
  console.log(`✅ ${planData.length} membership plans, ${subData.length} subscriptions`);

  // ── Referrals (Mia referred Nina & Aisha) ──────────────────────────────────────
  await prisma.user.update({ where: { id: clients[3] }, data: { referredById: clients[4] } }).catch(() => {});
  await prisma.user.update({ where: { id: clients[5] }, data: { referredById: clients[4] } }).catch(() => {});
  console.log('✅ referrals linked');

  // ── Low stock (one product below threshold to demo alerts) ─────────────────────
  await prisma.product.update({ where: { id: 'seed-prod-retinol' }, data: { stock: 3, lowStockThreshold: 5 } }).catch(() => {});
  console.log('✅ low-stock demo product');

  // ── Sample form (consent) ──────────────────────────────────────────────────────
  const existingForm = await prisma.form.findFirst({ where: { vendorId: skincuress.id, name: 'Treatment Consent' } });
  if (!existingForm) {
    await prisma.form.create({
      data: {
        vendorId: skincuress.id,
        name: 'Treatment Consent',
        description: 'Standard consent + skin questionnaire before facial treatments.',
        fields: [
          { id: 'c1', label: 'I consent to the treatment being performed', type: 'checkbox', required: true },
          { id: 'c2', label: 'Are you pregnant or nursing?', type: 'select', options: ['No', 'Yes'], required: true },
          { id: 'c3', label: 'Current medications', type: 'textarea' },
          { id: 'c4', label: 'Recent skin treatments (last 30 days)', type: 'text' },
        ] as never,
        assignedServiceIds: [] as never,
        sendAfterBooking: true,
        requiresSignature: true,
      },
    });
  }
  console.log('✅ sample consent form');

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
