import { prisma } from './prisma';
import { ForbiddenError } from './errors';

/**
 * Resolve the vendor a staff-side actor belongs to.
 * - vendor_owner → the vendor they own
 * - vendor_staff → the vendor of their staff record
 * Throws ForbiddenError if the user isn't attached to a vendor.
 */
export async function resolveVendorId(userId: string): Promise<string> {
  const vendor = await prisma.vendor.findFirst({ where: { ownerId: userId }, select: { id: true } });
  if (vendor) return vendor.id;

  const staff = await prisma.staffMember.findFirst({ where: { userId }, select: { vendorId: true } });
  if (staff) return staff.vendorId;

  throw new ForbiddenError('Not associated with a vendor');
}
