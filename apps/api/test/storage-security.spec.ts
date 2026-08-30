import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import type { DatabaseService } from '../src/common/database.module';
import { S3StorageService } from '../src/media/storage.service';

describe('updated AWS S3 SDK compatibility', () => {
  beforeEach(() => {
    vi.stubEnv('S3_ACCESS_KEY', 'local-test-key');
    vi.stubEnv('S3_SECRET_KEY', 'local-test-secret');
    vi.stubEnv('S3_REGION', 'us-east-1');
    vi.stubEnv('S3_BUCKET', 'test-bucket');
    vi.stubEnv('S3_ENDPOINT', 'http://127.0.0.1:1');
    vi.stubEnv('MEDIA_PUBLIC_URL', 'https://media.example.test/test-bucket');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  it('signs a direct image upload locally without contacting S3', async () => {
    const service = new S3StorageService({} as DatabaseService);
    const result = await service.createUpload({
      filename: 'görsel.png',
      contentType: 'image/png',
      byteSize: 20,
    });
    const url = new URL(result.uploadUrl);
    expect(url.hostname).toBe('127.0.0.1');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
    expect(result.key).toMatch(/^originals\/\d{4}\/[a-f0-9-]+\.png$/);
  });
  it('retains upload metadata and records the asset after a successful S3 command', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({}));
    const create = vi
      .fn()
      .mockResolvedValue({ id: 'test', storageKey: 'key', mimeType: 'image/png' });
    const service = new S3StorageService({ mediaAsset: { create } } as unknown as DatabaseService);
    const file = {
      originalname: 'görsel.png',
      mimetype: 'image/png',
      size: 3,
      buffer: Buffer.from('png'),
    };
    const result = await service.storeImage(file, 'actor');
    const sentCommand = send.mock.calls[0]?.[0] as { input: unknown };
    expect(sentCommand.input).toMatchObject({
      Bucket: 'test-bucket',
      Body: file.buffer,
      ContentType: 'image/png',
      ContentLength: 3,
    });
    const savedAsset = create.mock.calls[0]?.[0] as { data: unknown };
    expect(savedAsset.data).toMatchObject({ uploaderId: 'actor', status: 'READY', byteSize: 3n });
    expect(result.url).toMatch(/^https:\/\/media\.example\.test\/test-bucket\/originals\//);
  });
});
