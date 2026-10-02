import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
});

export const PushTokenSchema = z.object({
  token: z.string().startsWith('ExponentPushToken[').endsWith(']'),
});
