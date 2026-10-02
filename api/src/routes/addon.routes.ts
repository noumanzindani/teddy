import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/addon.controller';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

// Service add-ons
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, staff, ctrl.create);
router.patch('/:id', authenticate, staff, ctrl.update);
router.delete('/:id', authenticate, staff, ctrl.remove);

// Flag a client's online-booking access
router.patch('/clients/:clientId/booking-access', authenticate, staff, ctrl.setClientAccess);

export default router;
