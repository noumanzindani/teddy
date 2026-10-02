import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Demo add-ons keyed to seeded services, plus a couple of direct-booking slugs.
const ADDONS = [
  { id: 'seed-addon-hydra-led',     serviceId: 'seed-svc-hydrafacial',          name: 'LED Light Therapy Boost', price: 25, durationMin: 15 },
  { id: 'seed-addon-hydra-peel',    serviceId: 'seed-svc-hydrafacial',          name: 'Extra Extractions',       price: 20, durationMin: 15 },
  { id: 'seed-addon-massage-hot',   serviceId: 'seed-svc-deep-tissue-massage',  name: 'Hot Stone Add-on',        price: 30, durationMin: 20 },
  { id: 'seed-addon-massage-aroma', serviceId: 'seed-svc-deep-tissue-massage',  name: 'Aromatherapy Oils',       price: 15, durationMin: 0  },
  { id: 'seed-addon-peel-mask',     serviceId: 'seed-svc-chemical-peel',        name: 'Calming Collagen Mask',   price: 18, durationMin: 10 },
];

const SLUGS = [
  { serviceId: 'seed-svc-hydrafacial',         slug: 'hydrafacial-skincuress' },
  { serviceId: 'seed-svc-deep-tissue-massage', slug: 'deep-tissue-skincuress' },
];

async function main() {
  let added = 0;
  for (const a of ADDONS) {
    const svc = await prisma.service.findUnique({ where: { id: a.serviceId }, select: { id: true } });
    if (!svc) { console.log('skip (no service):', a.serviceId); continue; }
    await prisma.serviceAddOn.upsert({
      where: { id: a.id },
      update: { name: a.name, price: a.price, durationMin: a.durationMin, isActive: true },
      create: { ...a, isActive: true },
    });
    added++;
  }
  let slugged = 0;
  for (const s of SLUGS) {
    const svc = await prisma.service.findUnique({ where: { id: s.serviceId }, select: { id: true } });
    if (!svc) continue;
    await prisma.service.update({ where: { id: s.serviceId }, data: { directBookingSlug: s.slug } });
    slugged++;
  }
  console.log(`Seeded ${added} add-ons across services, set ${slugged} direct-booking slugs.`);

  // Report back
  const check = await prisma.serviceAddOn.findMany({ where: { serviceId: { in: [...new Set(ADDONS.map(a => a.serviceId))] } }, select: { name: true, price: true, durationMin: true } });
  console.log('Add-ons now present:', check.map(c => `${c.name} ($${c.price}/${c.durationMin}m)`).join(', '));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
