import { z } from 'zod';

export const RegisterSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 format').optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one digit'),
  role: z.enum(['client', 'vendor_owner']).default('client'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const OtpSendSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 format'),
});

export const OtpVerifySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  code: z.string().length(6),
});

export const GoogleOAuthSchema = z.object({
  idToken: z.string().min(1),
});
