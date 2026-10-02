import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/clinical.controller';

const router = Router();

// Client medical/marketing profile. ":userId" accepts "me" for the current user, so
// clients can read/update their own profile and staff/vendors can manage a client's.
router.get('/clients/:userId/profile', authenticate, ctrl.getProfile);
router.patch('/clients/:userId/profile', authenticate, ctrl.updateProfile);

// Pre-service review (client info + protocol + allergy conflicts) and post-service record.
router.get('/bookings/:bookingId/review', authenticate, authorize('vendor_owner', 'vendor_staff', 'admin'), ctrl.getBookingReview);
router.get('/bookings/:bookingId/record', authenticate, ctrl.getRecord);
router.post('/bookings/:bookingId/record', authenticate, authorize('vendor_owner', 'vendor_staff', 'admin'), ctrl.saveRecord);

// Pre-visit questionnaire — client submits; visible to all parties (client/vendor/staff).
router.post('/bookings/:bookingId/intake', authenticate, ctrl.submitIntake);
router.get('/bookings/:bookingId/intake', authenticate, ctrl.getIntake);

export default router;
