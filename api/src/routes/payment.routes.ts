import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { paymentLimiter } from '../middleware/rateLimit.middleware';
import * as ctrl from '../controllers/payment.controller';

const router = Router();

// Webhook must be before json body parser — mounted in server.ts with raw body parser
router.post('/webhooks/stripe', ctrl.handleStripeWebhook);

router.post('/intent', authenticate, authorize('client'), paymentLimiter, ctrl.createIntent);
router.post('/confirm', authenticate, authorize('client'), ctrl.confirm);
router.post('/:bookingId/refund', authenticate, ctrl.refund);
router.get('/:bookingId/status', authenticate, ctrl.getStatus);

export default router;
