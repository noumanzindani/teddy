import { Router } from 'express';
import { searchLimiter } from '../middleware/rateLimit.middleware';
import * as ctrl from '../controllers/search.controller';

const router = Router();

router.get('/vendors', searchLimiter, ctrl.vendors);
router.get('/services', searchLimiter, ctrl.services);
router.get('/suggest', searchLimiter, ctrl.suggest);

export default router;
