import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireStaffPermission } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/giftcard.controller';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

router.get('/', authenticate, staff, ctrl.list);
router.post('/', authenticate, staff, requireStaffPermission('manageGiftCards'), ctrl.create);
router.get('/lookup/:code', authenticate, staff, ctrl.lookup);
router.post('/:id/deactivate', authenticate, staff, requireStaffPermission('manageGiftCards'), ctrl.deactivate);
router.post('/:id/send', authenticate, staff, requireStaffPermission('manageGiftCards'), ctrl.send);
router.get('/:id/history', authenticate, staff, ctrl.history);
router.post('/redeem', authenticate, staff, requireStaffPermission('manageGiftCards'), ctrl.redeem);

export default router;
