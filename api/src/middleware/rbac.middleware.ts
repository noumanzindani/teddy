import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, AuthError } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * Gate an action behind a vendor-controlled employee permission. Vendor owners and
 * admins always pass; a vendor_staff member is blocked when the vendor has turned
 * the given permission OFF. Apply AFTER `authorize('vendor_owner','vendor_staff',…)`.
 */
export function requireStaffPermission(key: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AuthError());
    if (req.user.role !== 'vendor_staff') return next(); // owners/admins unrestricted
    const staff = await prisma.staffMember.findUnique({ where: { userId: req.user.sub }, select: { permissions: true } });
    const perms = (staff?.permissions ?? {}) as Record<string, boolean>;
    if (perms[key] === false) {
      return next(new ForbiddenError('Your manager has not enabled this action for your account.'));
    }
    next();
  };
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' is not permitted`));
    }
    next();
  };
}

export function ensureVendorOwnership(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthError());
  const vendorId = req.params.vendorId ?? (req.body as Record<string, unknown>).vendorId;
  if (req.user.role === 'admin') return next();
  if (!req.user.vendorId || req.user.vendorId !== vendorId) {
    return next(new ForbiddenError('Not the vendor owner'));
  }
  next();
}
