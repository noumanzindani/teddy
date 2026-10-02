import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });
export const redisSubscriber = new Redis(REDIS_URL, { lazyConnect: true });
export const redisPublisher = new Redis(REDIS_URL, { lazyConnect: true });

redis.on('error', (err) => console.error('[Redis] main error', err));
redisSubscriber.on('error', (err) => console.error('[Redis] subscriber error', err));
redisPublisher.on('error', (err) => console.error('[Redis] publisher error', err));

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function delCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}
