import { z } from 'zod';

export const CreateBookingSchema = z.object({
  vendorId: z.string().min(1),
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1).optional(),
  startsAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
  addOns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().min(0),
    durationMin: z.number().int().min(0),
  })).optional(),
});

export const CancelBookingSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW']),
});
