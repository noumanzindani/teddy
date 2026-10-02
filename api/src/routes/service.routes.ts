import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { CreateServiceSchema, UpdateServiceSchema, ServiceSearchSchema } from '../lib/validators/service.validator';
import * as ctrl from '../controllers/service.controller';

const router = Router();

router.get('/', validateQuery(ServiceSearchSchema), ctrl.list);
router.get('/categories', ctrl.getCategories);
router.post('/', authenticate, authorize('vendor_owner'), validate(CreateServiceSchema), ctrl.create);
router.get('/:vendorId', ctrl.listByVendor);
router.patch('/:id', authenticate, authorize('vendor_owner'), validate(UpdateServiceSchema), ctrl.update);
router.delete('/:id', authenticate, authorize('vendor_owner'), ctrl.remove);

export default router;
