import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// Vendors
router.get('/vendors/pending', ctrl.listPendingVendors);
router.post('/vendors/:id/approve', ctrl.approveVendor);
router.post('/vendors/:id/reject', ctrl.rejectVendor);
router.post('/vendors/:id/suspend', ctrl.suspendVendor);

// Users
router.get('/users', ctrl.listUsers);
router.post('/users/:id/ban', ctrl.banUser);
router.post('/users/:id/unban', ctrl.unbanUser);

// Disputes
router.get('/disputes', ctrl.listDisputes);
router.post('/disputes/:id/resolve', ctrl.resolveDispute);

// Payouts
router.get('/payouts', ctrl.listPayouts);
router.post('/payouts/:id/flag', ctrl.flagPayout);
router.post('/payouts/:id/release', ctrl.releasePayout);

// Reviews
router.get('/reviews/flagged', ctrl.listFlaggedReviews);
router.post('/reviews/:id/hide', ctrl.hideReview);
router.post('/reviews/:id/show', ctrl.showReview);

// Analytics & Settings
router.get('/analytics', ctrl.getPlatformAnalytics);
router.patch('/settings', ctrl.updateSettings);

export default router;
