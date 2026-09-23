import { Queue } from 'bullmq';
import { recordQueueJob } from './metrics';

const queueName = 'raloa-analytics';
const deadLetterName = 'raloa-analytics-dead-letter';
const connection = () => {
  const value = process.env.REDIS_URL;
  if (!value) return null;
  const url = new URL(value);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined, password: url.password || undefined, maxRetriesPerRequest: null as null };
};

let queue: Queue | null | undefined;
const getQueue = () => { if (queue === undefined) { const config = connection(); queue = config ? new Queue(queueName, { connection: config }) : null; } return queue; };
export const enqueueAnalyticsAggregation = async (profileId: string) => { const current = getQueue(); if (!current) return false; await current.add('aggregate-profile', { profileId }, { removeOnComplete: 1000, removeOnFail: 5000 }); recordQueueJob(); return true; };
export const getAnalyticsQueueStats = async () => {
  const config = connection();
  if (!config) return { configured: false, active: 0, completed: 0, failed: 0, waiting: 0, deadLetter: 0 };
  const queueInstance = new Queue(queueName, { connection: config });
  const deadLetterQueue = new Queue(deadLetterName, { connection: config });
  try {
    const [counts, deadLetterCounts] = await Promise.all([queueInstance.getJobCounts(), deadLetterQueue.getJobCounts()]);
    return { configured: true, active: counts.active ?? 0, completed: counts.completed ?? 0, failed: counts.failed ?? 0, waiting: counts.waiting ?? 0, deadLetter: deadLetterCounts.waiting ?? 0 };
  } finally {
    await queueInstance.close();
    await deadLetterQueue.close();
  }
};
export { queueName, connection };
export { deadLetterName };
