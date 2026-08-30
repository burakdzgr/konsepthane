import { randomUUID } from 'node:crypto';
import { Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { describe, expect, it } from 'vitest';

// Supply only an isolated test Redis. Never use REDIS_URL or the live queues.
const redisUrl = process.env.TEST_REDIS_URL;
describe.skipIf(!redisUrl)('patched BullMQ / ioredis integration', () => {
  it.each(['media', 'search'])(
    'processes a %s job and shuts down cleanly',
    async (kind) => {
      const connection = new IORedis(redisUrl!, { maxRetriesPerRequest: null });
      const name = `security-test-${kind}-${randomUUID()}`;
      const queue = new Queue<{ assetId: string }>(name, { connection });
      const events = new QueueEvents(name, { connection });
      const worker = new Worker<{ assetId: string }>(
        name,
        (job) => Promise.resolve({ assetId: job.data.assetId, processed: true }),
        { connection },
      );
      try {
        await Promise.all([
          queue.waitUntilReady(),
          events.waitUntilReady(),
          worker.waitUntilReady(),
        ]);
        const job = await queue.add('compatibility-check', { assetId: 'local-fixture' });
        await expect(job.waitUntilFinished(events, 5000)).resolves.toEqual({
          assetId: 'local-fixture',
          processed: true,
        });
        expect(await job.getState()).toBe('completed');
        await job.remove();
      } finally {
        await Promise.all([worker.close(), events.close(), queue.close()]);
        await connection.quit();
      }
    },
    15000,
  );
});
