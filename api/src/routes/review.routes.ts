import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateReviewSchema, FlagReviewSchema } from '../lib/validators/review.validator';
import * as ctrl from '../controllers/review.controller';

const router = Router();

router.post('/', authenticate, authorize('client'), validate(CreateReviewSchema), ctrl.create);
router.get('/:vendorId', ctrl.listByVendor);
router.post('/:id/flag', authenticate, validate(FlagReviewSchema), ctrl.flag);

export default router;
