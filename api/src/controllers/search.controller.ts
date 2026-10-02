import { Request, Response, NextFunction } from 'express';
import * as searchService from '../services/search.service';

export async function vendors(req: Request, res: Response, next: NextFunction) {
  try {
    const params = {
      ...req.query,
      page: parseInt(req.query.page as string ?? '1'),
      limit: parseInt(req.query.limit as string ?? '20'),
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
    } as Parameters<typeof searchService.searchVendors>[0];
    const result = await searchService.searchVendors(params);
    res.json(result);
  } catch (err) { next(err); }
}

export async function services(req: Request, res: Response, next: NextFunction) {
  try {
    const params = {
      q: req.query.q as string,
      category: req.query.category as string,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      durationMax: req.query.durationMax ? parseInt(req.query.durationMax as string) : undefined,
      page: parseInt(req.query.page as string ?? '1'),
      limit: parseInt(req.query.limit as string ?? '20'),
    };
    const result = await searchService.searchServices(params);
    res.json(result);
  } catch (err) { next(err); }
}

export async function suggest(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string ?? '').trim();
    if (q.length < 2) {
      res.json({ data: [] });
      return;
    }
    const suggestions = await searchService.suggest(q);
    res.json({ data: suggestions });
  } catch (err) { next(err); }
}
