import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  vendorId?: string;
  staffId?: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

function loadKey(envPathVar: string, envInlineVar: string): Buffer {
  // Prefer inline base64-encoded key (used in cloud deployments like Railway)
  const inline = process.env[envInlineVar];
  if (inline) return Buffer.from(inline, 'base64');
  // Fall back to file path (local dev)
  const resolved = path.resolve(process.env[envPathVar] ?? '');
  return fs.readFileSync(resolved);
}

let _privateKey: Buffer | null = null;
let _publicKey: Buffer | null = null;

function getPrivateKey(): Buffer {
  if (!_privateKey) _privateKey = loadKey('JWT_PRIVATE_KEY_PATH', 'JWT_PRIVATE_KEY_B64');
  return _privateKey;
}

function getPublicKey(): Buffer {
  if (!_publicKey) _publicKey = loadKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY_B64');
  return _publicKey;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'jti'>): string {
  const jti = uuid();
  return jwt.sign({ ...payload, jti }, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti, type: 'refresh' }, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: (process.env.JWT_REFRESH_EXPIRY ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] }) as RefreshTokenPayload;
}

export function generateJti(): string {
  return uuid();
}
