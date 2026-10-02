import { Request, Response, NextFunction } from 'express';
import * as mediaService from '../services/media.service';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function getAvatarUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const ext = (req.query.ext as string) ?? 'jpg';
    const fileKey = mediaService.generateFileKey(`avatars/${req.user!.sub}`, ext);
    const result = mediaService.getPresignedUploadUrl(fileKey, `image/${ext}`);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function getPortfolioUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const ext = (req.query.ext as string) ?? 'jpg';
    const vendor = await prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } });
    if (!vendor) throw new NotFoundError('Vendor not found');
    const fileKey = mediaService.generateFileKey(`portfolio/${vendor.id}`, ext);
    const result = mediaService.getPresignedUploadUrl(fileKey, `image/${ext}`);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function uploadBeforeAfter(req: Request, res: Response, next: NextFunction) {
  try {
    const { bookingId, beforeUrl, afterUrl } = req.body as { bookingId: string; beforeUrl?: string; afterUrl?: string };
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { vendor: { select: { ownerId: true } } } });
    if (!booking) throw new NotFoundError('Booking not found');

    const photo = await prisma.beforeAfterPhoto.upsert({
      where: { id: `ba-${bookingId}` },
      update: { beforeUrl, afterUrl },
      create: { id: `ba-${bookingId}`, bookingId, vendorId: booking.vendorId, staffMemberId: booking.staffMemberId, beforeUrl, afterUrl },
    });
    res.status(201).json({ data: photo });
  } catch (err) { next(err); }
}

export async function getBeforeAfter(req: Request, res: Response, next: NextFunction) {
  try {
    const photos = await prisma.beforeAfterPhoto.findMany({ where: { bookingId: req.params.bookingId } });
    res.json({ data: photos });
  } catch (err) { next(err); }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction) {
  try {
    await mediaService.deleteMedia(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
