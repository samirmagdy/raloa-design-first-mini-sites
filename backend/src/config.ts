import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).default('RALOA <no-reply@raloa.app>')
  ,R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional()
});

export type AppConfig = z.infer<typeof envSchema>;

export const loadConfig = (): AppConfig => envSchema.parse(process.env);
