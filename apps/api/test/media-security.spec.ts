import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UnauthorizedException,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../src/common/auth.guard';
import type { AuthenticatedRequest } from '../src/common/auth.types';
import { PermissionGuard } from '../src/common/permissions';
import { MediaController, MAX_IMAGE_BYTES } from '../src/media/media.controller';
import { S3StorageService } from '../src/media/storage.service';

describe('patched multipart upload HTTP boundary', () => {
  let app: INestApplication;
  let base: string;
  const storeImage = vi.fn().mockResolvedValue({ id: 'asset', url: '/media/test.png' });
  const png = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const form = (bytes = png, type = 'image/png') => {
    const body = new FormData();
    body.append('file', new Blob([bytes], { type }), 'test.png');
    return body;
  };
  const upload = (body: FormData, role = 'editor') =>
    fetch(`${base}/media/upload`, {
      method: 'POST',
      headers: role ? { authorization: `Bearer ${role}` } : {},
      body,
      signal: AbortSignal.timeout(5000),
    });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: S3StorageService, useValue: { storeImage } }],
    })
      // Only identity lookup is stubbed. Real Nest permission checks, routing,
      // FileInterceptor and the installed Multer parser handle every HTTP request.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
          const token = request.header('authorization');
          if (!token) throw new UnauthorizedException();
          request.user = {
            sub: '11111111-1111-4111-8111-111111111111',
            email: 'test@example.test',
            permissions: token === 'Bearer editor' ? ['media.manage'] : [],
          };
          return true;
        },
      })
      .overrideGuard(PermissionGuard)
      .useValue(new PermissionGuard(new Reflector()))
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  beforeEach(() => storeImage.mockClear());
  afterAll(async () => {
    await app?.close();
  });

  it('accepts a normal single image and retains the actor', async () => {
    const response = await upload(form());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'asset', url: '/media/test.png' });
    expect(storeImage).toHaveBeenCalledWith(
      expect.objectContaining({
        mimetype: 'image/png',
        size: png.length,
        buffer: Buffer.from(png),
      }),
      '11111111-1111-4111-8111-111111111111',
    );
  });
  it('requires authentication and media.manage permission', async () => {
    expect((await upload(form(), '')).status).toBe(401);
    expect((await upload(form(), 'member')).status).toBe(403);
    expect(storeImage).not.toHaveBeenCalled();
  });
  it('rejects SVG before storage', async () => {
    expect((await upload(form(png, 'image/svg+xml'))).status).toBe(400);
    expect(storeImage).not.toHaveBeenCalled();
  });
  it('rejects empty images', async () => {
    expect((await upload(form(new Uint8Array()))).status).toBe(400);
    expect(storeImage).not.toHaveBeenCalled();
  });
  it('rejects an image over the 15 MB limit', async () => {
    expect((await upload(form(new Uint8Array(MAX_IMAGE_BYTES + 1)))).status).toBe(413);
    expect(storeImage).not.toHaveBeenCalled();
  });
  it('rejects extra files', async () => {
    const body = form();
    body.append('file', new Blob([png], { type: 'image/png' }), 'second.png');
    expect((await upload(body)).status).toBe(400);
    expect(storeImage).not.toHaveBeenCalled();
  });
  it('rejects nested fields and remains responsive', async () => {
    const body = new FormData();
    body.append(`a${'[b]'.repeat(64)}`, 'value');
    expect((await upload(body)).status).toBe(400);
    expect(storeImage).not.toHaveBeenCalled();
    expect((await upload(form())).status).toBe(201);
  });
  it('rejects incomplete multipart data without crashing', async () => {
    const response = await fetch(`${base}/media/upload`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer editor',
        'content-type': 'multipart/form-data; boundary=broken',
      },
      body: '--broken\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\ntruncated',
      signal: AbortSignal.timeout(5000),
    });
    expect(response.status).toBe(400);
    expect(storeImage).not.toHaveBeenCalled();
    expect((await upload(form())).status).toBe(201);
  });
});
