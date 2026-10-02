import { Request, Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service';
import { SenderRole } from '@prisma/client';

export async function listThreads(req: Request, res: Response, next: NextFunction) {
  try {
    const threads = await chatService.listThreads(req.user!.sub, req.user!.role);
    res.json({ data: threads });
  } catch (err) { next(err); }
}

export async function createThread(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.body as { clientId: string };
    const vendor = await import('../lib/prisma').then(({ prisma }) =>
      prisma.vendor.findUnique({ where: { ownerId: req.user!.sub }, select: { id: true } })
    );
    if (!vendor) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } }); return; }
    const thread = await chatService.createThread(vendor.id, clientId);
    res.status(201).json({ data: thread });
  } catch (err) { next(err); }
}

export async function getThread(req: Request, res: Response, next: NextFunction) {
  try {
    const thread = await chatService.getThread(req.params.id, req.user!.sub);
    res.json({ data: thread });
  } catch (err) { next(err); }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { body, mediaUrl } = req.body as { body?: string; mediaUrl?: string };
    const roleMap: Record<string, SenderRole> = { client: 'client', vendor_owner: 'vendor', vendor_staff: 'staff', admin: 'admin' };
    const senderRole = roleMap[req.user!.role] ?? ('client' as SenderRole);
    const message = await chatService.sendMessage(req.params.id, req.user!.sub, senderRole, body, mediaUrl);
    res.status(201).json({ data: message });
  } catch (err) { next(err); }
}

export async function markThreadRead(req: Request, res: Response, next: NextFunction) {
  try {
    await chatService.markThreadRead(req.params.id, req.user!.sub);
    res.json({ data: { read: true } });
  } catch (err) { next(err); }
}
