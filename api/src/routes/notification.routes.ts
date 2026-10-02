import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.patch('/read-all', authenticate, ctrl.markAllRead);
router.patch('/preferences', authenticate, ctrl.updatePreferences);
router.get('/preferences', authenticate, ctrl.getPreferences);
router.patch('/:id/read', authenticate, ctrl.markRead);

export default router;
