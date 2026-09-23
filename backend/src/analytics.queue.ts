import { Queue } from 'bullmq';

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
export const enqueueAnalyticsAggregation = async (profileId: string) => { const current = getQueue(); if (!current) return false; await current.add('aggregate-profile', { profileId }, { removeOnComplete: 1000, removeOnFail: 5000 }); return true; };
export { queueName, connection };
export { deadLetterName };
