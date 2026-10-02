import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/media.controller';

const router = Router();

router.post('/upload/avatar', authenticate, ctrl.getAvatarUploadUrl);
router.post('/upload/portfolio', authenticate, authorize('vendor_owner'), ctrl.getPortfolioUploadUrl);
router.post('/upload/before-after', authenticate, authorize('vendor_owner', 'vendor_staff'), ctrl.uploadBeforeAfter);
router.get('/before-after/:bookingId', authenticate, ctrl.getBeforeAfter);
router.delete('/:id', authenticate, ctrl.deleteMedia);

export default router;
