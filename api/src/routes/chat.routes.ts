import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateThreadSchema, SendMessageSchema } from '../lib/validators/chat.validator';
import * as ctrl from '../controllers/chat.controller';

const router = Router();

router.get('/threads', authenticate, ctrl.listThreads);
router.post('/threads', authenticate, authorize('vendor_owner'), validate(CreateThreadSchema), ctrl.createThread);
router.get('/threads/:id', authenticate, ctrl.getThread);
router.post('/threads/:id/messages', authenticate, validate(SendMessageSchema), ctrl.sendMessage);
router.patch('/threads/:id/read', authenticate, ctrl.markThreadRead);

export default router;
