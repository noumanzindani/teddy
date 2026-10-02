import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/staff.controller';

const router = Router();

router.get('/me', authenticate, authorize('vendor_staff'), ctrl.getMe);
router.patch('/me', authenticate, authorize('vendor_staff'), ctrl.updateMe);
router.get('/me/schedule', authenticate, authorize('vendor_staff'), ctrl.getSchedule);
router.get('/me/clients', authenticate, authorize('vendor_staff'), ctrl.getClients);
router.post('/me/bookings', authenticate, authorize('vendor_staff'), ctrl.createStaffBooking);
router.post('/me/time-off', authenticate, authorize('vendor_staff'), ctrl.requestTimeOff);
router.get('/me/time-off', authenticate, authorize('vendor_staff'), ctrl.getTimeOff);
router.delete('/me/time-off/:slotId', authenticate, authorize('vendor_staff'), ctrl.cancelTimeOff);
router.get('/me/calendar-url', authenticate, authorize('vendor_staff'), ctrl.getCalendarUrl);
router.get('/me/earnings', authenticate, authorize('vendor_staff'), ctrl.getEarnings);
router.get('/me/performance', authenticate, authorize('vendor_staff'), ctrl.getPerformance);
router.get('/me/reviews', authenticate, authorize('vendor_staff'), ctrl.getReviews);
router.get('/invite/:token', ctrl.acceptInvite);
router.post('/invite/:token', authenticate, ctrl.acceptInvite);

export default router;
