import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { connection, deadLetterName, queueName } from './analytics.queue';

const redis = connection();
if (!redis) throw new Error('REDIS_URL is required to run the analytics worker.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const aggregate = async (profileId: string, day = new Date()) => {
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const end = new Date(start.getTime() + 86_400_000);
  const events = await prisma.analyticsEvent.findMany({ where: { profileId, occurredAt: { gte: start, lt: end } }, select: { type: true, visitorHash: true } });
  await prisma.analyticsDaily.upsert({ where: { profileId_day: { profileId, day: start } }, update: { views: events.filter((event) => event.type === 'VIEW').length, uniqueVisitors: new Set(events.map((event) => event.visitorHash).filter(Boolean)).size, linkClicks: events.filter((event) => event.type === 'CLICK').length, formSubmissions: events.filter((event) => event.type === 'FORM_SUBMIT').length }, create: { profileId, day: start, views: events.filter((event) => event.type === 'VIEW').length, uniqueVisitors: new Set(events.map((event) => event.visitorHash).filter(Boolean)).size, linkClicks: events.filter((event) => event.type === 'CLICK').length, formSubmissions: events.filter((event) => event.type === 'FORM_SUBMIT').length } });
};

const worker = new Worker(queueName, async (job) => {
  if (job.name === 'aggregate-profile') await aggregate(job.data.profileId);
  if (job.name === 'retention') await prisma.analyticsEvent.deleteMany({ where: { occurredAt: { lt: new Date(Date.now() - 365 * 86_400_000) } } });
}, { connection: redis, concurrency: 4 });
const maintenanceQueue = new Queue(queueName, { connection: redis });
const deadLetterQueue = new Queue(deadLetterName, { connection: redis });
worker.on('failed', (job, error) => { if (job) void deadLetterQueue.add(job.name, { ...job.data, failure: error.message }, { removeOnComplete: 100, removeOnFail: 1000 }); });

const retention = setInterval(() => { void maintenanceQueue.add('retention', {}, { removeOnComplete: 10, removeOnFail: 100 }); }, 86_400_000);
console.log('RALOA analytics worker started');
const shutdown = async () => { clearInterval(retention); await worker.close(); await maintenanceQueue.close(); await deadLetterQueue.close(); await prisma.$disconnect(); await pool.end(); process.exit(0); };
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
