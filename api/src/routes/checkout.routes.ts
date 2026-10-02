import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/checkout.controller';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

router.post('/bookings/:bookingId/preview', authenticate, staff, ctrl.preview);
router.post('/bookings/:bookingId', authenticate, staff, ctrl.process);

export default router;
