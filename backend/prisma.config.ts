import { config as loadDotEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadDotEnv({ path: 'backend/.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') }
});
