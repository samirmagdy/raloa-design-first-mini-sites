export const metrics = { requests: 0, errors: 0, rateLimited: 0, queueJobs: 0 };

export const recordRequest = () => { metrics.requests += 1; };
export const recordError = () => { metrics.errors += 1; };
export const recordRateLimit = () => { metrics.rateLimited += 1; };
export const recordQueueJob = () => { metrics.queueJobs += 1; };
