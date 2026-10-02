import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireStaffPermission } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/product.controller';

const router = Router();

const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

router.get('/', authenticate, ctrl.list);
router.get('/low-stock', authenticate, staff, ctrl.lowStock);
router.post('/', authenticate, staff, requireStaffPermission('manageProducts'), ctrl.create);
router.patch('/:id', authenticate, staff, requireStaffPermission('manageProducts'), ctrl.update);
router.delete('/:id', authenticate, staff, requireStaffPermission('manageProducts'), ctrl.remove);

// Service protocol management
router.get('/service/:serviceId/protocol', authenticate, ctrl.getProtocol);
router.patch('/service/:serviceId/protocol', authenticate, staff, requireStaffPermission('manageProducts'), ctrl.setProtocol);

export default router;
