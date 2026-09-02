import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ContentosController } from '../src/contentos/contentos.controller';
import { ContentosService } from '../src/contentos/contentos.service';
import { ContentosServiceGuard } from '../src/contentos/service-token.guard';
import {
  deriveSummary,
  isSha256Hex,
  renderPackageMarkdown,
  requestHash,
  slugCandidates,
  tokensEqual,
  validateManifest,
  validatePackage,
  type PublicationPackageBody,
} from '../src/contentos/contentos.util';
import { S3StorageService } from '../src/media/storage.service';
import { DatabaseService } from '../src/common/database.module';

const SERVICE_TOKEN = 'contentos-test-service-token-0123456789abcdef';

function samplePackage(): PublicationPackageBody {
  return {
    schema_version: 'publication-package/1',
    work_item_id: 'a1111111-2222-4333-8444-555555555555',
    locale: 'tr-TR',
    market: 'TR',
    title_proposal: 'Evde Doğum Günü Partisi Rehberi',
    body_schema_version: 'writer-draft-body/1',
    body: {
      sections: [
        {
          key: 'giris',
          heading: 'Neden evde parti?',
          blocks: [
            { kind: 'paragraph', text: 'Evde parti bütçe dostudur.' },
            { kind: 'media_need', text: 'kapak görseli notu', media_need_ref: 0 },
            { kind: 'internal_link_need', text: 'ilgili rehber notu', link_need_ref: 0 },
          ],
        },
        {
          key: 'plan',
          heading: 'Üç saatlik plan',
          blocks: [
            { kind: 'how_to_step', text: 'Temayı seçin.' },
            { kind: 'how_to_step', text: 'Malzemeleri hazırlayın.' },
            { kind: 'list', text: 'balon\npasta\nkonfeti' },
            { kind: 'callout', text: 'Güvenlik: mumları gözetimsiz bırakmayın.' },
          ],
        },
      ],
    },
  };
}

describe('contentos.util', () => {
  it('validates sha digests and compares tokens in constant time', () => {
    expect(isSha256Hex('a'.repeat(64))).toBe(true);
    expect(isSha256Hex('A'.repeat(64))).toBe(false);
    expect(isSha256Hex('xyz')).toBe(false);
    expect(tokensEqual('abc', 'abc')).toBe(true);
    expect(tokensEqual('abc', 'abd')).toBe(false);
    expect(tokensEqual('short', 'a-longer-token')).toBe(false);
  });

  it('produces a key-order-independent request hash', () => {
    const a = requestHash({ x: 1, y: { b: 2, a: [3, { k: 'v' }] } });
    const b = requestHash({ y: { a: [3, { k: 'v' }], b: 2 }, x: 1 });
    expect(a).toBe(b);
    expect(requestHash({ x: 2 })).not.toBe(a);
  });

  it('accepts the contract package shape and rejects broken ones', () => {
    expect(validatePackage(samplePackage())).toBeNull();
    expect(validatePackage({ ...samplePackage(), schema_version: 'v2' })?.message).toContain(
      'schema_version',
    );
    expect(validatePackage({ ...samplePackage(), title_proposal: '  ' })?.message).toContain(
      'title_proposal',
    );
    expect(validatePackage({ ...samplePackage(), body: { sections: [] } })?.message).toContain(
      'sections',
    );
    expect(validateManifest({ needs: { '0': { content_sha256: 'nope' } } })?.message).toContain(
      'sha256',
    );
    expect(validateManifest({ needs: {} })).toBeNull();
  });

  it('renders deterministic Markdown: formatting only, placeholders skipped', () => {
    const media = new Map([
      ['0', { url: 'https://cdn.test/contentos/x.png', altText: 'Balonlu masa' }],
    ]);
    const markdown = renderPackageMarkdown(samplePackage(), media);
    expect(markdown).toContain('## Neden evde parti?');
    expect(markdown).toContain('Evde parti bütçe dostudur.');
    expect(markdown).toContain('![Balonlu masa](https://cdn.test/contentos/x.png)');
    // Placeholder notes are need markers, never published prose.
    expect(markdown).not.toContain('kapak görseli notu');
    expect(markdown).not.toContain('ilgili rehber notu');
    expect(markdown).toContain('1. Temayı seçin.');
    expect(markdown).toContain('2. Malzemeleri hazırlayın.');
    expect(markdown).toContain('- balon\n- pasta\n- konfeti');
    expect(markdown).toContain('> Güvenlik: mumları gözetimsiz bırakmayın.');
    // An unbound media need renders nothing rather than a broken image.
    const withoutMedia = renderPackageMarkdown(samplePackage(), new Map());
    expect(withoutMedia).not.toContain('![');
  });

  it('derives the summary from the first paragraph and slugs with fallbacks', () => {
    expect(deriveSummary(samplePackage())).toBe('Evde parti bütçe dostudur.');
    const candidates = slugCandidates('1 Yaş Doğum Günü Rehberi');
    expect(candidates[0]).toBe('1-yas-dogum-gunu-rehberi');
    expect(candidates[1]).toBe('1-yas-dogum-gunu-rehberi-2');
    expect(slugCandidates('***')).toEqual([]);
  });
});

