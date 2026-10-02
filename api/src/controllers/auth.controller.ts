import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.loginWithPassword(email, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginWithGoogle(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = req.body as { idToken: string };
    const result = await authService.loginWithGoogle(idToken);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = req.body as { phone: string };
    await authService.sendOtp(phone);
    res.json({ data: { message: 'OTP sent' } });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, code } = req.body as { phone: string; code: string };
    const result = await authService.verifyOtp(phone, code);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };
    const tokens = await authService.rotateTokens(token);
    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.jti);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
