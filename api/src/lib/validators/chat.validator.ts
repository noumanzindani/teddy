import { z } from 'zod';

export const CreateThreadSchema = z.object({
  clientId: z.string().uuid(),
});

export const SendMessageSchema = z
  .object({
    body: z.string().min(1).max(2000).optional(),
    mediaUrl: z.string().url().optional(),
  })
  .refine((d) => d.body || d.mediaUrl, {
    message: 'Either body or mediaUrl must be provided',
  });
