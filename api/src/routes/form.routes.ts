import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireStaffPermission } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/form.controller';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

// Builder (vendor)
router.get('/', authenticate, staff, ctrl.list);
router.post('/', authenticate, staff, requireStaffPermission('createForms'), ctrl.create);
router.patch('/:id', authenticate, staff, requireStaffPermission('createForms'), ctrl.update);
router.delete('/:id', authenticate, staff, requireStaffPermission('createForms'), ctrl.remove);
router.get('/responses', authenticate, staff, ctrl.responses);
router.get('/booking/:bookingId/status', authenticate, staff, ctrl.bookingStatus);

// Client-facing
router.get('/service/:serviceId', authenticate, ctrl.forService);
router.get('/my-responses', authenticate, ctrl.myResponses);
router.get('/my-forms', authenticate, ctrl.myForms);
router.post('/:id/submit', authenticate, ctrl.submit);

export default router;
