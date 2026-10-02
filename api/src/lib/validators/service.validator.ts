import { z } from 'zod';

export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(100),
  durationMin: z.number().int().positive(),
  price: z.number().positive(),
  bufferMin: z.number().int().min(0).default(15),
  imageUrl: z.string().url().optional(),
  depositPercentage: z.number().int().min(0).max(100).optional(),
  isTimed: z.boolean().optional(),
  extraTimeRate: z.number().min(0).nullable().optional(),
  requiresCardOnFile: z.boolean().optional(),
  directBookingSlug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).nullable().optional(),
});

export const UpdateServiceSchema = CreateServiceSchema.partial();

export const ServiceSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  priceMax: z.coerce.number().positive().optional(),
  durationMax: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
