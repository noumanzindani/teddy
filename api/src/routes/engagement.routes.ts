import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/engagement.controller';

const router = Router();

router.get('/referrals', authenticate, ctrl.myReferrals);
router.get('/my-products', authenticate, ctrl.myProducts);
router.post('/bookings/:bookingId/review-request', authenticate, authorize('vendor_owner', 'vendor_staff', 'admin'), ctrl.requestReview);

export default router;
