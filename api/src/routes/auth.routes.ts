import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.middleware';
import {
  RegisterSchema, LoginSchema, RefreshTokenSchema,
  OtpSendSchema, OtpVerifySchema, GoogleOAuthSchema,
} from '../lib/validators/auth.validator';
import * as ctrl from '../controllers/auth.controller';

const router = Router();

router.post('/register', authLimiter, validate(RegisterSchema), ctrl.register);
router.post('/login', authLimiter, validate(LoginSchema), ctrl.login);
router.post('/login/google', authLimiter, validate(GoogleOAuthSchema), ctrl.loginWithGoogle);
router.post('/login/phone/send', otpLimiter, validate(OtpSendSchema), ctrl.sendOtp);
router.post('/login/phone/verify', otpLimiter, validate(OtpVerifySchema), ctrl.verifyOtp);
router.post('/token/refresh', validate(RefreshTokenSchema), ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);

export default router;
