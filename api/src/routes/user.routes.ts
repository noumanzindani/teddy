import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateProfileSchema, PushTokenSchema } from '../lib/validators/user.validator';
import * as ctrl from '../controllers/user.controller';

const router = Router();

router.get('/me', authenticate, ctrl.getMe);
router.patch('/me', authenticate, validate(UpdateProfileSchema), ctrl.updateMe);
router.delete('/me', authenticate, ctrl.deleteMe);
router.get('/me/bookings', authenticate, authorize('client'), ctrl.getMyBookings);
router.get('/me/wishlist', authenticate, authorize('client'), ctrl.getWishlist);
router.post('/me/wishlist/:vendorId', authenticate, authorize('client'), ctrl.toggleWishlist);
router.get('/me/rewards', authenticate, authorize('client'), ctrl.getRewards);
router.post('/me/push-token', authenticate, validate(PushTokenSchema), ctrl.registerPushToken);

export default router;
