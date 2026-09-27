import Redis from 'ioredis';
import { env } from './env';

class MemoryRedisFallback {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }
}

// In-memory fallback singleton
export const memoryRedis = new MemoryRedisFallback();

let client: any = memoryRedis;

if (env.REDIS_URL && env.NODE_ENV !== 'test') {
  try {
    const realRedis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    realRedis.on('error', (err) => {
      console.warn('⚠️ Redis connection error, falling back to in-memory store:', err.message);
    });

    realRedis
      .connect()
      .then(() => {
        client = realRedis;
        console.log('✅ Connected to Redis cache successfully');
      })
      .catch((err) => {
        console.warn('⚠️ Could not connect to Redis, using in-memory store:', err.message);
      });
  } catch (err: any) {
    console.warn('⚠️ Redis initialization error, using in-memory store:', err.message);
  }
}

export const redisClient = {
  get: (key: string): Promise<string | null> => client.get(key),
  set: (key: string, value: string, mode?: string, duration?: number): Promise<any> =>
    client.set(key, value, mode, duration),
  del: (key: string): Promise<any> => client.del(key),
  flushall: (): Promise<any> => client.flushall(),
  quit: (): Promise<any> => client.quit(),
};
