import { z } from 'zod';

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

export const FlagReviewSchema = z.object({
  reason: z.string().min(1).max(500),
});
