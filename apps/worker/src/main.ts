import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { database } from '@ilham/database';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

interface MediaJob {
  assetId: string;
}
interface SearchJob {
  entityType: string;
  entityId: string;
}

const meiliUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
const meiliKey = process.env.MEILISEARCH_MASTER_KEY ?? '';

async function indexSearchDocument(data: SearchJob) {
  const profileSelect = { profile: { select: { displayName: true, username: true } } } as const;
  const record =
    data.entityType === 'QUESTION'
      ? await database.question.findUnique({
          where: { id: data.entityId },
          include: { author: { include: profileSelect } },
        })
      : data.entityType === 'DISCUSSION'
        ? await database.discussion.findUnique({
            where: { id: data.entityId },
            include: { author: { include: profileSelect } },
          })
        : data.entityType === 'POLL'
          ? await database.poll.findUnique({
              where: { id: data.entityId },
              include: { author: { include: profileSelect } },
            })
          : data.entityType === 'GUIDE'
            ? await database.guide.findUnique({
                where: { id: data.entityId },
                include: { author: { include: profileSelect } },
              })
            : data.entityType === 'EVENT_EXPERIENCE'
              ? await database.experience.findUnique({
                  where: { id: data.entityId },
                  include: { author: { include: profileSelect } },
                })
              : await database.concept.findUnique({
                  where: { id: data.entityId },
                  include: { author: { include: profileSelect } },
                });
  if (!record) return;
  const row = record as typeof record & {
    title: string;
    slug: string;
    body?: string | null;
    summary?: string | null;
    description?: string | null;
    author?: { profile?: { displayName: string; username: string | null } | null } | null;
    moderationStatus?: string;
    visibility?: string;
    indexability?: string;
  };
  const response = await fetch(`${meiliUrl}/indexes/community/documents?primaryKey=id`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(meiliKey ? { authorization: `Bearer ${meiliKey}` } : {}),
    },
    body: JSON.stringify([
      {
        id: `${data.entityType}_${data.entityId}`,
        entityId: data.entityId,
        type: data.entityType,
        title: row.title,
        slug: row.slug,
        text: row.body ?? row.summary ?? row.description ?? '',
        author: row.author?.profile?.displayName ?? null,
        username: row.author?.profile?.username ?? null,
        moderationStatus: row.moderationStatus ?? 'APPROVED',
        visibility: row.visibility ?? 'PUBLIC',
        indexability: row.indexability ?? 'INDEX',
      },
    ]),
  });
  if (!response.ok) throw new Error(`Meilisearch indexing failed: ${response.status}`);
}

async function bootstrapSearchIndex() {
  const headers = {
    'content-type': 'application/json',
    ...(meiliKey ? { authorization: `Bearer ${meiliKey}` } : {}),
  };
  await fetch(`${meiliUrl}/indexes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ uid: 'community', primaryKey: 'id' }),
  }).catch(() => undefined);
  await fetch(`${meiliUrl}/indexes/community/settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      searchableAttributes: ['title', 'text', 'author', 'username'],
      filterableAttributes: ['type', 'moderationStatus', 'visibility', 'indexability'],
      sortableAttributes: ['publishedAt', 'reactionCount', 'responseCount'],
    }),
  }).catch(() => undefined);
  await fetch(`${meiliUrl}/indexes/community/documents`, {
    method: 'DELETE',
    headers,
  }).catch(() => undefined);
  const [questions, discussions, polls, guides, stories, concepts] = await Promise.all([
    database.question.findMany({
      where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' },
      select: { id: true },
    }),
    database.discussion.findMany({
      where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' },
      select: { id: true },
    }),
    database.poll.findMany({
      where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' },
      select: { id: true },
    }),
    database.guide.findMany({
      where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' },
      select: { id: true },
    }),
    database.experience.findMany({
      where: { status: 'APPROVED', visibility: 'PUBLIC' },
      select: { id: true },
    }),
    database.concept.findMany({
      where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      select: { id: true },
    }),
  ]);
  for (const [type, rows] of [
    ['QUESTION', questions],
    ['DISCUSSION', discussions],
    ['POLL', polls],
    ['GUIDE', guides],
    ['EVENT_EXPERIENCE', stories],
    ['INSPIRATION', concepts],
  ] as const) {
    for (const row of rows) await indexSearchDocument({ entityType: type, entityId: row.id });
  }
}

const mediaWorker = new Worker<MediaJob>(
  'media',
  (job) => {
    if (job.name === 'process-image')
      console.info(
        JSON.stringify({
          level: 'info',
          event: 'media.process.started',
          jobId: job.id,
          assetId: job.data.assetId,
        }),
      );
    return Promise.resolve();
  },
  { connection, concurrency: Number(process.env.MEDIA_WORKER_CONCURRENCY ?? 2) },
);

const searchWorker = new Worker<SearchJob>(
  'search',
  async (job) => {
    await indexSearchDocument(job.data);
    console.info(
      JSON.stringify({
        level: 'info',
        event: 'search.index.requested',
        jobId: job.id,
        entityType: job.data.entityType,
        entityId: job.data.entityId,
      }),
    );
  },
  { connection, concurrency: Number(process.env.SEARCH_WORKER_CONCURRENCY ?? 5) },
);

for (const worker of [mediaWorker, searchWorker])
  worker.on('failed', (job, error) =>
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'job.failed',
        jobId: job?.id,
        message: error.message,
      }),
    ),
  );

createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ status: 'ok', workers: ['media', 'search'] }));
}).listen(Number(process.env.WORKER_HEALTH_PORT ?? 4001), '0.0.0.0');

void bootstrapSearchIndex().catch((error: unknown) =>
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'search.bootstrap.failed',
      message: error instanceof Error ? error.message : String(error),
    }),
  ),
);

async function shutdown() {
  await Promise.all([mediaWorker.close(), searchWorker.close()]);
  await connection.quit();
  await database.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
