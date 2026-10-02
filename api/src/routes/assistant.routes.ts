import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/assistant.controller';

const router = Router();
const staff = authorize('vendor_owner', 'vendor_staff', 'admin');

router.get('/suggestions', authenticate, staff, ctrl.suggestions);
router.post('/ask', authenticate, staff, ctrl.ask);

export default router;
