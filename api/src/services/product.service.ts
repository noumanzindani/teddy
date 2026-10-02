import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export interface ProductInput {
  name: string;
  brand?: string;
  description?: string;
  type?: 'retail' | 'professional' | 'both';
  price?: number;
  cost?: number;
  stock?: number;
  lowStockThreshold?: number;
  sku?: string;
  ingredients?: string[];
  imageUrl?: string;
  isActive?: boolean;
}

/** Products at or below their low-stock threshold (for alerts). */
export async function listLowStock(vendorId: string) {
  const products = await prisma.product.findMany({ where: { vendorId, isActive: true } });
  return products.filter((p) => p.stock <= p.lowStockThreshold);
}

export async function listProducts(vendorId: string, opts: { type?: string; activeOnly?: boolean } = {}) {
  return prisma.product.findMany({
    where: {
      vendorId,
      ...(opts.type ? { type: opts.type as never } : {}),
      ...(opts.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
}

export async function createProduct(vendorId: string, data: ProductInput) {
  return prisma.product.create({
    data: {
      vendorId,
      name: data.name,
      brand: data.brand,
      description: data.description,
      type: (data.type ?? 'retail') as never,
      price: data.price ?? 0,
      cost: data.cost,
      stock: data.stock ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      sku: data.sku,
      ingredients: (data.ingredients ?? []) as never,
      imageUrl: data.imageUrl,
      isActive: data.isActive ?? true,
    },
  });
}

async function assertOwnership(id: string, vendorId: string) {
  const product = await prisma.product.findUnique({ where: { id }, select: { vendorId: true } });
  if (!product) throw new NotFoundError('Product not found');
  if (product.vendorId !== vendorId) throw new ForbiddenError('Not your product');
}

export async function updateProduct(id: string, vendorId: string, data: ProductInput) {
  await assertOwnership(id, vendorId);
  const payload: Record<string, unknown> = {};
  for (const k of ['name', 'brand', 'description', 'sku', 'imageUrl'] as const) if (data[k] !== undefined) payload[k] = data[k];
  if (data.type !== undefined) payload.type = data.type;
  if (data.price !== undefined) payload.price = data.price;
  if (data.cost !== undefined) payload.cost = data.cost;
  if (data.stock !== undefined) payload.stock = data.stock;
  if (data.lowStockThreshold !== undefined) payload.lowStockThreshold = data.lowStockThreshold;
  if (data.ingredients !== undefined) payload.ingredients = data.ingredients;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  return prisma.product.update({ where: { id }, data: payload });
}

export async function deleteProduct(id: string, vendorId: string) {
  await assertOwnership(id, vendorId);
  // Soft delete so historical invoice line items keep resolving.
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}

// ── Service protocol (which products a service uses) ──────────────────────────

export async function getServiceProtocol(serviceId: string) {
  return prisma.serviceProduct.findMany({
    where: { serviceId },
    include: { product: true },
    orderBy: { step: 'asc' },
  });
}

export interface ProtocolItem { productId: string; step?: number; role?: string; notes?: string }

/**
 * Set a service's protocol. Accepts either a plain productId[] (back-compat) or
 * rich items with step/role('use'|'alternative'|'avoid')/notes for the builder.
 */
export async function setServiceProtocol(serviceId: string, input: string[] | ProtocolItem[]) {
  const items: ProtocolItem[] = (input as unknown[]).map((it, i) =>
    typeof it === 'string' ? { productId: it, step: i + 1, role: 'use' } : { step: i + 1, role: 'use', ...(it as ProtocolItem) },
  );
  await prisma.serviceProduct.deleteMany({ where: { serviceId } });
  for (const it of items) {
    await prisma.serviceProduct.create({
      data: { serviceId, productId: it.productId, step: it.step ?? 0, role: it.role ?? 'use', notes: it.notes ?? null },
    }).catch(() => { /* skip dup */ });
  }
  return getServiceProtocol(serviceId);
}
