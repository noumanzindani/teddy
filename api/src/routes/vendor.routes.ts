import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { searchLimiter } from '../middleware/rateLimit.middleware';
import { VendorApplicationSchema, VendorUpdateSchema, VendorInviteSchema, VendorSearchSchema } from '../lib/validators/vendor.validator';
import * as ctrl from '../controllers/vendor.controller';

const router = Router();

router.get('/', optionalAuthenticate, searchLimiter, validateQuery(VendorSearchSchema), ctrl.list);
router.post('/apply', authenticate, authorize('vendor_owner'), validate(VendorApplicationSchema), ctrl.applyForVendor);
router.get('/me', authenticate, authorize('vendor_owner'), ctrl.getMyVendor);
router.patch('/me', authenticate, authorize('vendor_owner'), validate(VendorUpdateSchema), ctrl.updateMyVendor);
router.get('/me/dashboard', authenticate, authorize('vendor_owner'), ctrl.getDashboard);
router.get('/me/bookings', authenticate, authorize('vendor_owner'), ctrl.getVendorBookings);
router.post('/me/bookings', authenticate, authorize('vendor_owner'), ctrl.createVendorBooking);
router.get('/me/waitlist', authenticate, authorize('vendor_owner'), ctrl.getVendorWaitlist);
router.get('/me/sms-config', authenticate, authorize('vendor_owner'), ctrl.getSmsConfig);
router.put('/me/sms-config', authenticate, authorize('vendor_owner'), ctrl.updateSmsConfig);
router.get('/me/clients', authenticate, authorize('vendor_owner'), ctrl.getVendorClients);
router.get('/me/staff', authenticate, authorize('vendor_owner'), ctrl.getVendorStaff);
router.patch('/me/staff/:staffId/permissions', authenticate, authorize('vendor_owner'), ctrl.updateStaffPermissions);
router.post('/me/staff/invite', authenticate, authorize('vendor_owner'), validate(VendorInviteSchema), ctrl.inviteStaff);
router.get('/me/payouts', authenticate, authorize('vendor_owner'), ctrl.getVendorPayouts);
router.get('/me/blocked-slots', authenticate, authorize('vendor_owner'), ctrl.getBlockedSlots);
router.post('/me/blocked-slots', authenticate, authorize('vendor_owner'), ctrl.createBlockedSlot);
router.delete('/me/blocked-slots/:slotId', authenticate, authorize('vendor_owner'), ctrl.deleteBlockedSlot);
router.get('/:id', optionalAuthenticate, ctrl.getById);

export default router;
