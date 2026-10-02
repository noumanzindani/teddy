import { z } from 'zod';

export const VendorApplicationSchema = z.object({
  businessName: z.string().min(1).max(100),
  ownerName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  city: z.string().min(1).max(100),
  address: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  monthlyRevenue: z.number().positive().optional(),
  staffCount: z.number().int().positive().optional(),
});

export const VendorUpdateSchema = z.object({
  businessName: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  coverUrl: z.string().url().optional(),
  address: z.string().max(200).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  openHours: z.record(z.unknown()).optional(),
  galleryUrls: z.array(z.string().url()).optional(),
  bookingWindowDays: z.number().int().min(1).max(365).optional(),
  memberBookingWindowDays: z.number().int().min(1).max(365).nullable().optional(),
  cancellationHours: z.number().int().min(0).max(336).optional(),
  rescheduleHours: z.number().int().min(0).max(336).optional(),
  allowTips: z.boolean().optional(),
  cardFeePercent: z.number().min(0).max(20).optional(),
});

export const VendorInviteSchema = z.object({
  email: z.string().email(),
});

export const VendorSearchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().optional(),
  sort: z.enum(['rating', 'distance', 'newest']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