describe('ContentOS publishing HTTP boundary', () => {
  let app: NestExpressApplication;
  let base: string;
  const storeMedia = vi.fn();
  const publish = vi.fn();

  beforeAll(async () => {
    process.env.CONTENTOS_SERVICE_TOKEN = SERVICE_TOKEN;
    const module = await Test.createTestingModule({
      controllers: [ContentosController],
      providers: [
        ContentosServiceGuard,
        { provide: ContentosService, useValue: { storeMedia, publish } },
        { provide: S3StorageService, useValue: {} },
        { provide: DatabaseService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useBodyParser('raw', {
      type: ['image/png', 'image/jpeg', 'image/webp'],
      limit: '12mb',
    });
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
    delete process.env.CONTENTOS_SERVICE_TOKEN;
  });

  afterEach(() => {
    storeMedia.mockReset();
    publish.mockReset();
  });

  const auth = { authorization: `Bearer ${SERVICE_TOKEN}` };

  it('rejects a missing or wrong service token with the contract error shape', async () => {
    const anonymous = await fetch(`${base}/internal/contentos/v1/publications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k' },
      body: '{}',
    });
    expect(anonymous.status).toBe(401);
    expect(((await anonymous.json()) as { error: { code: string } }).error.code).toBe(
      'authentication_failed',
    );

    const wrong = await fetch(`${base}/internal/contentos/v1/publications`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer not-the-token',
        'content-type': 'application/json',
        'idempotency-key': 'k',
      },
      body: '{}',
    });
    expect(wrong.status).toBe(401);
    expect(publish).not.toHaveBeenCalled();
  });

  it('is unavailable (503) while the service token is not configured', async () => {
    const saved = process.env.CONTENTOS_SERVICE_TOKEN;
    delete process.env.CONTENTOS_SERVICE_TOKEN;
    try {
      const response = await fetch(`${base}/internal/contentos/v1/publications`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json', 'idempotency-key': 'k' },
        body: '{}',
      });
      expect(response.status).toBe(503);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
        'temporarily_unavailable',
      );
    } finally {
      process.env.CONTENTOS_SERVICE_TOKEN = saved;
    }
  });

  it('streams raw media bytes to the service and reports replay as 200', async () => {
    const bytes = Buffer.from('fake-png-bytes');
    const sha = createHash('sha256').update(bytes).digest('hex');
    storeMedia.mockResolvedValueOnce({
      schema_version: 'media-upload-result/1',
      media_ref: 'ref-1',
      content_sha256: sha,
      status: 'stored',
      replayed: false,
    });
    const first = await fetch(`${base}/internal/contentos/v1/media/${sha}`, {
      method: 'PUT',
      headers: {
        ...auth,
        'content-type': 'image/png',
        'x-content-sha256': sha,
        'idempotency-key': `media:${sha}`,
      },
      body: bytes,
    });
    expect(first.status).toBe(201);
    expect(((await first.json()) as { media_ref: string }).media_ref).toBe('ref-1');
    expect(storeMedia).toHaveBeenCalledWith(sha, expect.any(Buffer), 'image/png', sha);
    expect(Buffer.compare(storeMedia.mock.calls[0]![1] as Buffer, bytes)).toBe(0);

    storeMedia.mockResolvedValueOnce({
      schema_version: 'media-upload-result/1',
      media_ref: 'ref-1',
      content_sha256: sha,
      status: 'stored',
      replayed: true,
    });
    const again = await fetch(`${base}/internal/contentos/v1/media/${sha}`, {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'image/png', 'x-content-sha256': sha },
      body: bytes,
    });
    expect(again.status).toBe(200);
  });

  it('requires the Idempotency-Key header and maps replay to 200', async () => {
    const missing = await fetch(`${base}/internal/contentos/v1/publications`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe(
      'malformed_request',
    );

    const result = {
      schema_version: 'publication-result/1',
      publication_ref: 'guide:abc',
      content_id: 'abc',
      version: 1,
      status: 'published',
      canonical_url: 'https://konsepthane.com/rehber/x',
      published_at: '2026-09-02T20:00:00.000Z',
    };
    publish.mockResolvedValueOnce({ result, replayed: false });
    const created = await fetch(`${base}/internal/contentos/v1/publications`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json', 'idempotency-key': 'key-1' },
      body: JSON.stringify({ package: {}, media_manifest: {} }),
    });
    expect(created.status).toBe(201);
    expect(((await created.json()) as { publication_ref: string }).publication_ref).toBe(
      'guide:abc',
    );

    publish.mockResolvedValueOnce({ result, replayed: true });
    const replayed = await fetch(`${base}/internal/contentos/v1/publications`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json', 'idempotency-key': 'key-1' },
      body: JSON.stringify({ package: {}, media_manifest: {} }),
    });
    expect(replayed.status).toBe(200);
  });
});
