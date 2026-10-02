import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { paymentLimiter } from '../middleware/rateLimit.middleware';
import { CreateBookingSchema, CancelBookingSchema } from '../lib/validators/booking.validator';
import * as ctrl from '../controllers/booking.controller';

const router = Router();

router.post('/', authenticate, authorize('client'), validate(CreateBookingSchema), paymentLimiter, ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.post('/:id/confirm', authenticate, authorize('vendor_owner', 'admin'), ctrl.confirm);
router.post('/:id/start', authenticate, authorize('vendor_owner', 'vendor_staff'), ctrl.start);
router.post('/:id/timer/extend', authenticate, authorize('vendor_owner', 'vendor_staff'), ctrl.extendTimer);
router.post('/:id/complete', authenticate, authorize('vendor_owner', 'vendor_staff'), ctrl.complete);
router.post('/:id/pay-balance', authenticate, authorize('client'), paymentLimiter, ctrl.payBalance);
router.get('/:id/invoice', authenticate, ctrl.getInvoice);
router.post('/:id/cancel', authenticate, validate(CancelBookingSchema), ctrl.cancel);
router.post('/:id/reschedule', authenticate, ctrl.reschedule);
router.post('/:id/no-show', authenticate, authorize('vendor_owner', 'vendor_staff', 'admin'), ctrl.markNoShow);
router.get('/:id/waitlist-position', authenticate, ctrl.getWaitlistPosition);

export default router;
