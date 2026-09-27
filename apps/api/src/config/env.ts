import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root or local .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgrespassword@localhost:5432/shenoda_dev?schema=public'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().default('shenoda-dev-access-secret-390px-2026-coptic'),
  JWT_REFRESH_SECRET: z.string().default('shenoda-dev-refresh-secret-390px-2026-coptic'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  COOKIE_SECRET: z.string().default('shenoda-dev-cookie-secret-2026'),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
