import { config as loadDotEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import argon2 from 'argon2';

loadDotEnv({ path: 'backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const passwordHash = await argon2.hash('raloa-demo-password', { type: argon2.argon2id });
  const user = await prisma.user.upsert({ where: { email: 'demo@raloa.app' }, update: {}, create: { email: 'demo@raloa.app', passwordHash, emailVerifiedAt: new Date() } });
  const profile = await prisma.profile.upsert({ where: { username: 'demo' }, update: {}, create: { ownerUserId: user.id, username: 'demo', displayName: 'RALOA Demo', role: { en: 'Creator', ar: 'منشئ' }, bio: { en: 'A real API-backed profile.', ar: 'ملف مدعوم بواجهة API حقيقية.' }, published: true, seo: { title: 'RALOA Demo', description: 'A real API-backed profile.', indexable: true }, socials: [], theme: { id: 'paper' } } });
  const page = await prisma.page.upsert({ where: { profileId_slug: { profileId: profile.id, slug: 'links' } }, update: {}, create: { profileId: profile.id, title: { en: 'Links', ar: 'الروابط' }, slug: 'links', description: { en: 'Demo links', ar: 'روابط تجريبية' }, published: true, visibility: 'PUBLIC', position: 0 } });
  await prisma.block.upsert({ where: { id: '00000000-0000-4000-8000-000000000001' }, update: {}, create: { id: '00000000-0000-4000-8000-000000000001', pageId: page.id, type: 'link', title: { en: 'Open RALOA', ar: 'افتح RALOA' }, url: 'https://raloa.app', config: { buttonStyle: 'solid' }, position: 0 } });
}

main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
