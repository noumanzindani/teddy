import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';
import { resolveVendorId } from '../lib/actor';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    const products = await productService.listProducts(vendorId, {
      type: req.query.type ? String(req.query.type) : undefined,
      activeOnly: req.query.activeOnly === 'true',
    });
    res.json({ data: products });
  } catch (err) { next(err); }
}

export async function lowStock(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = req.query.vendorId ? String(req.query.vendorId) : await resolveVendorId(req.user!.sub);
    res.json({ data: await productService.listLowStock(vendorId) });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const product = await productService.createProduct(vendorId, req.body);
    res.status(201).json({ data: product });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    const product = await productService.updateProduct(req.params.id, vendorId, req.body);
    res.json({ data: product });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const vendorId = await resolveVendorId(req.user!.sub);
    await productService.deleteProduct(req.params.id, vendorId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}

export async function getProtocol(req: Request, res: Response, next: NextFunction) {
  try {
    const protocol = await productService.getServiceProtocol(req.params.serviceId);
    res.json({ data: protocol });
  } catch (err) { next(err); }
}

export async function setProtocol(req: Request, res: Response, next: NextFunction) {
  try {
    const protocol = await productService.setServiceProtocol(req.params.serviceId, req.body.items ?? req.body.productIds ?? []);
    res.json({ data: protocol });
  } catch (err) { next(err); }
}
