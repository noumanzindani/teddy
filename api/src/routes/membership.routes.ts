import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireStaffPermission } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/membership.controller';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

// Plans
router.get('/plans', authenticate, ctrl.listPlans);
router.post('/plans', authenticate, staff, requireStaffPermission('manageMemberships'), ctrl.createPlan);
router.patch('/plans/:id', authenticate, staff, requireStaffPermission('manageMemberships'), ctrl.updatePlan);
router.delete('/plans/:id', authenticate, staff, requireStaffPermission('manageMemberships'), ctrl.deletePlan);

// Subscriptions
router.get('/subscriptions', authenticate, staff, ctrl.listSubscriptions);
router.post('/subscriptions', authenticate, staff, requireStaffPermission('manageMemberships'), ctrl.subscribe);
router.post('/subscriptions/:id/cancel', authenticate, staff, requireStaffPermission('manageMemberships'), ctrl.cancel);
router.post('/subscriptions/:id/status', authenticate, staff, requireStaffPermission('manageMemberships'), ctrl.setStatus);

export default router;
